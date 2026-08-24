'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-primary/10 dark:via-gray-900 dark:to-secondary/10 px-4">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:font-medium"
      >
        Skip to main content
      </a>
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-6" aria-hidden="true">
            <span className="text-4xl">🧪</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Biology &amp; Chemistry LMS</h1>
          <p className="text-xl text-primary font-semibold mb-6" role="heading" aria-level={2}>Are you Miss Sulafa or a Student?</p>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Welcome to the Learning Management System for Biology and Chemistry.
            Please select your role to continue.
          </p>
        </div>

        {/* Role Selection Cards */}
        <main id="main-content" className="grid md:grid-cols-2 gap-6">
          {/* Miss Sulafa Card */}
          <Link
            href="/login/teacher"
            className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
          >
            <div className="relative h-full p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              {/* Crown icon for teacher */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center border-2 border-primary/20 dark:border-primary/30 group-hover:scale-110 transition-transform" aria-hidden="true">
                <span className="text-2xl">👑</span>
              </div>

              <div className="pt-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Miss Sulafa</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Teacher / Administrator</p>

                <div className="space-y-3 text-left mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">📚</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Full Content Management</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Create subjects, units, topics, resources</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">🎥</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Upload Recordings</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Video lessons and live recordings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">📄</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">File Uploads</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Documents, PDFs, images (teacher only)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">👥</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Student Management</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">View progress, manage 300 student IDs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">📊</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Analytics &amp; Reports</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Track student engagement and quiz results</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                  <span className="inline-flex w-full py-3 px-6 bg-primary text-white font-semibold rounded-lg group-hover:bg-primary/90 transition-colors" aria-hidden="true">
                    Sign in as Teacher
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Student Card */}
          <Link
            href="/login/student"
            className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 rounded-2xl"
          >
            <div className="relative h-full p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-secondary/50 dark:hover:border-secondary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              {/* Graduation cap for student */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-secondary/10 dark:bg-secondary/20 flex items-center justify-center border-2 border-secondary/20 dark:border-secondary/30 group-hover:scale-110 transition-transform" aria-hidden="true">
                <span className="text-2xl">🎓</span>
              </div>

              <div className="pt-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Student</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Learn with your Student ID</p>

                <div className="space-y-3 text-left mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">📖</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Access All Lessons</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Biology &amp; Chemistry curriculum</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">🎥</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Watch Recordings</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Video lessons anytime, anywhere</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">📝</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Take Quizzes</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Test your knowledge</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">📈</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Track Progress</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">See your completion and scores</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-xl" aria-hidden="true">🔐</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Secure Login</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Unique ID + password (no email needed)</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                  <span className="inline-flex w-full py-3 px-6 bg-secondary text-white font-semibold rounded-lg group-hover:bg-secondary/90 transition-colors" aria-hidden="true">
                    Sign in as Student
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </main>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact support:
            <span className="font-mono ml-2">WhatsApp: +20 1558371576</span>
            <span className="font-mono mx-2" aria-hidden="true">|</span>
            <span className="font-mono mx-2">Phone: 01154861056</span>
            <span className="font-mono mx-2" aria-hidden="true">|</span>
            <span className="font-mono mx-2">Email: shndqawy@gmail.com</span>
          </p>
        </div>
      </div>
    </div>
  )
}
