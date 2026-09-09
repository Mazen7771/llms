-- CreateEnum
CREATE TYPE "SubjectAccess" AS ENUM ('BOTH', 'BIOLOGY', 'CHEMISTRY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subjectAccess" "SubjectAccess" NOT NULL DEFAULT 'BOTH';
