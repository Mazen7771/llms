import { prisma } from "@/lib/prisma";

/**
 * Returns the subject slug the student is restricted to, or null for BOTH.
 * Cached per-request to avoid repeated DB hits on routes that call multiple
 * helpers (e.g. subjectFilter + isSubjectAllowed in the same handler).
 */
export async function getStudentSubjectSlug(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subjectAccess: true },
  });
  if (!user || user.subjectAccess === "BOTH") return null;
  return user.subjectAccess === "BIOLOGY" ? "biology" : "chemistry";
}

/**
 * Check whether the student is allowed to access a given subject slug.
 */
export async function isSubjectAllowed(
  userId: string,
  subjectSlug: string,
): Promise<boolean> {
  const allowedSlug = await getStudentSubjectSlug(userId);
  return allowedSlug === null || allowedSlug === subjectSlug;
}

/**
 * Returns a Prisma `where` clause for filtering Subject-level queries.
 * Usage: `prisma.subject.findMany({ where: await subjectFilter(userId) })`
 */
export async function subjectFilter(userId: string) {
  const slug = await getStudentSubjectSlug(userId);
  return slug ? { slug } : {};
}

/**
 * Returns a nested relation filter for queries on non-Subject models
 * (Quiz, Progress, Recording, Resource) where Subject is reached via
 * Topic → Unit → Subject.
 *
 * Usage:
 *   prisma.quiz.findMany({
 *     where: { isActive: true, ...(await nestedSubjectFilter(userId)) }
 *   })
 */
export async function nestedSubjectFilter(userId: string) {
  const slug = await getStudentSubjectSlug(userId);
  return slug ? { Topic: { Unit: { Subject: { slug } } } } : {};
}
