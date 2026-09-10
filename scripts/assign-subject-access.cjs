#!/usr/bin/env node
/*
 * ONE-OFF: categorize the 300 students into BOTH / BIOLOGY / CHEMISTRY access
 * groups and emit per-group roster CSVs (studentId, name, password).
 *
 * Usage:
 *   node scripts/assign-subject-access.cjs \
 *     --both <ids.json> --bio <ids.json> --chem <ids.json>
 *
 * JSON files are arrays of studentId strings, e.g.
 *     ["001","002","003"]
 *
 * It:
 *   1. Reads DATABASE_URL from .env (never prints the secret).
 *   2. Reads plaintext passwords from credentials/STUDENT_CREDENTIALS.csv
 *      (passwords are bcrypt-hashed in the DB, so they cannot be recovered
 *      from the database — the credentials file is the only source).
 *   3. Bulk-updates "User"."subjectAccess" per category.
 *   4. Writes student-rosters/students-{both,biology,chemistry}.csv.
 *
 * Rows whose studentId isn't found in the DB (or isn't in the credentials
 * file) are reported as warnings so nothing silently disappears.
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const out = { both: null, bio: null, chem: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--both') out.both = argv[++i];
    else if (argv[i] === '--bio') out.bio = argv[++i];
    else if (argv[i] === '--chem') out.chem = argv[++i];
  }
  return out;
}

function readIds(file) {
  if (!file) return [];
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(raw)) throw new Error(`${file} must be a JSON array of studentId strings`);
  return raw.map((s) => String(s).padStart(3, '0'));
}

// Parse studentId,password,name lines. The seed's password charset is
// letters/digits/!@#$%^&* — never a comma or quote — so a plain split is safe.
function readCredentials() {
  const file = path.join(ROOT, 'credentials', 'STUDENT_CREDENTIALS.csv');
  if (!fs.existsSync(file)) {
    console.error(`MISSING ${file} — cannot build rosters without plaintext passwords.`);
    process.exit(1);
  }
  const map = new Map();
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  // Skip the header line (matching newer Node where csv-parse isn't available).
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const [studentId, ...rest] = line.split(',');
    if (!studentId) continue;
    map.set(String(studentId).padStart(3, '0'), rest.join(','));
  }
  return map;
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.both && !args.bio && !args.chem) {
    console.error('Usage: node scripts/assign-subject-access.cjs --both <ids.json> --bio <ids.json> --chem <ids.json>');
    process.exit(1);
  }

  const groups = [
    { access: 'BOTH', ids: readIds(args.both) },
    { access: 'BIOLOGY', ids: readIds(args.bio) },
    { access: 'CHEMISTRY', ids: readIds(args.chem) },
  ];
  const total = groups.reduce((n, g) => n + g.ids.length, 0);
  console.log(`Categorizing ${total} students (BOTH ${groups[0].ids.length} / BIOLOGY ${groups[1].ids.length} / CHEMISTRY ${groups[2].ids.length})`);

  // Read DATABASE_URL from .env without ever printing it.
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const m = env.match(/^DATABASE_URL=(.*)$/m);
  if (!m) { console.error('no DATABASE_URL in .env'); process.exit(1); }
  const conn = m[1].replace(/^["']|["']$/g, '').trim();

  const client = new Client({ connectionString: conn });
  await client.connect();

  const passwords = readCredentials();

  // 1) Update subjectAccess per group.
  for (const g of groups) {
    if (g.ids.length === 0) continue;
    const res = await client.query(
      'UPDATE "User" SET "subjectAccess" = $2, "updatedAt" = now() WHERE "studentId" = ANY($1::text[]) RETURNING "studentId"',
      [g.ids, g.access]
    );
    console.log(`  ${g.access}: updated ${res.rowCount}/${g.ids.length}`);
  }

  // 2) Pull name from the DB for roster rows.
  const allIds = groups.flatMap((g) => g.ids);
  const rosterByAccess = new Map(); // access -> array of { studentId, name, password }
  for (const g of groups) {
    rosterByAccess.set(g.access, []);
    if (g.ids.length === 0) continue;
    const res = await client.query(
      'SELECT "studentId", name FROM "User" WHERE "studentId" = ANY($1::text[]) ORDER BY "studentId"',
      [g.ids]
    );
    const found = new Set();
    for (const row of res.rows) {
      const password = passwords.get(row.studentId);
      rosterByAccess.get(g.access).push({
        studentId: row.studentId,
        name: row.name ?? '',
        password: password ?? '',
      });
      found.add(row.studentId);
    }
    // Warnings for IDs with no DB row or no credential.
    for (const id of g.ids) {
      if (!found.has(id)) console.warn(`  ⚠ ${g.access}: "${id}" not found in DB (skipped from roster)`);
      else if (!passwords.get(id)) console.warn(`  ⚠ ${g.access}: "${id}" missing from STUDENT_CREDENTIALS.csv (empty password)`);
    }
  }

  // 3) Emit CSVs.
  const outDir = path.join(ROOT, 'student-rosters');
  fs.mkdirSync(outDir, { recursive: true });
  const header = ['studentId', 'name', 'password'];
  for (const g of groups) {
    const rows = rosterByAccess.get(g.access).map((r) =>
      [r.studentId, r.name, r.password].map(csvEscape).join(',')
    );
    const file = path.join(outDir, `students-${g.access.toLowerCase()}.csv`);
    fs.writeFileSync(file, header.join(',') + '\n' + rows.join('\n') + '\n');
    console.log(`  wrote ${file} (${rows.length} rows)`);
  }

  // 4) Sanity: every requested ID accounted for in exactly one group.
  const seen = new Set();
  let dupCount = 0;
  for (const g of groups) for (const id of g.ids) {
    if (seen.has(id)) { console.warn(`  ⚠ "${id}" appears in more than one group`); dupCount++; }
    seen.add(id);
  }
  if (dupCount === 0) console.log('  no duplicate studentIds across groups');

  await client.end();
  console.log('DONE');
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });