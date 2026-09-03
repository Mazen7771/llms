/**
 * Ensure a TEACHER account exists with a KNOWN password.
 *
 * Run against the production database:
 *   DATABASE_URL="postgresql://..." npx tsx prisma/ensure-teacher.ts
 *
 * The teacher logs in with:
 *   Teacher ID: 0
 *   Password:   <PASSWORD>
 *
 * If a teacher already exists, its password is reset to the value below
 * (or $TEACHER_PASSWORD if provided) so you can always get back in.
 */
import { PrismaClient, Role, AccountStatus } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.env.TEACHER_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const teacher = await prisma.user.upsert({
    where: { email: "sulafa@school.edu" },
    update: {
      passwordHash,
      role: Role.TEACHER,
      name: "Miss Sulafa",
      emailVerifiedAt: new Date(),
      studentId: "0",
      accountStatus: AccountStatus.ACTIVE,
    },
    create: {
      id: crypto.randomUUID(),
      email: "sulafa@school.edu",
      passwordHash,
      role: Role.TEACHER,
      name: "Miss Sulafa",
      emailVerifiedAt: new Date(),
      studentId: "0",
      accountStatus: AccountStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Teacher account ready:");
  console.log(`   Teacher ID: ${teacher.studentId}`);
  console.log(`   Password:   ${password}`);
  console.log("   (You can change it after login in Settings → Change Password)");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Failed to create teacher account:", e);
  process.exit(1);
});
