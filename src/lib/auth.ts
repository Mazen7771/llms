import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      studentId: true,
      accountStatus: true,
      emailVerifiedAt: true,
    },
  });

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireTeacher() {
  const user = await requireAuth();
  if (user.role !== "TEACHER") {
    throw new Error("Forbidden: Teacher access required");
  }
  return user;
}

export async function requireStudent() {
  const user = await requireAuth();
  if (user.role !== "STUDENT") {
    throw new Error("Forbidden: Student access required");
  }
  return user;
}

export function isTeacher(user: { role: Role } | null): boolean {
  return user?.role === "TEACHER";
}

export function isStudent(user: { role: Role } | null): boolean {
  return user?.role === "STUDENT";
}

export async function getTeacherUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") return null;
  return user;
}

export async function getStudentUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;
  return user;
}