import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role, AccountStatus } from "@/generated/prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login/student",
    error: "/login/student",
  },
  providers: [
    CredentialsProvider({
      id: "student",
      name: "Student",
      credentials: {
        studentId: { label: "Student ID", type: "text", placeholder: "001" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.studentId || !credentials?.password) {
          throw new Error("Student ID and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { studentId: credentials.studentId },
        });

        if (!user || user.role !== "STUDENT" || !user.passwordHash) {
          throw new Error("Invalid student credentials");
        }

        if (user.accountStatus !== "ACTIVE") {
          throw new Error("Account is disabled");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          studentId: user.studentId,
          accountStatus: user.accountStatus,
        };
      },
    }),
    CredentialsProvider({
      id: "teacher",
      name: "Teacher",
      credentials: {
        studentId: { label: "Teacher ID", type: "text", placeholder: "0" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.studentId || !credentials?.password) {
          throw new Error("Teacher ID and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { studentId: credentials.studentId },
        });

        if (!user || user.role !== "TEACHER" || !user.passwordHash) {
          throw new Error("Invalid teacher credentials");
        }

        if (user.accountStatus !== "ACTIVE") {
          throw new Error("Account is disabled");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          studentId: user.studentId,
          accountStatus: user.accountStatus,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.studentId = user.studentId;
        token.accountStatus = user.accountStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.studentId = token.studentId;
        session.user.accountStatus = token.accountStatus;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };