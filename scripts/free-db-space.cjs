// Free Neon DB space by deleting UploadedFile rows that are not referenced
// by any Resource. Safe: keeps every file attached to a live resource.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [allFiles, resources] = await Promise.all([
    prisma.uploadedFile.findMany({ select: { key: true, size: true, createdAt: true } }),
    prisma.resource.findMany({ select: { fileKey: true } }),
  ]);

  console.log(`Found ${allFiles.length} uploaded files, ${resources.length} resources`);
  const referenced = new Set(resources.map(r => r.fileKey));

  const orphans = allFiles.filter(f => !referenced.has(f.key));
  const orphanBytes = orphans.reduce((s, f) => s + f.size, 0);
  const keptBytes = allFiles.reduce((s, f) => s + f.size, 0) - orphanBytes;
  console.log(`Orphans: ${orphans.length}  (${(orphanBytes / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`Referenced: ${allFiles.length - orphans.length}  (${(keptBytes / 1024 / 1024).toFixed(1)} MB stays)`);

  if (orphans.length === 0) { console.log('Nothing to delete.'); return; }

  console.log('\nDeleting orphans...');
  for (const f of orphans) {
    await prisma.uploadedFile.delete({ where: { key: f.key } });
  }
  console.log(`Deleted ${orphans.length} orphan files (${(orphanBytes / 1024 / 1024).toFixed(1)} MB freed)`);
}

main().finally(() => prisma.$disconnect());