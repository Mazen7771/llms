// One-off: align teacher account password with TEACHER_PASSWORD env var.
// Reads .env for DATABASE_URL + TEACHER_PASSWORD, upserts teacher id "0".
// Run:  node scripts/run-ensure-teacher.cjs
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const ROOT = '/home/mazin/website-creation/lms-deploy-clean';
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
function getEnv(key) {
  const m = env.match(new RegExp('^' + key + '="?([^"\\n]*)"?$', 'm'));
  return m ? m[1].trim() : undefined;
}

const DATABASE_URL = getEnv('DATABASE_URL');
const TEACHER_PASSWORD = getEnv('TEACHER_PASSWORD');
if (!DATABASE_URL || !TEACHER_PASSWORD) {
  console.error('Missing DATABASE_URL or TEACHER_PASSWORD in .env');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Check current teacher state first
  const before = await client.query(
    'SELECT "studentId", role, "accountStatus", name, "passwordHash" FROM "User" WHERE "studentId" = \'0\''
  );
  console.log('Teacher BEFORE:', before.rows[0]
    ? { studentId: before.rows[0].studentId, role: before.rows[0].role, accountStatus: before.rows[0].accountStatus, name: before.rows[0].name, hashLen: (before.rows[0].passwordHash || '').length }
    : 'NOT FOUND');

  const hash = await bcrypt.hash(TEACHER_PASSWORD, 12);
  const res = await client.query(
    `INSERT INTO "User"
        (id, email, "passwordHash", role, name, "emailVerifiedAt", "studentId", "accountStatus", "subjectAccess", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), 'sulafa@school.edu', $1, 'TEACHER', 'Miss Sulafa', now(), '0', 'ACTIVE', 'BOTH', now(), now())
     ON CONFLICT ("studentId")
     DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash",
                   email = EXCLUDED.email,
                   role = 'TEACHER',
                   name = EXCLUDED.name,
                   "accountStatus" = 'ACTIVE',
                   "subjectAccess" = 'BOTH',
                   "updatedAt" = now()
     RETURNING ("xmax" = 0) AS was_inserted`,
    [hash]
  );
  console.log('Teacher AFTER ', res.rows[0].was_inserted ? 'CREATED' : 'UPDATED');

  // Verify the compare works
  const after = await client.query('SELECT "passwordHash" FROM "User" WHERE "studentId" = \'0\'');
  const ok = after.rows[0] && await bcrypt.compare(TEACHER_PASSWORD, after.rows[0].passwordHash);
  console.log('Login verify:', ok ? 'MATCH ✅' : 'MISMATCH ❌');
  console.log('Teacher ID: 0   Password: (set in .env TEACHER_PASSWORD)');
  await client.end();
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });