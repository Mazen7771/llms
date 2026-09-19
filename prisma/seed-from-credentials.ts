/**
 * Seed a database with a SPECIFIC, already-known set of credentials,
 * instead of prisma/seed.ts's randomly-generated ones.
 *
 * This exists because prisma/seed.ts (which originally produced
 * STUDENT_CREDENTIALS.csv and ADMIN_CREDENTIALS.txt) generates a brand
 * new random password for every account on every run. That's correct for
 * a first-ever setup, but wrong here: these exact credentials have
 * already been handed out to real students, so the new database needs to
 * accept the SAME id/password pairs, not a fresh set.
 *
 * Nothing sensitive is hardcoded below - every credential comes in
 * through environment variables at run time (see
 * .github/workflows/seed-database.yml), so nothing here needs to be
 * treated as secret by itself.
 *
 * Required env vars:
 *   DATABASE_URL          - the database to write into
 *   ADMIN_STUDENT_ID       - e.g. "0"
 *   ADMIN_PASSWORD         - plaintext, will be bcrypt-hashed before storing
 *   ADMIN_NAME             - optional, defaults to "Miss Sulafa" to match
 *                            the existing ensure-teacher.ts convention
 *   STUDENT_CREDENTIALS_CSV - full CSV content, header
 *                            "studentId,password,name" then one row per
 *                            student (exactly the format of
 *                            STUDENT_CREDENTIALS.csv)
 */
import { PrismaClient, Role, AccountStatus, SubjectAccess } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseStudentCsv(csv: string): Array<{ studentId: string; password: string; name: string }> {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const header = lines[0].toLowerCase();
  const dataLines = header.startsWith("studentid") ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const [studentId, password, ...nameParts] = line.split(",");
    if (!studentId || !password) {
      throw new Error(
        `Row ${index + 1} of STUDENT_CREDENTIALS_CSV is malformed: "${line}"`
      );
    }
    return {
      studentId: studentId.trim(),
      password: password.trim(),
      name: (nameParts.join(",").trim() || `Student ${studentId.trim()}`),
    };
  });
}

async function main() {
  const adminStudentId = process.env.ADMIN_STUDENT_ID?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || "Miss Sulafa";
  const studentCsv = process.env.STUDENT_CREDENTIALS_CSV;

  if (!adminStudentId || !adminPassword) {
    throw new Error("ADMIN_STUDENT_ID and ADMIN_PASSWORD are required.");
  }
  if (!studentCsv) {
    throw new Error("STUDENT_CREDENTIALS_CSV is required.");
  }

  console.log("Seeding admin account...");
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { studentId: adminStudentId },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.TEACHER,
      name: adminName,
      accountStatus: AccountStatus.ACTIVE,
      subjectAccess: SubjectAccess.BOTH,
    },
    create: {
      id: crypto.randomUUID(),
      passwordHash: adminPasswordHash,
      role: Role.TEACHER,
      name: adminName,
      studentId: adminStudentId,
      accountStatus: AccountStatus.ACTIVE,
      subjectAccess: SubjectAccess.BOTH,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`Admin ready (Teacher ID: ${adminStudentId})`);

  const students = parseStudentCsv(studentCsv);
  console.log(`Seeding ${students.length} student accounts...`);

  let done = 0;
  for (const student of students) {
    const passwordHash = await bcrypt.hash(student.password, 12);

    await prisma.user.upsert({
      where: { studentId: student.studentId },
      update: {
        passwordHash,
        role: Role.STUDENT,
        name: student.name,
        accountStatus: AccountStatus.ACTIVE,
      },
      create: {
        id: crypto.randomUUID(),
        passwordHash,
        role: Role.STUDENT,
        name: student.name,
        studentId: student.studentId,
        accountStatus: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    done += 1;
    if (done % 50 === 0 || done === students.length) {
      console.log(`  ${done}/${students.length} students done`);
    }
  }

  console.log("Seed complete.");
  console.log(`  1 admin account (Teacher ID: ${adminStudentId})`);
  console.log(`  ${students.length} student accounts`);
  console.log("  No passwords were printed to this log.");
}

main()
  .catch((e) => {
    const message = e && e.message ? e.message : String(e);
    console.error("Seed failed:", e);
    // Also emit as a workflow error annotation (retrievable via the
    // Checks API) since raw job logs aren't always easy to fetch.
    console.log(`::error::SEED_FAILED: ${message.replace(/\n/g, " | ")}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
