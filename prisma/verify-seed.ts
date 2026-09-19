import { PrismaClient, Role } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const teacherCount = await prisma.user.count({ where: { role: Role.TEACHER } });
  const studentCount = await prisma.user.count({ where: { role: Role.STUDENT } });
  const totalCount = await prisma.user.count();
  const adminZero = await prisma.user.findUnique({ where: { studentId: "0" }, select: { studentId: true, role: true, name: true } });

  console.log(`::notice::VERIFY: teachers=${teacherCount} students=${studentCount} total=${totalCount} adminZeroExists=${!!adminZero} adminZeroRole=${adminZero?.role}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.log(`::error::VERIFY_FAILED: ${String(e.message || e).replace(/\n/g, " | ")}`);
  process.exit(1);
});
