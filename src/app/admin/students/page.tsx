"use client";

import { useState, useEffect, Suspense } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import Link from "next/link";
import { Eye, BarChart2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Alert } from "@/components/ui/Alert";

interface Student {
  id: string;
  studentId: string | null;
  name: string | null;
  email: string;
  accountStatus: "ACTIVE" | "DISABLED";
  _count: {
    Progress: number;
    QuizAttempt: number;
  };
  createdAt: string;
}

function AdminStudentsPageContent() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStudents = async () => {
    try {
      // Fetch all students for management (the UI does client-side filtering).
      const res = await fetch("/api/admin/students?limit=1000");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (studentId: string, action: "enable" | "disable") => {
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setStudents((prev) =>
          prev.map((s) => (s.studentId === studentId ? { ...s, accountStatus: data.accountStatus } : s))
        );
        setToast({ type: "success", text: `Student ${data.studentId} has been ${action === "enable" ? "enabled" : "disabled"}.` });
      } else {
        const data = await res.json();
        setToast({ type: "error", text: data.error || "Failed to update student status" });
      }
    } catch (err) {
      console.error("Failed to update student status:", err);
      setToast({ type: "error", text: "An unexpected error occurred" });
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    const displayId = s.studentId || s.email.replace("student", "").replace("@lms.local", "").replace(/^0+/, "");
    return s.name?.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || displayId.includes(q);
  });

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: enUS });
    } catch {
      return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading students">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and view all 300 pre-generated student accounts</p>
        </header>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <a href="#students-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:font-medium">
        Skip to student management
      </a>
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and view all 300 pre-generated student accounts</p>
      </header>
      {toast && (
        <div
          className={`p-4 rounded-xl border ${toast.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"} animate-slide-in`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
              {toast.type === "success" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium">{toast.text}</p>
          </div>
        </div>
      )}
      <Card variant="outlined" padding="lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <label htmlFor="searchStudents" className="sr-only">Search Students</label>
            <Input
              id="searchStudents"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or Student ID (001-300)"
              className="pl-10"
            />
            <div className="absolute left-3 top-[38px] text-gray-400 pointer-events-none" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-end">
            <span className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
              {filteredStudents.length} of {students.length} students
            </span>
          </div>
        </div>
      </Card>
      <main id="students-content">
        <Card variant="outlined" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Registered Students</h2>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12" role="status">
              <div className="text-4xl mb-3" aria-hidden="true">👥</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No students found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your search query</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Student ID</TableHead>
                    <TableHead scope="col">Name</TableHead>
                    <TableHead scope="col">Email</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Topics Viewed</TableHead>
                    <TableHead scope="col">Quizzes Taken</TableHead>
                    <TableHead scope="col">Joined</TableHead>
                    <TableHead scope="col" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const displayId = student.studentId || student.email.replace("student", "").replace("@lms.local", "");
                    const isActive = student.accountStatus === "ACTIVE";
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono font-medium text-primary">{displayId}</TableCell>
                        <TableCell className="font-medium">{student.name || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{student.email}</TableCell>
                        <TableCell>
                          <Badge variant={isActive ? "success" : "error"} size="sm">
                            {isActive ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>{student._count.Progress}</TableCell>
                        <TableCell>{student._count.QuizAttempt}</TableCell>
                        <TableCell>{formatDate(student.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/students/${student.id}/progress`}
                              className="text-primary hover:underline text-sm font-medium"
                              aria-label={`View progress for student ${displayId}`}
                            >
                              View Progress
                            </Link>
                            <Button
                              variant={isActive ? "outline" : "secondary"}
                              size="sm"
                              onClick={() => handleAction(student.studentId || student.id, isActive ? "disable" : "enable")}
                              className="w-24"
                              aria-label={`${isActive ? "Disable" : "Enable"} student ${displayId}`}
                            >
                              {isActive ? "Disable" : "Enable"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
        <Card variant="outlined" padding="lg" className="bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center" aria-hidden="true">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Student Credentials Reference</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <strong>Student IDs:</strong> 001 through 300 (pre-generated, no registration needed)
            </p>
            <p>
              <strong>Email Format:</strong> student001@lms.local, student002@lms.local, ..., student300@lms.local
            </p>
            <p>
              <strong>Passwords:</strong> Unique random passwords generated for each student (see{" "}
              <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">STUDENT_CREDENTIALS.txt</code>
              )
            </p>
            <p>
              <strong>Login URL:</strong>{" "}
              <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">/login/student</code>{" "}
              - Students enter their 3-digit ID and password
            </p>
            <p className="text-primary font-medium">
              No email invitations needed - all accounts are pre-created and ready to use!
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default function AdminStudentsPageSuspense() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" aria-busy="true">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
        </div>
      }
    >
      <AdminStudentsPageContent />
    </Suspense>
  );
}