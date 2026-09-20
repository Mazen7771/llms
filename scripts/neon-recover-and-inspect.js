const https = require('https');
const { Pool } = require('pg');

const NEON_API_KEY = process.env.NEON_API_KEY;

function neonApi(method, path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'console.neon.tech',
        path: `/api/v2${path}`,
        method,
        headers: {
          Authorization: `Bearer ${NEON_API_KEY}`,
          Accept: 'application/json',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, json: null, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function countRows(connectionString, table) {
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000 });
  try {
    const res = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
    return parseInt(res.rows[0].count, 10);
  } catch (e) {
    return `error: ${e.message}`;
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  if (!NEON_API_KEY) {
    console.log('::error::NEON_API_KEY is not set.');
    process.exit(1);
  }

  const projectId = process.env.NEON_PROJECT_ID;
  const projectName = process.env.NEON_PROJECT_NAME || projectId;
  if (!projectId) {
    console.log('::error::NEON_PROJECT_ID is not set.');
    process.exit(1);
  }

  console.log(`::notice::Recovering ${projectName} (${projectId})...`);
  const recoverRes = await neonApi('POST', `/projects/${projectId}/recover`);
  const alreadyActive = recoverRes.json?.message === 'project is not deleted';
  if ((recoverRes.status >= 200 && recoverRes.status < 300) || alreadyActive) {
    console.log(alreadyActive ? `::notice::${projectName} was already active (not deleted)` : `::notice::Recovered ${projectName}`);
  } else {
    console.log(`::error::RECOVER_FAILED for ${projectName}: HTTP ${recoverRes.status} ${JSON.stringify(recoverRes.json)}`);
    return;
  }

  const connRes = await neonApi(
    'GET',
    `/projects/${projectId}/connection_uri?database_name=neondb&role_name=neondb_owner`
  );
  const connectionUri = connRes.json?.uri;
  if (!connectionUri) {
    console.log(`::error::NO_CONNECTION_URI for ${projectName}: ${JSON.stringify(connRes.json)}`);
    return;
  }

  const counts = {};
  for (const table of ['Subject', 'Unit', 'Topic', 'Resource']) {
    counts[table] = await countRows(connectionUri, table);
  }

  console.log(
    `::notice::CONTENT ${projectName}: Subject=${counts.Subject} Unit=${counts.Unit} Topic=${counts.Topic} Resource=${counts.Resource}`
  );
}

main().catch((e) => {
  console.log(`::error::SCRIPT_FAILED: ${String(e.message || e).replace(/\n/g, ' | ')}`);
  process.exit(1);
});
