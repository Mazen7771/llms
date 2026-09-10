-- DropIndex (unique indexes on email columns)
DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_emailVerifyToken_key";

-- DropColumns (email-related fields no longer used by the app)
ALTER TABLE "User" DROP COLUMN "email";
ALTER TABLE "User" DROP COLUMN "emailVerifiedAt";
ALTER TABLE "User" DROP COLUMN "emailVerifyToken";
ALTER TABLE "User" DROP COLUMN "emailVerifyExpires";
