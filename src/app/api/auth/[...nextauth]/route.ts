import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role, AccountStatus } from "@/generated/prisma/client";

/**
 * Validate required env vars without crashing at module scope.
 * Returns an array of missing variable names, or [] if all present.
 */
function getMissingEnvVars(): string[] {
  const required = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "TEACHER_PASSWORD"];
  return required.filter((k) => !process.env[k] || process.env[k]!.trim() === "");
}

export const authOptions: NextAuthOptions = {
  // Removed PrismaAdapter - using JWT-only sessions with singleton prisma
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours (reduced from 30 days for security)
    updateAge: 30 * 60, // 30 minutes - sliding expiration
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

const nextAuthHandler = NextAuth(authOptions);

/**
 * Wrap the NextAuth handler to validate env vars per-request instead of
 * at module scope. If vars are missing, return a clear JSON error so the
 * cause is diagnosable (instead of an opaque empty-500 from a module-load crash).
 */
async function handler(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> }
): Promise<Response> {
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    return Response.json(
      {
        error: "Server misconfigured",
        missing,
        hint: "Set these variables in Vercel → Project Settings → Environment Variables (Production scope), then redeploy.",
      },
      { status: 500 }
    );
  }
  const params = await ctx.params;
  return nextAuthHandler(req, { params });
}

export { handler as GET, handler as POST };