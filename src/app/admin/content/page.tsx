"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, ChevronRight, Loader2, FolderOpen, FileText, Video, HelpCircle, Upload, Download, Eye, X, Paperclip, FileVideo, Save, RotateCcw, Brain, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

interface Subject {
  id: string;
  name: string;
  slug: string;
  _count: { Unit: number };
  Unit: Unit[];
}

interface Unit {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  _count: { Topic: number };
  Topic: Topic[];
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  _count: { Resource: number; Recording: number; Quiz: number };
}

interface Resource {
  id: string;
  title: string;
  description?: string;
  type: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface Recording {
  id: string;
  title: string;
  description?: string;
  streamVideoId: string;
  durationSeconds?: number;
  recordedDate?: string;
  createdAt: string;
}

const RESOURCE_TYPES = [
  { value: "LESSON", label: "Lesson", icon: "📘" },
  { value: "NOTE", label: "Notes", icon: "📝" },
  { value: "WORKSHEET", label: "Worksheet", icon: "📋" },
  { value: "SAVE_MY_EXAM", label: "Save My Exam", icon: "💾" },
  { value: "RESOURCE", label: "Resource", icon: "📄" },
];

// Helper function to estimate time per question
function getEstimatedTime(type: string, marks: number): number {
  switch (type) {
    case "MULTIPLE_CHOICE":
      return Math.max(1, marks * 1);
    case "SHORT_ANSWER":
      return Math.max(2, marks * 2);
    case "ESSAY":
      return Math.max(5, marks * 3);
    default:
      return marks;
  }
}

// Subject create/edit form. Kept at module scope (not inside the page component)
// so React doesn't treat it as a new component type on every render, which would
// unmount/remount the inputs and lose focus after each keystroke.
function SubjectForm({
  onSubmit,
  onCancel,
  name,
  slug,
  onNameChange,
  onSlugChange,
  loading,
  isNew,
}: {
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  name: string;
  slug: string;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  loading: boolean;
  isNew: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        id="name"
        label="Subject Name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="e.g., Biology"
        required
      />
      <Input
        id="slug"
        label="Slug (URL-friendly)"
        value={slug}
        onChange={(e) => onSlugChange(e.target.value)}
        placeholder="e.g., biology"
        required
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          {isNew ? "Create Subject" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminContentPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSlug, setNewSubjectSlug] = useState("");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectSlug, setEditSubjectSlug] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Resources/Recordings state
  const [topicResources, setTopicResources] = useState<Record<string, Resource[]>>({});
  const [topicRecordings, setTopicRecordings] = useState<Record<string, Recording[]>>({});
  const [loadingResources, setLoadingResources] = useState<Set<string>>(new Set());
  const [loadingRecordings, setLoadingRecordings] = useState<Set<string>>(new Set());
  const [uploadingResource, setUploadingResource] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingRecording, setUploadingRecording] = useState<string | null>(null);
  const [showResourceForm, setShowResourceForm] = useState<string | null>(null);
  const [showRecordingForm, setShowRecordingForm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"resources" | "recordings" | "quizzes">("resources");
  const [newResource, setNewResource] = useState<{ title: string; description: string; type: string; file: File | null }>({ title: "", description: "", type: "NOTE", file: null });
  const [newRecording, setNewRecording] = useState<{ title: string; description: string; streamVideoId: string; durationSeconds: number; recordedDate: string }>({ title: "", description: "", streamVideoId: "", durationSeconds: 0, recordedDate: "" });

  // AI Quiz Generation state
  const [showAIGenerate, setShowAIGenerate] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<{ questionCount: number; types: string[]; difficulty: "core" | "extended" | "mixed" }>({ questionCount: 10, types: ["MULTIPLE_CHOICE", "SHORT_ANSWER"], difficulty: "mixed" });
  const [generatedQuiz, setGeneratedQuiz] = useState<{ title: string; timeLimitSeconds: number; questions: any[]; meta?: { provider?: string } } | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/admin/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects);
      }
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !newSubjectSlug.trim()) return;

    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubjectName.trim(), slug: newSubjectSlug.trim() }),
      });
      if (res.ok) {
        fetchSubjects();
        setCreatingSubject(false);
        setNewSubjectName("");
        setNewSubjectSlug("");
        showToast("success", "Subject created successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to create subject");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editSubjectName.trim() || !editSubjectSlug.trim()) return;

    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingSubject.id, name: editSubjectName.trim(), slug: editSubjectSlug.trim() }),
      });
      if (res.ok) {
        fetchSubjects();
        setEditingSubject(null);
        showToast("success", "Subject updated successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to update subject");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject? This will delete all units, topics, and content within it.")) return;

    try {
      const res = await fetch(`/api/admin/subjects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSubjects(subjects.filter((s) => s.id !== id));
        showToast("success", "Subject deleted successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to delete subject");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  const handleCreateUnit = async (subjectId: string, name: string, orderIndex: number) => {
    try {
      const res = await fetch("/api/admin/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, name, orderIndex }),
      });
      if (res.ok) {
        fetchSubjects();
        showToast("success", "Unit created successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to create unit");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  const handleUpdateUnit = async (unitId: string, subjectId: string, name: string, orderIndex: number) => {
    try {
      const res = await fetch("/api/admin/units", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: unitId, name, orderIndex }),
      });
      if (res.ok) {
        fetchSubjects();
        showToast("success", "Unit updated successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to update unit");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  const handleDeleteUnit = async (unitId: string, subjectId: string) => {
    if (!confirm("Are you sure you want to delete this unit? This will delete all topics and content within it.")) return;

    try {
      const res = await fetch(`/api/admin/units?id=${unitId}`, { method: "DELETE" });
      if (res.ok) {
        setSubjects(subjects.map((s) => (s.id === subjectId ? { ...s, Unit: s.Unit.filter((u) => u.id !== unitId) } : s)));
        showToast("success", "Unit deleted successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to delete unit");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  const handleCreateTopic = async (unitId: string, subjectId: string, name: string, orderIndex: number) => {
    try {
      const res = await fetch("/api/admin/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, name, orderIndex }),
      });
      if (res.ok) {
        fetchSubjects();
        showToast("success", "Topic created successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to create topic");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  const handleUpdateTopic = async (topicId: string, unitId: string, subjectId: string, name: string, orderIndex: number) => {
    try {
      const res = await fetch("/api/admin/topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: topicId, name, orderIndex }),
      });
      if (res.ok) {
        fetchSubjects();
        showToast("success", "Topic updated successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to update topic");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  const handleDeleteTopic = async (topicId: string, unitId: string, subjectId: string) => {
    if (!confirm("Are you sure you want to delete this topic? This will delete all resources, recordings, and quizzes within it.")) return;

    try {
      const res = await fetch(`/api/admin/topics?id=${topicId}`, { method: "DELETE" });
      if (res.ok) {
        setSubjects(subjects.map((s) =>
          s.id === subjectId
            ? { ...s, Unit: s.Unit.map((u) => (u.id === unitId ? { ...u, Topic: u.Topic.filter((t) => t.id !== topicId) } : u)) }
            : s
        ));
        showToast("success", "Topic deleted successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to delete topic");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  // Fetch resources for a topic
  const fetchResources = useCallback(async (topicId: string) => {
    setLoadingResources(prev => new Set(prev).add(topicId));
    try {
      const res = await fetch(`/api/admin/resources?topicId=${topicId}`);
      if (res.ok) {
        const data = await res.json();
        setTopicResources(prev => ({ ...prev, [topicId]: data.resources }));
      }
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setLoadingResources(prev => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
    }
  }, []);

  // Fetch recordings for a topic
  const fetchRecordings = useCallback(async (topicId: string) => {
    setLoadingRecordings(prev => new Set(prev).add(topicId));
    try {
      const res = await fetch(`/api/admin/recordings?topicId=${topicId}`);
      if (res.ok) {
        const data = await res.json();
        setTopicRecordings(prev => ({ ...prev, [topicId]: data.recordings }));
      }
    } catch (error) {
      console.error("Failed to fetch recordings:", error);
    } finally {
      setLoadingRecordings(prev => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
    }
  }, []);

  // Load resources & recordings for the currently expanded topic
  useEffect(() => {
    if (expandedTopic) {
      fetchResources(expandedTopic);
      fetchRecordings(expandedTopic);
    }
  }, [expandedTopic, fetchResources, fetchRecordings]);

  // Upload resource file with progress tracking
  const uploadResourceFile = async (file: File, onProgress?: (progress: number) => void): Promise<{ fileKey: string; fileType: string; fileSize: number } | null> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      // Use XMLHttpRequest for progress tracking
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

        xhr.send(formData);
      });
    } catch (error) {
      console.error("File upload error:", error);
      return null;
    }
  };

  // Create resource
  const handleCreateResource = async (topicId: string) => {
    if (!newResource.title.trim() || !newResource.file) {
      showToast("error", "Title and file are required");
      return;
    }

    setUploadingResource(topicId);
    setUploadProgress(0);
    try {
      // Upload file first with progress tracking
      const fileInfo = await uploadResourceFile(newResource.file, (progress) => setUploadProgress(progress));
      if (!fileInfo) {
        showToast("error", "Failed to upload file");
        return;
      }

      // Create resource record
      const res = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          title: newResource.title.trim(),
          description: newResource.description.trim(),
          type: newResource.type,
          fileKey: fileInfo.fileKey,
          fileType: fileInfo.fileType,
          fileSize: fileInfo.fileSize,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTopicResources(prev => ({ ...prev, [topicId]: [...(prev[topicId] || []), data.resource] }));
        setShowResourceForm(null);
        setNewResource({ title: "", description: "", type: "NOTE", file: null });
        showToast("success", "Resource created successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to create resource");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    } finally {
      setUploadingResource(null);
      setUploadProgress(0);
    }
  };

  // Delete resource
  const handleDeleteResource = async (resourceId: string, topicId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const res = await fetch(`/api/admin/resources?id=${resourceId}`, { method: "DELETE" });
      if (res.ok) {
        setTopicResources(prev => ({
          ...prev,
          [topicId]: (prev[topicId] || []).filter(r => r.id !== resourceId),
        }));
        showToast("success", "Resource deleted successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to delete resource");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  // Create recording
  const handleCreateRecording = async (topicId: string) => {
    if (!newRecording.title.trim() || !newRecording.streamVideoId.trim()) {
      showToast("error", "Title and Stream Video ID are required");
      return;
    }

    setUploadingRecording(topicId);
    try {
      const res = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          title: newRecording.title.trim(),
          description: newRecording.description.trim(),
          streamVideoId: newRecording.streamVideoId.trim(),
          durationSeconds: newRecording.durationSeconds || undefined,
          recordedDate: newRecording.recordedDate || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTopicRecordings(prev => ({ ...prev, [topicId]: [...(prev[topicId] || []), data.recording] }));
        setShowRecordingForm(null);
        setNewRecording({ title: "", description: "", streamVideoId: "", durationSeconds: 0, recordedDate: "" });
        showToast("success", "Recording created successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to create recording");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    } finally {
      setUploadingRecording(null);
    }
  };

  // Generate quiz with AI
  const handleGenerateQuiz = async (topicId: string) => {
    if (aiConfig.types.length === 0) {
      showToast("error", "Please select at least one question type");
      return;
    }

    setAiGenerating(topicId);
    try {
      const res = await fetch("/api/admin/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          questionCount: aiConfig.questionCount,
          types: aiConfig.types,
          difficulty: aiConfig.difficulty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedQuiz(data.quiz);
        setShowPreview(topicId);
        const provider = data.meta?.provider || "AI";
        showToast("success", `Quiz generated successfully with ${provider}!`);
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to generate quiz");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    } finally {
      setAiGenerating(null);
    }
  };

  // Save generated quiz
  const handleSaveGeneratedQuiz = async (topicId: string) => {
    if (!generatedQuiz) return;

    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          title: generatedQuiz.title,
          timeLimitSeconds: generatedQuiz.timeLimitSeconds,
          isActive: true,
          questions: generatedQuiz.questions.map((q: any, idx: number) => ({
            prompt: q.prompt,
            type: q.type,
            marks: q.marks,
            orderIndex: idx,
            options: q.options?.map((opt: any) => ({ text: opt.text, isCorrect: opt.isCorrect })),
            explanation: q.explanation,
            markScheme: q.markScheme,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Refresh topic counts by refetching subjects
        fetchSubjects();
        setShowAIGenerate(null);
        setGeneratedQuiz(null);
        setShowPreview(null);
        showToast("success", "Quiz saved successfully!");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to save quiz");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  // Delete recording
  const handleDeleteRecording = async (recordingId: string, topicId: string) => {
    if (!confirm("Are you sure you want to delete this recording?")) return;

    try {
      const res = await fetch(`/api/admin/recordings?id=${recordingId}`, { method: "DELETE" });
      if (res.ok) {
        setTopicRecordings(prev => ({
          ...prev,
          [topicId]: (prev[topicId] || []).filter(r => r.id !== recordingId),
        }));
        showToast("success", "Recording deleted successfully");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to delete recording");
      }
    } catch (error) {
      showToast("error", "An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage subjects, units, topics, and content</p>
        </header>

        {toast && (
          <Alert variant={toast.type} dismissible onDismiss={() => setToast(null)} className="mb-6">
            {toast.text}
          </Alert>
        )}

        {/* Create Subject Form */}
        {creatingSubject && (
          <GlassCard variant="default" padding="lg" className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Subject</h2>
            <SubjectForm
              onSubmit={handleCreateSubject}
              onCancel={() => setCreatingSubject(false)}
              name={newSubjectName}
              slug={newSubjectSlug}
              onNameChange={setNewSubjectName}
              onSlugChange={setNewSubjectSlug}
              loading={false}
              isNew={true}
            />
          </GlassCard>
        )}

        {!creatingSubject && (
          <Button onClick={() => setCreatingSubject(true)} className="mb-6" icon={<Plus className="w-4 h-4" />}>
            Add Subject
          </Button>
        )}

        {/* Subjects List */}
        {loading ? (
          <div className="space-y-4" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} variant="strong" padding="lg" className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </GlassCard>
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <GlassCard variant="default" padding="xl" className="text-center">
            <FolderOpen className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No subjects yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first subject to start building content.</p>
            <Button onClick={() => setCreatingSubject(true)} icon={<Plus className="w-4 h-4" />}>
              Create Subject
            </Button>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {subjects.map((subject) => (
              <GlassCard key={subject.id} variant="default" padding="lg">
                {/* Subject Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
                      aria-label={expandedSubject === subject.id ? "Collapse" : "Expand"}
                    >
                      <ChevronRight className={`w-5 h-5 transition-transform ${expandedSubject === subject.id ? "rotate-90" : ""}`} />
                    </Button>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{subject.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Slug: {subject.slug} · {subject._count.Unit} units</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingSubject(subject)}>
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteSubject(subject.id)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Edit Subject Form */}
                {editingSubject?.id === subject.id && (
                  <SubjectForm
                    onSubmit={handleUpdateSubject}
                    onCancel={() => setEditingSubject(null)}
                    name={editSubjectName}
                    slug={editSubjectSlug}
                    onNameChange={setEditSubjectName}
                    onSlugChange={setEditSubjectSlug}
                    loading={false}
                    isNew={false}
                  />
                )}

                {/* Units */}
                {expandedSubject === subject.id && (
                  <div className="ml-4 mt-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                    {subject.Unit.sort((a, b) => a.orderIndex - b.orderIndex).map((unit) => (
                      <div key={unit.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 ml-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
                              aria-label={expandedUnit === unit.id ? "Collapse" : "Expand"}
                            >
                              <ChevronRight className={`w-5 h-5 transition-transform ${expandedUnit === unit.id ? "rotate-90" : ""}`} />
                            </Button>
                            <div className="w-10 h-10 rounded-lg bg-secondary/10 dark:bg-secondary/20 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-secondary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{unit.name}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{unit._count.Topic} topics</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDeleteUnit(unit.id, subject.id)} title="Delete Unit">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {expandedUnit === unit.id && (
                          <div className="ml-4 mt-2 space-y-2">
                            {unit.Topic.sort((a, b) => a.orderIndex - b.orderIndex).map((topic) => (
                              <div key={topic.id}>
                                <div
                                  className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer transition-colors ${expandedTopic === topic.id ? "bg-primary/5 dark:bg-primary/10 border border-primary/20" : "hover:bg-gray-100 dark:hover:bg-gray-700/50"}`}
                                  onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => { e.stopPropagation(); setExpandedTopic(expandedTopic === topic.id ? null : topic.id); }}
                                      aria-label={expandedTopic === topic.id ? "Collapse" : "Expand"}
                                    >
                                      <ChevronRight className={`w-5 h-5 transition-transform ${expandedTopic === topic.id ? "rotate-90" : ""}`} />
                                    </Button>
                                    <div className="w-8 h-8 rounded bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
                                      <HelpCircle className="w-4 h-4 text-accent" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-white">{topic.name}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {topic._count.Resource} resources · {topic._count.Recording} recordings · {topic._count.Quiz} quizzes
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Link href={`/dashboard/${subject.slug}/${unit.slug}/${topic.slug}`} target="_blank" title="View as student" onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon"><FileText className="w-4 h-4" /></Button>
                                    </Link>
                                    <Button variant="ghost" size="icon" className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id, unit.id, subject.id); }} title="Delete Topic">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Expanded Topic Content: Resources, Recordings, Quizzes Tabs */}
                                {expandedTopic === topic.id && (
                                  <div className="ml-4 mt-3 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                    <div className="border-b border-gray-200 dark:border-gray-700">
                                      <nav className="flex gap-4" aria-label="Content tabs">
                                        <button
                                          onClick={() => setActiveTab("resources")}
                                          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "resources" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                        >
                                          Resources ({topic._count.Resource})
                                        </button>
                                        <button
                                          onClick={() => setActiveTab("recordings")}
                                          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "recordings" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                        >
                                          Recordings ({topic._count.Recording})
                                        </button>
                                        <button
                                          onClick={() => setActiveTab("quizzes")}
                                          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "quizzes" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                        >
                                          Quizzes ({topic._count.Quiz})
                                        </button>
                                      </nav>
                                    </div>

                                    {/* Resources Tab */}
                                    {activeTab === "resources" && (
                                      <div className="mt-4 space-y-3">
                                        {/* Add Resource Button/Form */}
                                        {showResourceForm === topic.id ? (
                                          <GlassCard variant="default" padding="md">
                                            <div className="flex items-center justify-between mb-3">
                                              <h4 className="font-medium text-gray-900 dark:text-white">Upload Resource</h4>
                                              <Button variant="ghost" size="icon" onClick={() => { setShowResourceForm(null); setNewResource({ title: "", description: "", type: "NOTE", file: null }); }}>
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </div>
                                            <form onSubmit={(e) => { e.preventDefault(); handleCreateResource(topic.id); }} className="space-y-3">
                                              <Input
                                                id="resource-title"
                                                label="Title"
                                                value={newResource.title}
                                                onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                                                placeholder="e.g., Cell Structure Notes"
                                                required
                                              />
                                              <textarea
                                                id="resource-description"
                                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                rows={2}
                                                placeholder="Description (optional)"
                                                value={newResource.description}
                                                onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                                              />
                                              <div className="flex items-center gap-2">
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
                                                <select
                                                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                  value={newResource.type}
                                                  onChange={(e) => setNewResource(prev => ({ ...prev, type: e.target.value }))}
                                                >
                                                  {RESOURCE_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                                                <input
                                                  type="file"
                                                  id="resource-file"
                                                  className="hidden"
                                                  onChange={(e) => { const files = e.target.files; if (files && files[0]) setNewResource(prev => ({ ...prev, file: files[0] })); }}
                                                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.webp"
                                                />
                                                <label
                                                  htmlFor="resource-file"
                                                  className={`cursor-pointer flex flex-col items-center gap-2 ${newResource.file ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" : ""}`}
                                                >
                                                  {newResource.file ? (
                                                    <>
                                                      <Paperclip className="w-8 h-8 text-green-600 dark:text-green-400" />
                                                      <p className="text-sm font-medium text-green-700 dark:text-green-300">{newResource.file.name}</p>
                                                      <p className="text-xs text-green-600 dark:text-green-400">{(newResource.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                      <Button variant="ghost" size="sm" type="button" onClick={() => setNewResource(prev => ({ ...prev, file: null }))}>
                                                        <RotateCcw className="w-3 h-3 mr-1" /> Remove
                                                      </Button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Upload className="w-8 h-8 text-gray-400" />
                                                      <p className="text-sm text-gray-500 dark:text-gray-400">Drag & drop a file or click to browse</p>
                                                      <p className="text-xs text-gray-400 dark:text-gray-500">PDF, DOC, PPT, XLS, TXT, Images (max 50MB)</p>
                                                    </>
                                                  )}
                                                </label>
                                              </div>
                                              <div className="flex justify-end gap-2 pt-2">
                                                <Button type="button" variant="ghost" onClick={() => { setShowResourceForm(null); setNewResource({ title: "", description: "", type: "NOTE", file: null }); }}>Cancel</Button>
                                                <Button type="submit" loading={uploadingResource === topic.id} icon={uploadingResource === topic.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>
                                                  {uploadingResource === topic.id ? "Uploading..." : "Save Resource"}
                                                </Button>
                                              </div>
                                              {uploadingResource === topic.id && uploadProgress > 0 && (
                                                <div className="w-full mt-2" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100} aria-label="File upload progress">
                                                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                      className="h-full bg-primary transition-all duration-300"
                                                      style={{ width: `${uploadProgress}%` }}
                                                    />
                                                  </div>
                                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{uploadProgress}%</p>
                                                </div>
                                              )}
                                            </form>
                                          </GlassCard>
                                        ) : (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            icon={<Plus className="w-4 h-4" />}
                                            onClick={() => setShowResourceForm(topic.id)}
                                            className="w-full justify-start"
                                          >
                                            Add Resource
                                          </Button>
                                        )}

                                        {/* Resources List */}
                                        {loadingResources.has(topic.id) ? (
                                          <div className="space-y-2" aria-busy="true">
                                            {[1, 2].map(i => (
                                              <GlassCard key={i} variant="strong" padding="sm" className="animate-pulse">
                                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                              </GlassCard>
                                            ))}
                                          </div>
                                        ) : (topicResources[topic.id] || []).length === 0 ? (
                                          <GlassCard variant="default" padding="md" className="text-center text-gray-500 dark:text-gray-400">
                                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No resources yet. Click "Add Resource" to upload.</p>
                                          </GlassCard>
                                        ) : (
                                          <div className="space-y-2">
                                            {(topicResources[topic.id] || []).map((resource) => (
                                              <GlassCard key={resource.id} variant="strong" padding="sm" className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                  <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                    <Paperclip className="w-5 h-5 text-primary" />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">{resource.title}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                      <Badge variant="outline" className="text-xs">{RESOURCE_TYPES.find(t => t.value === resource.type)?.label || resource.type}</Badge>
                                                      <span>{(resource.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                                      <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                  <a
                                                    href={`/api/files/${encodeURIComponent(resource.fileKey)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Open resource"
                                                  >
                                                    <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                                                  </a>
                                                  <a
                                                    href={`/api/files/${encodeURIComponent(resource.fileKey)}?download=true`}
                                                    download
                                                    title="Download resource"
                                                  >
                                                    <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                                                  </a>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => handleDeleteResource(resource.id, topic.id)}
                                                    title="Delete resource"
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              </GlassCard>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Recordings Tab */}
                                    {activeTab === "recordings" && (
                                      <div className="mt-4 space-y-3">
                                        {/* Add Recording Button/Form */}
                                        {showRecordingForm === topic.id ? (
                                          <GlassCard variant="default" padding="md">
                                            <div className="flex items-center justify-between mb-3">
                                              <h4 className="font-medium text-gray-900 dark:text-white">Add Recording</h4>
                                              <Button variant="ghost" size="icon" onClick={() => { setShowRecordingForm(null); setNewRecording({ title: "", description: "", streamVideoId: "", durationSeconds: 0, recordedDate: "" }); }}>
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </div>
                                            <form onSubmit={(e) => { e.preventDefault(); handleCreateRecording(topic.id); }} className="space-y-3">
                                              <Input
                                                id="recording-title"
                                                label="Title"
                                                value={newRecording.title}
                                                onChange={(e) => setNewRecording(prev => ({ ...prev, title: e.target.value }))}
                                                placeholder="e.g., Cell Structure Lecture"
                                                required
                                              />
                                              <textarea
                                                id="recording-description"
                                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                rows={2}
                                                placeholder="Description (optional)"
                                                value={newRecording.description}
                                                onChange={(e) => setNewRecording(prev => ({ ...prev, description: e.target.value }))}
                                              />
                                              <Input
                                                id="recording-streamVideoId"
                                                label="Stream Video ID (from Mux/Cloudflare Stream)"
                                                value={newRecording.streamVideoId}
                                                onChange={(e) => setNewRecording(prev => ({ ...prev, streamVideoId: e.target.value }))}
                                                placeholder="e.g., abc123xyz"
                                                required
                                              />
                                              <div className="grid grid-cols-2 gap-3">
                                                <Input
                                                  id="recording-duration"
                                                  label="Duration (seconds)"
                                                  type="number"
                                                  value={String(newRecording.durationSeconds)}
                                                  onChange={(e) => setNewRecording(prev => ({ ...prev, durationSeconds: parseInt(e.target.value) || 0 }))}
                                                  placeholder="Optional"
                                                />
                                                <Input
                                                  id="recording-date"
                                                  label="Recorded Date"
                                                  type="date"
                                                  value={newRecording.recordedDate}
                                                  onChange={(e) => setNewRecording(prev => ({ ...prev, recordedDate: e.target.value }))}
                                                />
                                              </div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Upload your video to Mux or Cloudflare Stream first, then paste the Stream Video ID here.
                                                <a href="/api/upload/video" target="_blank" className="text-primary hover:underline ml-1">Create Mux upload URL</a>
                                              </p>
                                              <div className="flex justify-end gap-2 pt-2">
                                                <Button type="button" variant="ghost" onClick={() => { setShowRecordingForm(null); setNewRecording({ title: "", description: "", streamVideoId: "", durationSeconds: 0, recordedDate: "" }); }}>Cancel</Button>
                                                <Button type="submit" loading={uploadingRecording === topic.id} icon={uploadingRecording === topic.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>
                                                  {uploadingRecording === topic.id ? "Saving..." : "Save Recording"}
                                                </Button>
                                              </div>
                                            </form>
                                          </GlassCard>
                                        ) : (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            icon={<Plus className="w-4 h-4" />}
                                            onClick={() => setShowRecordingForm(topic.id)}
                                            className="w-full justify-start"
                                          >
                                            Add Recording
                                          </Button>
                                        )}

                                        {/* Recordings List */}
                                        {loadingRecordings.has(topic.id) ? (
                                          <div className="space-y-2" aria-busy="true">
                                            {[1, 2].map(i => (
                                              <GlassCard key={i} variant="strong" padding="sm" className="animate-pulse">
                                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                              </GlassCard>
                                            ))}
                                          </div>
                                        ) : (topicRecordings[topic.id] || []).length === 0 ? (
                                          <GlassCard variant="default" padding="md" className="text-center text-gray-500 dark:text-gray-400">
                                            <FileVideo className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No recordings yet. Click "Add Recording" to add a video.</p>
                                          </GlassCard>
                                        ) : (
                                          <div className="space-y-2">
                                            {(topicRecordings[topic.id] || []).map((recording) => (
                                              <GlassCard key={recording.id} variant="strong" padding="sm" className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                  <div className="w-10 h-10 rounded-lg bg-secondary/10 dark:bg-secondary/20 flex items-center justify-center flex-shrink-0">
                                                    <FileVideo className="w-5 h-5 text-secondary" />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">{recording.title}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                      {recording.durationSeconds ? <span>{Math.floor(recording.durationSeconds / 60)}:{String(recording.durationSeconds % 60).padStart(2, '0')}</span> : <span>Unknown duration</span>}
                                                      {recording.recordedDate && <span>{new Date(recording.recordedDate).toLocaleDateString()}</span>}
                                                      <span>{new Date(recording.createdAt).toLocaleDateString()}</span>
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => window.open(`https://stream.mux.com/${recording.streamVideoId}`, '_blank')}
                                                    title="Preview video"
                                                  >
                                                    <Eye className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => handleDeleteRecording(recording.id, topic.id)}
                                                    title="Delete recording"
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              </GlassCard>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Quizzes Tab */}
                                    {activeTab === "quizzes" && (
                                      <div className="mt-4 space-y-3">
                                        {/* AI Generate Form */}
                                        {showAIGenerate === topic.id ? (
                                          <GlassCard variant="default" padding="md">
                                            <div className="flex items-center justify-between mb-4">
                                              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                <Brain className="w-5 h-5 text-primary" />
                                                Generate Quiz with AI
                                              </h4>
                                              <Button variant="ghost" size="icon" onClick={() => { setShowAIGenerate(null); setGeneratedQuiz(null); }}>
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </div>

                                            {/* Configuration Form */}
                                            {(!generatedQuiz || showPreview === topic.id) && (
                                              <form onSubmit={(e) => { e.preventDefault(); handleGenerateQuiz(topic.id); }} className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question Count</label>
                                                    <Input
                                                      type="number"
                                                      min={1}
                                                      max={20}
                                                      value={aiConfig.questionCount}
                                                      onChange={(e) => setAiConfig(prev => ({ ...prev, questionCount: parseInt(e.target.value) || 1 }))}
                                                      required
                                                    />
                                                  </div>
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                                                    <select
                                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                      value={aiConfig.difficulty}
                                                      onChange={(e) => setAiConfig(prev => ({ ...prev, difficulty: e.target.value as "core" | "extended" | "mixed" }))}
                                                    >
                                                      <option value="core">Core (Grades C-G)</option>
                                                      <option value="extended">Extended (Grades A*-C)</option>
                                                      <option value="mixed">Mixed Core & Extended</option>
                                                    </select>
                                                  </div>
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question Types</label>
                                                    <div className="flex gap-2">
                                                      {["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"].map(t => (
                                                        <label key={t} className="flex items-center gap-1 text-sm cursor-pointer">
                                                          <input
                                                            type="checkbox"
                                                            checked={aiConfig.types.includes(t)}
                                                            onChange={(e) => setAiConfig(prev => ({
                                                              ...prev,
                                                              types: e.target.checked
                                                                ? [...prev.types, t]
                                                                : prev.types.filter(x => x !== t)
                                                            }))}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                          />
                                                          <span className="capitalize">{t.replace(/_/g, " ").toLowerCase()}</span>
                                                        </label>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                  <Button type="button" variant="ghost" onClick={() => { setShowAIGenerate(null); setGeneratedQuiz(null); }}>Cancel</Button>
                                                  <Button type="submit" loading={aiGenerating === topic.id} icon={aiGenerating === topic.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}>
                                                    {aiGenerating === topic.id ? "Generating..." : "Generate Quiz"}
                                                  </Button>
                                                </div>
                                              </form>
                                            )}

                                            {/* Preview Generated Quiz */}
                                            {generatedQuiz && showPreview === topic.id && (
                                              <div className="space-y-4">
                                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                                  <div className="flex items-center justify-between">
                                                    <div>
                                                      <p className="font-medium text-green-800 dark:text-green-200">Quiz Generated Successfully!</p>
                                                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-4">
                                                        <span>{generatedQuiz.questions.length} questions · ~{Math.floor(generatedQuiz.timeLimitSeconds / 60)} min</span>
                                                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                                                          AI Provider: {generatedQuiz.meta?.provider || "Unknown"}
                                                        </span>
                                                      </p>
                                                    </div>
                                                    <Button variant="outline" size="sm" onClick={() => setShowPreview(null)}>
                                                      <RotateCcw className="w-4 h-4 mr-1" /> Regenerate
                                                    </Button>
                                                  </div>
                                                </div>

                                                <div className="max-h-96 overflow-y-auto space-y-3">
                                                  {generatedQuiz.questions.map((q, idx) => (
                                                    <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                                      <div className="flex items-start gap-3">
                                                        <span className="text-sm font-medium text-primary flex-shrink-0 mt-0.5">Q{idx + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                          <p className="font-medium text-gray-900 dark:text-white mb-1">{q.prompt}</p>
                                                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                            <Badge variant="outline" className="text-xs capitalize">{q.type.toLowerCase().replace(/_/g, " ")}</Badge>
                                                            <span>{q.marks} marks</span>
                                                            <span className="px-1.5 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary text-xs rounded">~{getEstimatedTime(q.type, q.marks)} min</span>
                                                          </p>
                                                          {q.type === "MULTIPLE_CHOICE" && q.options && (
                                                            <div className="mt-2 space-y-1 ml-4">
                                                              {q.options.map((opt: any, oIdx: number) => (
                                                                <div key={oIdx} className="text-sm flex items-center gap-2">
                                                                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium ${opt.isCorrect ? "bg-green-100 border-green-400 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300" : "bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600"}`}>
                                                                    {String.fromCharCode(65 + oIdx)}
                                                                  </span>
                                                                  <span className="text-gray-700 dark:text-gray-300">{opt.text}</span>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}
                                                          {q.explanation && (
                                                            <p className="mt-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                                              <strong>Explanation:</strong> {q.explanation}
                                                            </p>
                                                          )}
                                                          {q.markScheme && q.type !== "MULTIPLE_CHOICE" && (
                                                            <p className="mt-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                                                              <strong>Mark Scheme:</strong> {q.markScheme}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>

                                                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                  <Button type="button" variant="ghost" onClick={() => { setShowAIGenerate(null); setGeneratedQuiz(null); setShowPreview(null); }}>Cancel</Button>
                                                  <Button variant="primary" onClick={() => handleSaveGeneratedQuiz(topic.id)} icon={<Save className="w-4 h-4" />}>
                                                    Save as Quiz
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </GlassCard>
                                        ) : (
                                          <div className="space-y-3">
                                            <GlassCard variant="default" padding="md">
                                              <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-medium text-gray-900 dark:text-white">Quiz Management</h4>
                                                <Button variant="primary" icon={<Zap className="w-4 h-4" />} onClick={() => setShowAIGenerate(topic.id)}>
                                                  <Brain className="w-4 h-4 mr-1" /> Generate with AI
                                                </Button>
                                              </div>
                                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                Create IGCSE-aligned quizzes using AI (Gemini/DeepSeek). Select topic, question types, and difficulty.
                                              </p>
                                              <Button variant="outline" icon={<FileText className="w-4 h-4" />} disabled>Create Quiz Manually</Button>
                                            </GlassCard>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {/* Add Topic Form */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const formData = new FormData(e.currentTarget);
                                  handleCreateTopic(unit.id, subject.id, formData.get("name") as string, parseInt(formData.get("orderIndex") as string) || 0);
                                  e.currentTarget.reset();
                                }}
                                className="flex items-center gap-2"
                              >
                                <Input placeholder="Topic name" name="name" required className="flex-1" />
                                <Input placeholder="Order" name="orderIndex" type="number" required className="w-20" defaultValue={unit.Topic.length} />
                                <Button type="submit" size="sm"><Plus className="w-4 h-4" /></Button>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Add Unit Form */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          handleCreateUnit(subject.id, formData.get("name") as string, parseInt(formData.get("orderIndex") as string) || 0);
                          e.currentTarget.reset();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Input placeholder="Unit name" name="name" required className="flex-1" />
                        <Input placeholder="Order" name="orderIndex" type="number" required className="w-20" defaultValue={subject.Unit.length} />
                        <Button type="submit" size="sm"><Plus className="w-4 h-4" /></Button>
                      </form>
                    </div>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}