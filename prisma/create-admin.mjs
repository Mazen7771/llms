// Creates an additional admin (TEACHER) account without touching existing users.
// Run inside the app container or locally with DATABASE_URL pointing at the DB:
//   npx tsx prisma/create-admin.mjs
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const ADMIN_NAME = process.env.NEW_ADMIN_NAME || 'Admin Two'
const ADMIN_STUDENT_ID = process.env.NEW_ADMIN_ID || '1' // numeric login ID
const ADMIN_PASSWORD = process.env.NEW_ADMIN_PASSWORD || 'Km9tRw2v!qLp'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const admin = await prisma.user.upsert({
    where: { studentId: ADMIN_STUDENT_ID },
    update: {
      passwordHash,
      role: 'TEACHER',
      name: ADMIN_NAME,
      accountStatus: 'ACTIVE',
    },
    create: {
      id: crypto.randomUUID(),
      passwordHash,
      role: 'TEACHER',
      name: ADMIN_NAME,
      studentId: ADMIN_STUDENT_ID,
      accountStatus: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  console.log('Second admin created/updated:')
  console.log(`  Name: ${admin.name}`)
  console.log(`  Login ID (studentId): ${admin.studentId}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error('Failed to create admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
