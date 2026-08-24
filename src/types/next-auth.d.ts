import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";
import { Role, AccountStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      studentId: string | null;
      accountStatus: AccountStatus;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    studentId: string | null;
    accountStatus: AccountStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    studentId: string | null;
    accountStatus: AccountStatus;
  }
}