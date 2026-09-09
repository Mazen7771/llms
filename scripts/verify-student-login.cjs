// VERIFY ONLY: proves CSV password matches the stored DB hash for sample ids.
// Prints booleans + counts, never passwords. Safe to commit.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ROOT = '/home/mazin/website-creation/lms-deploy-clean';
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const m = env.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.error('no DATABASE_URL'); process.exit(1); }
const conn = m[1].replace(/^["']|["']$/g, '').trim();

const CSV = path.join(ROOT, 'credentials', 'STUDENT_CREDENTIALS.csv');
const SAMPLES = ['001', '002', '003', '100', '150', '200', '300'];

const pw = {};
for (const line of fs.readFileSync(CSV, 'utf8').split(/\r?\n/).filter(Boolean).slice(1)) {
  const [id, pass] = line.split(',');
  if (SAMPLES.includes(id.trim())) pw[id.trim()] = pass;
}

(async () => {
  const c = new Client({ connectionString: conn });
  await c.connect();
  let ok = 0, bad = 0;
  for (const id of SAMPLES) {
    const res = await c.query('SELECT "passwordHash" FROM "User" WHERE "studentId" = $1', [id]);
    if (!res.rows[0]) { console.log(`${id}: NO_USER`); bad++; continue; }
    const match = await bcrypt.compare(pw[id], res.rows[0].passwordHash);
    console.log(`${id}: ${match ? 'MATCH' : 'MISMATCH'}`);
    if (match) ok++; else bad++;
  }
  console.log(`RESULT: ${ok} matched, ${bad} failed (${SAMPLES.length} sampled)`);
  await c.end();
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });