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

  console.log('::notice::Listing all projects...');
  const allRes = await neonApi('GET', '/projects?limit=100');
  const allProjects = allRes.json?.projects || [];
  console.log(
    `::notice::ALL_PROJECTS: ${allProjects.map((p) => `${p.name}(${p.id})`).join(', ') || 'none'}`
  );

  console.log('::notice::Listing recoverable (deleted) projects...');
  const recRes = await neonApi('GET', '/projects?recoverable=true&limit=100');
  const recoverable = recRes.json?.projects || [];
  console.log(
    `::notice::RECOVERABLE: ${recoverable.map((p) => `${p.name}(${p.id})`).join(', ') || 'none'}`
  );

  if (recoverable.length === 0) {
    console.log('::notice::Nothing to recover - all projects already active, or window expired.');
  }

  const results = [];

  for (const proj of recoverable) {
    console.log(`::notice::Recovering ${proj.name} (${proj.id})...`);
    const recoverRes = await neonApi('POST', `/projects/${proj.id}/recover`);
    if (recoverRes.status >= 200 && recoverRes.status < 300) {
      console.log(`::notice::Recovered ${proj.name}`);
    } else {
      console.log(`::error::RECOVER_FAILED for ${proj.name}: HTTP ${recoverRes.status} ${JSON.stringify(recoverRes.json)}`);
      continue;
    }

    // Get a connection string for this project's default branch/db/role.
    const connRes = await neonApi(
      'GET',
      `/projects/${proj.id}/connection_uri?database_name=neondb&role_name=neondb_owner`
    );
    const connectionUri = connRes.json?.uri;
    if (!connectionUri) {
      console.log(`::error::NO_CONNECTION_URI for ${proj.name}: ${JSON.stringify(connRes.json)}`);
      continue;
    }

    const counts = {};
    for (const table of ['Subject', 'Unit', 'Topic', 'Resource']) {
      counts[table] = await countRows(connectionUri, table);
    }

    results.push({ name: proj.name, id: proj.id, counts });
    console.log(
      `::notice::CONTENT ${proj.name}: Subject=${counts.Subject} Unit=${counts.Unit} Topic=${counts.Topic} Resource=${counts.Resource}`
    );
  }

  console.log('::notice::SUMMARY: ' + JSON.stringify(results));
}

main().catch((e) => {
  console.log(`::error::SCRIPT_FAILED: ${String(e.message || e).replace(/\n/g, ' | ')}`);
  process.exit(1);
});
