# LMS - Learning Management System

A modern Learning Management System for Biology and Chemistry built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and Prisma.

## Features

- **Role-based access**: Teacher (Miss Sulafa) and Student dashboards
- **Content management**: Subjects, Units, Topics, Resources, Recordings
- **Assessments**: Quizzes with multiple choice, short answer, and essay questions
- **Progress tracking**: Student progress monitoring and analytics
- **Authentication**: NextAuth.js with secure credentials
- **Database**: PostgreSQL with Prisma ORM
- **Modern UI**: Tailwind CSS v4 with dark mode support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v4
- **Package Manager**: npm

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd lms-deploy-clean
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your database URL and other secrets.

4. Set up the database:
```bash
npm run db:setup
```
This will generate Prisma client, run migrations, and seed the database with:
- 1 Teacher account (Miss Sulafa)
- 300 Student accounts (IDs 001-300)

5. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
lms-deploy-clean/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts           # Database seeding script
│   └── create-admin.mjs  # Admin creation utility
├── public/               # Static assets
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (auth)/       # Authentication routes
│   │   ├── admin/        # Teacher dashboard
│   │   ├── dashboard/    # Student dashboard
│   │   └── api/          # API routes
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   └── providers/    # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   └── types/            # TypeScript types
├── .gitignore
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
└── README.md
```

## Key Features

### Teacher (Miss Sulafa) Dashboard
- Content management (Subjects, Units, Topics)
- Upload resources (PDFs, documents, images)
- Upload video recordings (Cloudflare Stream integration)
- Create and manage quizzes
- Student management and progress tracking
- Analytics and reports
- Announcements

### Student Dashboard
- Browse curriculum by subject
- Access lessons and resources
- Watch video recordings
- Take quizzes
- Track progress and scores

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Required environment variables for production:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random secret for NextAuth
- `NEXTAUTH_URL` - Production URL
- `TEACHER_PASSWORD` - Password for teacher account
- Cloudflare credentials (for video streaming)

### Database Setup for Production

Ensure your PostgreSQL database is accessible and run:
```bash
npx prisma migrate deploy
npm run db:seed
```

## Security Notes

- All passwords are bcrypt hashed (cost 12)
- Credentials are never committed to git
- `.gitignore` excludes sensitive files
- HTTPS enforced in production
- CSP headers configured in `next.config.ts`

## License

Private project - All rights reserved.