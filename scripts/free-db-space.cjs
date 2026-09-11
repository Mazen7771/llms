// Free Neon DB space: delete UploadedFile rows not referenced by any Resource.
// Uses raw pg (same pattern as run-ensure-teacher.cjs) because this project
// generates Prisma to src/generated/prisma with a pg adapter — not usable
// from a standalone script without setup.
// Safe: prints what it will delete first; keeps every live resource file.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
function getEnv(key) {
  const m = env.match(new RegExp('^' + key + '="?([^"\\n]*)"?$', 'm'));
  return m ? m[1].trim() : undefined;
}

const DATABASE_URL = getEnv('DATABASE_URL');
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();

  // 1. Find orphaned files: rows in UploadedFile whose key is referenced by no Resource.
  const orphans = await client.query(`
    SELECT uf.key, uf.size
    FROM "UploadedFile" uf
    LEFT JOIN "Resource" r ON r."fileKey" = uf.key
    WHERE r."fileKey" IS NULL
  `);

  const total = (await client.query(`SELECT COUNT(*)::int AS c, COALESCE(SUM(size), 0)::bigint AS s FROM "UploadedFile"`)).rows[0];
  const orphanBytes = orphans.rows.reduce((sum, r) => sum + Number(r.size), 0);
  const keptBytes = Number(total.s) - orphanBytes;

  console.log(`UploadedFile total: ${total.c} rows, ${(Number(total.s) / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Orphans (no Resource references): ${orphans.rowCount} rows, ${(orphanBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Kept (referenced by live resources): ${total.c - orphans.rowCount} rows, ${(keptBytes / 1024 / 1024).toFixed(1)} MB`);

  // Safety: refuse to delete if referenced files would be a huge chunk of the DB
  if (orphans.rowCount === 0) {
    console.log('Nothing to delete.');
    return;
  }

  if (process.argv.includes('--dry-run')) {
    console.log('\n[dry-run] No rows deleted. Re-run without --dry-run to delete.');
    return;
  }

  console.log('\nDeleting orphans...');
  await client.query(`DELETE FROM "UploadedFile" WHERE key IN (SELECT uf.key FROM "UploadedFile" uf LEFT JOIN "Resource" r ON r."fileKey" = uf.key WHERE r."fileKey" IS NULL)`);
  console.log(`Deleted ${orphans.rowCount} orphan files (${(orphanBytes / 1024 / 1024).toFixed(1)} MB freed)`);
}

main()
  .catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; })
  .finally(() => client.end());