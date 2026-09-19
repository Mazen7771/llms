/**
 * Updates ONLY the admin/teacher account's password. Does not touch any
 * student record. Intentionally narrower than seed-from-credentials.ts so
 * a password change can't accidentally re-write anything else.
 *
 * Required env vars:
 *   DATABASE_URL      - the database to write into
 *   ADMIN_STUDENT_ID  - e.g. "0"
 *   ADMIN_PASSWORD    - the new plaintext password (will be bcrypt-hashed)
 */
import { PrismaClient, Role } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminStudentId = process.env.ADMIN_STUDENT_ID?.trim();
  const newPassword = process.env.ADMIN_PASSWORD;

  if (!adminStudentId || !newPassword) {
    throw new Error("ADMIN_STUDENT_ID and ADMIN_PASSWORD are required.");
  }

  const existing = await prisma.user.findUnique({
    where: { studentId: adminStudentId },
    select: { studentId: true, role: true },
  });

  if (!existing) {
    throw new Error(
      `No user found with studentId "${adminStudentId}". Nothing was changed.`
    );
  }
  if (existing.role !== Role.TEACHER) {
    throw new Error(
      `User "${adminStudentId}" has role ${existing.role}, not TEACHER. Refusing to change it as a safety check - fix ADMIN_STUDENT_ID if this is wrong.`
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { studentId: adminStudentId },
    data: { passwordHash },
  });

  console.log(`::notice::PASSWORD_UPDATED for studentId=${adminStudentId}`);
}

main()
  .catch((e) => {
    console.log(`::error::UPDATE_FAILED: ${String(e.message || e).replace(/\n/g, " | ")}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
