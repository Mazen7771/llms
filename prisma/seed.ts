import { PrismaClient, Role, AccountStatus } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Generate a random password (12 characters for better security)
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Write credentials to a secure file (only for initial setup)
function writeCredentialsFile(studentCredentials: Array<{ studentId: string; password: string; name: string }>, adminPassword: string) {
  const outputDir = path.join(process.cwd(), 'credentials')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Write student credentials
  const studentLines = studentCredentials.map(c => `${c.studentId},${c.password},${c.name}`).join('\n')
  fs.writeFileSync(
    path.join(outputDir, 'STUDENT_CREDENTIALS.csv'),
    'studentId,password,name\n' + studentLines + '\n'
  )

  // Write admin credentials (single line)
  fs.writeFileSync(
    path.join(outputDir, 'ADMIN_CREDENTIALS.txt'),
    `Admin ID: 0\nAdmin Password: ${adminPassword}\n\nIMPORTANT: Change this password immediately on first login!\n`
  )

  // Create a .gitignore to prevent committing credentials
  fs.writeFileSync(
    path.join(outputDir, '.gitignore'),
    '*\n!.gitignore\n'
  )

  console.log(`\n📁 Credentials written to ${outputDir}/`)
  console.log(`   - STUDENT_CREDENTIALS.csv (300 students)`)
  console.log(`   - ADMIN_CREDENTIALS.txt (Miss Sulafa)`)
  console.log(`   - .gitignore created to prevent accidental commits`)
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Create Miss Sulafa (Teacher) with secure generated password
  console.log('👑 Creating Miss Sulafa account...')
  const adminPassword = generatePassword()
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12)

  const sulafa = await prisma.user.upsert({
    where: { email: 'sulafa@school.edu' },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.TEACHER,
      name: 'Miss Sulafa',
      emailVerifiedAt: new Date(),
      studentId: '0',
      accountStatus: AccountStatus.ACTIVE,
    },
    create: {
      id: crypto.randomUUID(),
      email: 'sulafa@school.edu',
      passwordHash: adminPasswordHash,
      role: Role.TEACHER,
      name: 'Miss Sulafa',
      emailVerifiedAt: new Date(),
      studentId: '0',
      accountStatus: AccountStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Miss Sulafa created: ${sulafa.email} (ID: 0)`)

  // Create 300 Student Accounts with sequential studentId (001-300)
  console.log('🎓 Creating 300 student accounts...')

  const studentCredentials: Array<{ studentId: string; password: string; name: string }> = []

  for (let i = 1; i <= 300; i++) {
    const studentId = i.toString().padStart(3, '0')
    const email = `student${studentId}@lms.local`
    const password = generatePassword()
    const name = `Student ${studentId}`

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: Role.STUDENT,
        name,
        emailVerifiedAt: new Date(),
        studentId,
        accountStatus: AccountStatus.ACTIVE,
      },
      create: {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        role: Role.STUDENT,
        name,
        emailVerifiedAt: new Date(),
        studentId,
        accountStatus: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    studentCredentials.push({ studentId, password, name })

    if (i % 50 === 0) {
      console.log(`  Created ${i} students...`)
    }
  }

  console.log('✅ 300 students created')

  // Write credentials to secure file for distribution
  writeCredentialsFile(studentCredentials, adminPassword)

  console.log('\n✅ Seed completed successfully!')
  console.log('\n📋 Summary:')
  console.log(`  - 1 Admin (Miss Sulafa): ID: 0 / Password: ${adminPassword}`)
  console.log(`  - 300 Students: IDs 001 through 300`)
  console.log(`  - All passwords: Stored securely in database (bcrypt hashed, cost 12)`)
  console.log(`  - Credentials saved to credentials/ directory for secure distribution`)
  console.log(`\n⚠️  IMPORTANT: Distribute credentials securely, then delete the credentials/ directory!`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })