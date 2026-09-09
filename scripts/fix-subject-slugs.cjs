// ONE-OFF fix: repair Subject slugs that contain spaces / bad values.
// Biology.slug was "Unit 3", Chemistry.slug was "Unit 1" — these made
// dashboard URLs like /dashboard/Unit%203, which never matched the DB slug
// after Next.js canonicalized the param, so clicking a subject bounced back
// to /dashboard. This sets clean slugs so URLs are /dashboard/biology.
// Credentials: reads DATABASE_URL from .env, never prints secrets.
const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('/home/mazin/website-creation/lms-deploy-clean/.env', 'utf8');
const m = env.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.error('no DATABASE_URL in .env'); process.exit(1); }
const conn = m[1].replace(/^["']|["']$/g, '').trim();

async function main() {
  const client = new Client({ connectionString: conn });
  await client.connect();

  const updates = [
    { name: 'Biology', slug: 'biology' },
    { name: 'Chemistry', slug: 'chemistry' },
  ];

  const before = await client.query('SELECT name, slug FROM "Subject" ORDER BY name');
  console.log('BEFORE:', JSON.stringify(before.rows));

  for (const u of updates) {
    const res = await client.query(
      'UPDATE "Subject" SET slug = $2, "updatedAt" = now() WHERE name = $1 RETURNING id, name, slug',
      [u.name, u.slug]
    );
    console.log('UPDATED:', JSON.stringify(res.rows[0] ?? null));
    if (res.rowCount === 0) console.log(`  (no row matched name="${u.name}")`);
  }

  // Guard: ensure no duplicate slugs exist now (column is UNIQUE).
  const dupes = await client.query(
    'SELECT name, slug, COUNT(*) FROM "Subject" GROUP BY name, slug HAVING COUNT(*) > 1'
  );
  if (dupes.rows.length) {
    console.error('DUPLICATE SLUGS DETECTED:', JSON.stringify(dupes.rows));
    process.exitCode = 1;
  }

  const after = await client.query('SELECT name, slug FROM "Subject" ORDER BY name');
  console.log('AFTER:', JSON.stringify(after.rows));

  await client.end();
  console.log('DONE');
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });