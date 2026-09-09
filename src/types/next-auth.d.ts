import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";
import { Role, AccountStatus, SubjectAccess } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      studentId: string | null;
      accountStatus: AccountStatus;
      subjectAccess: SubjectAccess;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    studentId: string | null;
    accountStatus: AccountStatus;
    subjectAccess: SubjectAccess;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    studentId: string | null;
    accountStatus: AccountStatus;
    subjectAccess: SubjectAccess;
  }
}
