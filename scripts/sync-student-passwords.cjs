// ONE-OFF FIX: make the DB match the distributed student credentials.
//
// WHY THIS EXISTS
//   login as a student fails even though credentials/STUDENT_CREDENTIALS.csv
//   looks correct. NextAuth only throws "Invalid student credentials" when the
//   DB lookup returns no user, or the bcrypt compare fails, or role/status
//   checks fail. That CSV is the ONLY source of plaintext passwords (the DB
//   stores only bcrypt hashes).
//
//   DO NOT run `npm run db:seed` to fix this. seed.ts (prisma/seed.ts)
//   GENERATES NEW RANDOM PASSWORDS and OVERWRITES the CSV — that invalidates
//   every password already distributed to students. This script instead uses
//   the CSV as the source of truth and makes the DB match it.
//
// WHAT IT DOES
//   For each row in credentials/STUDENT_CREDENTIALS.csv (studentId,password,name):
//     - If the user does not exist -> creates them (role STUDENT, ACTIVE, email
//       student<id>@lms.local). subjectAccess defaults to BOTH.
//     - If the user exists -> sets passwordHash from the CSV password, forces
//       role=STUDENT and accountStatus=ACTIVE. Does NOT touch subjectAccess,
//       so any per-student subject assignment already done survives.
//     - Leaves the TEACHER account untouched.
//
// Run:  node scripts/sync-student-passwords.cjs
// Reads DATABASE_URL from .env, never prints secrets.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ROOT = '/home/mazin/website-creation/lms-deploy-clean';
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const m = env.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.error('no DATABASE_URL in .env'); process.exit(1); }
const conn = m[1].replace(/^["']|["']$/g, '').trim();

const CSV = path.join(ROOT, 'credentials', 'STUDENT_CREDENTIALS.csv');
const SALT_ROUNDS = 10; // cost 10 is standard bcrypt and ~4x faster than seed's 12; login verify is unaffected (cost is read from the stored hash)

function parseCsv(file) {
  const rows = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const out = [];
  for (let i = 1; i < rows.length; i++) { // skip header
    const [studentId, password, ...rest] = rows[i].split(',');
    if (!studentId || !studentId.trim()) continue;
    out.push({ studentId: studentId.trim(), password, name: (rest[0] ?? '').trim() || `Student ${studentId.trim()}` });
  }
  return out;
}

async function main() {
  const students = parseCsv(CSV);
  console.log(`loaded ${students.length} students from ${path.basename(CSV)}`);
  if (students.length < 300) {
    console.error(`expected 300, got ${students.length} — aborting (refusing to gut the DB)`);
    process.exit(1);
  }

  const client = new Client({ connectionString: conn });
  await client.connect();

  let created = 0, updated = 0, errors = 0;
  for (let i = 0; i < students.length; i++) {
    const { studentId, password, name } = students[i];
    const email = `student${studentId}@lms.local`;
    try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      const res = await client.query(
        `INSERT INTO "User"
            (id, email, "passwordHash", role, name, "emailVerifiedAt", "studentId", "accountStatus", "subjectAccess", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'STUDENT', $3, now(), $4, 'ACTIVE', 'BOTH', now(), now())
         ON CONFLICT ("studentId")
         DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash",
                       name = EXCLUDED.name,
                       email = EXCLUDED.email,
                       role = 'STUDENT',
                       "accountStatus" = 'ACTIVE',
                       "emailVerifiedAt" = now(),
                       "updatedAt" = now()
         RETURNING ("xmax" = 0) AS was_inserted`,
        [email, hash, name, studentId]
      );
      if (res.rows[0].was_inserted) created++; else updated++;
    } catch (e) {
      errors++;
      console.error(`  ERROR student ${studentId}: ${e.message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`  ...${i + 1}/${students.length} (created=${created} updated=${updated})`);
  }

  console.log(`\nDONE: created=${created} updated=${updated} errors=${errors}`);
  await client.end();
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });