const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.OLD_DATABASE_URL, connectionTimeoutMillis: 8000 });

  const distinctUploaders = await pool.query(`
    SELECT DISTINCT "uploadedById" as uid FROM "Resource"
    UNION
    SELECT DISTINCT "uploadedById" as uid FROM "Recording"
    UNION
    SELECT DISTINCT "createdById" as uid FROM "Quiz"
  `);
  console.log(`::notice::DISTINCT_CONTENT_CREATOR_IDS: ${distinctUploaders.rows.map(r => r.uid).join(', ')} (count=${distinctUploaders.rows.length})`);

  const userRoles = await pool.query(`SELECT id, "studentId", role, name FROM "User" WHERE id = ANY($1)`, [distinctUploaders.rows.map(r => r.uid)]);
  console.log(`::notice::CREATOR_DETAILS: ${JSON.stringify(userRoles.rows)}`);

  const nonUrlResourceKeys = await pool.query(`
    SELECT COUNT(*) as c FROM "Resource" WHERE "fileKey" NOT LIKE 'http://%' AND "fileKey" NOT LIKE 'https://%'
  `);
  console.log(`::notice::NON_URL_RESOURCE_FILEKEYS: ${nonUrlResourceKeys.rows[0].c}`);

  const sampleUrls = await pool.query(`SELECT "fileKey" FROM "Resource" LIMIT 5`);
  console.log(`::notice::SAMPLE_FILEKEYS: ${JSON.stringify(sampleUrls.rows.map(r => r.fileKey))}`);

  const settingsCount = await pool.query(`SELECT COUNT(*) as c FROM "Setting"`);
  console.log(`::notice::SETTINGS_COUNT: ${settingsCount.rows[0].c}`);

  await pool.end();
}

main().catch((e) => {
  console.log(`::error::INSPECT_FAILED: ${String(e.message || e).replace(/\n/g, ' | ')}`);
  process.exit(1);
});
