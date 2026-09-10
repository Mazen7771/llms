// DIAGNOSTIC ONLY: check why student login fails. Never commit; see .gitignore.
const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('/home/mazin/website-creation/lms-deploy-clean/.env', 'utf8');
const m = env.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.error('no DATABASE_URL'); process.exit(1); }
const conn = m[1].replace(/^["']|["']$/g, '').trim();

(async () => {
  const c = new Client({ connectionString: conn });
  await c.connect();

  const total = await c.query('SELECT COUNT(*) FROM "User"');
  console.log('total users:', total.rows[0].count);

  const roles = await c.query('SELECT role, COUNT(*) FROM "User" GROUP BY role');
  console.log('roles:', JSON.stringify(roles.rows));

  const status = await c.query('SELECT "accountStatus", COUNT(*) FROM "User" GROUP BY "accountStatus"');
  console.log('accountStatus:', JSON.stringify(status.rows));

  const sample = await c.query(
    `SELECT "studentId", role, "accountStatus",
            ("passwordHash" IS NOT NULL AND "passwordHash" <> '') AS has_hash,
            LENGTH("passwordHash") AS hash_len, "subjectAccess"
     FROM "User" WHERE "studentId" IN ('001','002','003')`
  );
  console.log('sample students:', JSON.stringify(sample.rows, null, 2));

  const noHash = await c.query(
    `SELECT "studentId", role FROM "User"
     WHERE "passwordHash" IS NULL OR "passwordHash" = ''`
  );
  console.log('users without hash:', JSON.stringify(noHash.rows));

  await c.end();
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });