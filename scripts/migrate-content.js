const { Pool } = require('pg');

const OLD_TEACHER_ID = '55bb94f7-768d-41a0-be99-10ae7af44a1d'; // confirmed sole content creator in bronze-saddle

async function main() {
  const oldPool = new Pool({ connectionString: process.env.OLD_DATABASE_URL, connectionTimeoutMillis: 10000 });
  const newPool = new Pool({ connectionString: process.env.NEW_DATABASE_URL, connectionTimeoutMillis: 10000 });

  // Find the corresponding teacher in the NEW database (studentId "0").
  const newTeacherRes = await newPool.query(`SELECT id FROM "User" WHERE "studentId" = '0' AND role = 'TEACHER'`);
  if (newTeacherRes.rows.length === 0) {
    throw new Error('No TEACHER with studentId=0 found in the new database - aborting.');
  }
  const NEW_TEACHER_ID = newTeacherRes.rows[0].id;
  console.log(`::notice::Remapping ${OLD_TEACHER_ID} -> ${NEW_TEACHER_ID}`);

  const stats = {};

  async function copyTable(table, columns, remap = {}) {
    const { rows } = await oldPool.query(`SELECT ${columns.map((c) => `"${c}"`).join(', ')} FROM "${table}"`);
    let inserted = 0;
    for (const row of rows) {
      const values = columns.map((c) => (remap[c] && row[c] === OLD_TEACHER_ID ? NEW_TEACHER_ID : row[c]));
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const updateSet = columns
        .filter((c) => c !== 'id')
        .map((c) => `"${c}" = EXCLUDED."${c}"`)
        .join(', ');
      await newPool.query(
        `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})
         ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
        values
      );
      inserted += 1;
    }
    stats[table] = inserted;
    console.log(`::notice::Copied ${table}: ${inserted} rows`);
  }

  // Order matters for foreign keys: parents before children.
  await copyTable('Subject', ['id', 'name', 'slug', 'createdAt', 'updatedAt']);
  await copyTable('Unit', ['id', 'subjectId', 'name', 'orderIndex', 'createdAt', 'updatedAt']);
  await copyTable('Topic', ['id', 'unitId', 'name', 'orderIndex', 'createdAt', 'updatedAt']);

  await copyTable(
    'Resource',
    ['id', 'topicId', 'type', 'title', 'description', 'fileKey', 'fileType', 'fileSize', 'uploadedById', 'createdAt', 'updatedAt'],
    { uploadedById: true }
  );
  await copyTable(
    'Recording',
    ['id', 'topicId', 'title', 'description', 'streamVideoId', 'durationSeconds', 'recordedDate', 'uploadedById', 'createdAt', 'updatedAt'],
    { uploadedById: true }
  );
  await copyTable(
    'Quiz',
    ['id', 'topicId', 'title', 'timeLimitSeconds', 'isActive', 'createdById', 'createdAt', 'updatedAt'],
    { createdById: true }
  );
  await copyTable('Question', ['id', 'quizId', 'prompt', 'type', 'marks', 'orderIndex', 'createdAt', 'updatedAt']);
  await copyTable('QuestionOption', ['id', 'questionId', 'text', 'isCorrect', 'createdAt']);

  // Legacy in-database file storage for the resources whose fileKey is an
  // opaque key rather than a full URL - only copy rows actually referenced.
  const { rows: neededKeys } = await oldPool.query(
    `SELECT "fileKey" FROM "Resource" WHERE "fileKey" NOT LIKE 'http://%' AND "fileKey" NOT LIKE 'https://%'`
  );
  let uploadedFileCount = 0;
  for (const { fileKey } of neededKeys) {
    const { rows } = await oldPool.query(`SELECT key, data, "contentType", size, "createdAt" FROM "UploadedFile" WHERE key = $1`, [fileKey]);
    if (rows.length === 0) continue;
    const f = rows[0];
    await newPool.query(
      `INSERT INTO "UploadedFile" (key, data, "contentType", size, "createdAt") VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, "contentType" = EXCLUDED."contentType", size = EXCLUDED.size`,
      [f.key, f.data, f.contentType, f.size, f.createdAt]
    );
    uploadedFileCount += 1;
  }
  stats.UploadedFile = uploadedFileCount;
  console.log(`::notice::Copied UploadedFile: ${uploadedFileCount} rows`);

  await copyTable('Setting', ['id', 'key', 'value', 'updatedAt', 'createdAt']);

  console.log(`::notice::MIGRATION_COMPLETE: ${JSON.stringify(stats)}`);

  await oldPool.end();
  await newPool.end();
}

main().catch((e) => {
  console.log(`::error::MIGRATION_FAILED: ${String(e.message || e).replace(/\n/g, ' | ')}`);
  process.exit(1);
});
