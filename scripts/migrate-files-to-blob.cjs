// Migrate DB-stored files to Vercel Blob, then delete orphans.
// Result: UploadedFile table ~empty, all content in Blob, Neon freed ~409MB.
// Uses raw pg (same pattern as run-ensure-teacher.cjs) + @vercel/blob.
//
// Safety:
//   --dry-run  → show what WOULD happen, change nothing
//   requires --yes to actually apply
//   per-file: uploads to Blob first, updates Resource(s), only THEN deletes
//             the DB row — if an upload fails, that file is skipped and
//             its DB row stays (resource keeps working via DB fallback)
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');

const ROOT = __dirname + '/..';
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
function getEnv(key) {
  const m = env.match(new RegExp('^' + key + '="?([^"\\n]*)"?$', 'm'));
  return m ? m[1].trim() : undefined;
}

const DATABASE_URL = getEnv('DATABASE_URL');
const BLOB_TOKEN = getEnv('BLOB_READ_WRITE_TOKEN');
if (!DATABASE_URL) { console.error('Missing DATABASE_URL in .env'); process.exit(1); }
if (!BLOB_TOKEN) { console.error('Missing BLOB_READ_WRITE_TOKEN in .env'); process.exit(1); }

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--yes');
if (!DRY_RUN && !CONFIRM) {
  console.error('This is a destructive migration. Run with --dry-run first, then re-run with --yes to apply.');
  process.exit(0);
}

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();

  // All DB-backed files (plain key, no URL scheme)
  const files = (await client.query(`
    SELECT uf."key", uf."contentType", uf.size
    FROM "UploadedFile" uf
  `)).rows;

  // Which resources reference each key
  const refs = (await client.query(`
    SELECT r."fileKey", COUNT(*)::int AS n FROM "Resource" r
    WHERE r."fileKey" NOT LIKE 'http%'
    GROUP BY r."fileKey"
  `)).rows;
  const refMap = new Map(refs.map(r => [r.fileKey, r.n]));

  let toMigrate = 0, toDelete = 0, migrateBytes = 0, orphanBytes = 0;
  for (const f of files) {
    const n = refMap.get(f.key) || 0;
    if (n > 0) { toMigrate++; migrateBytes += Number(f.size); }
    else { toDelete++; orphanBytes += Number(f.size); }
  }

  console.log(`DB files: ${files.length}, ${((migrateBytes + orphanBytes) / 1048576).toFixed(1)} MB`);
  console.log(`  → referenced (migrate to Blob):  ${toMigrate}, ${(migrateBytes / 1048576).toFixed(1)} MB`);
  console.log(`  → orphaned (delete):             ${toDelete}, ${(orphanBytes / 1048576).toFixed(1)} MB`);
  console.log(`  → Neon freed:                    ${((migrateBytes + orphanBytes) / 1048576).toFixed(1)} MB`);
  if (DRY_RUN) { console.log('\n[dry-run] No changes made. Re-run with --yes to apply.'); return; }

  process.env.BLOB_READ_WRITE_TOKEN = BLOB_TOKEN;

  let migrated = 0, deleted = 0, failed = 0;
  for (const f of files) {
    const n = refMap.get(f.key) || 0;
    try {
      if (n > 0) {
        const { data } = (await client.query(`SELECT "data" FROM "UploadedFile" WHERE "key" = $1`, [f.key])).rows[0];
        const blob = await put(`resources/db-migrated-${crypto.randomUUID()}-${Date.now() % 100000}.bin`, Buffer.from(data), {
          access: 'public',
          addRandomSuffix: true,
          contentType: f.contentType || 'application/octet-stream',
        });
        // Update all resources that used the DB key to the Blob URL
        await client.query(`UPDATE "Resource" SET "fileKey" = $1 WHERE "fileKey" = $2`, [blob.url, f.key]);
        await client.query(`DELETE FROM "UploadedFile" WHERE "key" = $1`, [f.key]);
        migrated++;
        console.log(`  ✓ migrated ${f.key.slice(0, 8)}… (${(Number(f.size) / 1048576).toFixed(1)} MB, refs=${n}) → ${blob.url.slice(0, 60)}…`);
      } else {
        await client.query(`DELETE FROM "UploadedFile" WHERE "key" = $1`, [f.key]);
        deleted++;
        console.log(`  ✓ deleted orphan ${f.key.slice(0, 8)}… (${(Number(f.size) / 1048576).toFixed(1)} MB)`);
      }
    } catch (e) {
      failed++;
      console.error(`  ✗ failed ${f.key.slice(0, 8)}… (${n > 0 ? 'migrate' : 'delete'}): ${e.message}`);
    }
  }
  console.log(`\nDone: ${migrated} migrated, ${deleted} deleted, ${failed} failed.`);
  console.log(failed === 0
    ? 'All files now served from Vercel Blob. Neon DB is essentially empty.'
    : 'Some files failed — their DB rows were left intact so resources still load.');
}

main()
  .catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; })
  .finally(() => client.end());