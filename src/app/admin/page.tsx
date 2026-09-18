"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ResourceType =
  | "NOTE"
  | "PDF"
  | "VIDEO"
  | "DOCUMENT"
  | "IMAGE"
  | "LINK"
  | "OTHER";

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  fileKey?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt?: string | null;
}

interface Topic {
  id: string;
  title: string;
  description?: string | null;
  order?: number | null;
  Resource?: Resource[];
  resources?: Resource[];
}

interface Unit {
  id: string;
  title: string;
  description?: string | null;
  order?: number | null;
  Topic?: Topic[];
  topics?: Topic[];
}

interface Subject {
  id: string;
  title: string;
  description?: string | null;
  order?: number | null;
  Unit?: Unit[];
  units?: Unit[];
}

interface NewResourceState {
  title: string;
  description: string;
  type: ResourceType;
  file: File | null;
}

const RESOURCE_TYPES: ResourceType[] = [
  "NOTE",
  "PDF",
  "VIDEO",
  "DOCUMENT",
  "IMAGE",
  "LINK",
  "OTHER",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function getUnits(subject: Subject): Unit[] {
  return [...(subject.Unit ?? subject.units ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
}

function getTopics(unit: Unit): Topic[] {
  return [...(unit.Topic ?? unit.topics ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
}

function getResources(topic: Topic): Resource[] {
  return [...(topic.Resource ?? topic.resources ?? [])];
}

function normalizeSubjects(data: unknown): Subject[] {
  if (Array.isArray(data)) return data as Subject[];

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { subjects?: unknown }).subjects)
  ) {
    return (data as { subjects: Subject[] }).subjects;
  }

  return [];
}

function normalizeUnits(data: unknown): Unit[] {
  if (Array.isArray(data)) return data as Unit[];

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { units?: unknown }).units)
  ) {
    return (data as { units: Unit[] }).units;
  }

  return [];
}

function normalizeTopics(data: unknown): Topic[] {
  if (Array.isArray(data)) return data as Topic[];

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { topics?: unknown }).topics)
  ) {
    return (data as { topics: Topic[] }).topics;
  }

  return [];
}

function normalizeResources(data: unknown): Resource[] {
  if (Array.isArray(data)) return data as Resource[];

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { resources?: unknown }).resources)
  ) {
    return (data as { resources: Resource[] }).resources;
  }

  return [];
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isRemoteUrl(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

function getResourceOpenUrl(fileKey: string): string {
  if (isRemoteUrl(fileKey)) {
    return fileKey;
  }

  return `/api/files/${encodeURIComponent(fileKey)}`;
}

function getResourceDownloadUrl(fileKey: string): string {
  if (isRemoteUrl(fileKey)) {
    return `${fileKey}?download=`;
  }

  return `/api/files/${encodeURIComponent(fileKey)}?download=true`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const object = data as {
      error?: unknown;
      message?: unknown;
    };

    if (typeof object.error === "string" && object.error.trim()) {
      return object.error;
    }

    if (
      typeof object.message === "string" &&
      object.message.trim()
    ) {
      return object.message;
    }
  }

  return fallback;
}

async function createSubject(
  title: string,
  description: string,
): Promise<unknown> {
  const response = await fetch("/api/admin/subjects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      description,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        "Failed to create subject",
      ),
    );
  }

  return data;
}

async function createUnit(
  subjectId: string,
  title: string,
  description: string,
): Promise<unknown> {
  const response = await fetch("/api/admin/units", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subjectId,
      title,
      description,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        "Failed to create unit",
      ),
    );
  }

  return data;
}

async function createTopic(
  unitId: string,
  title: string,
  description: string,
): Promise<unknown> {
  const response = await fetch("/api/admin/topics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      unitId,
      title,
      description,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        "Failed to create topic",
      ),
    );
  }

  return data;
}

export default function AdminContentPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  const [expandedSubject, setExpandedSubject] = useState<string | null>(
    null,
  );
  const [expandedUnit, setExpandedUnit] = useState<string | null>(
    null,
  );
  const [expandedTopic, setExpandedTopic] = useState<string | null>(
    null,
  );

  const [selectedResourceTopic, setSelectedResourceTopic] =
    useState<string | null>(null);

  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState<string | null>(null);
  const [showTopicForm, setShowTopicForm] = useState<string | null>(null);
  const [showResourceForm, setShowResourceForm] =
    useState<string | null>(null);

  const [subjectTitle, setSubjectTitle] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");

  const [unitTitle, setUnitTitle] = useState("");
  const [unitDescription, setUnitDescription] = useState("");

  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");

  const [newResource, setNewResource] =
    useState<NewResourceState>({
      title: "",
      description: "",
      type: "NOTE",
      file: null,
    });

  const [creating, setCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const showToast = useCallback(
    (
      type: "success" | "error",
      text: string,
    ) => {
      setMessageType(type);
      setMessage(text);

      window.setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3500);
    },
    [],
  );

  const fetchSubjects = useCallback(async () => {
    setLoadingSubjects(true);

    try {
      const response = await fetch(
        "/api/admin/subjects",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Failed to load subjects",
          ),
        );
      }

      setSubjects(normalizeSubjects(data));
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to load subjects",
      );
    } finally {
      setLoadingSubjects(false);
    }
  }, [showToast]);

  const fetchUnits = useCallback(
    async (subjectId: string) => {
      setLoadingContent(true);

      try {
        const response = await fetch(
          `/api/admin/units?subjectId=${encodeURIComponent(
            subjectId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              "Failed to load units",
            ),
          );
        }

        const units = normalizeUnits(data);

        setSubjects((current) =>
          current.map((subject) =>
            subject.id === subjectId
              ? {
                  ...subject,
                  Unit: units,
                  units,
                }
              : subject,
          ),
        );
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Failed to load units",
        );
      } finally {
        setLoadingContent(false);
      }
    },
    [showToast],
  );

  const fetchTopics = useCallback(
    async (unitId: string, subjectId: string) => {
      try {
        const response = await fetch(
          `/api/admin/topics?unitId=${encodeURIComponent(
            unitId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              "Failed to load topics",
            ),
          );
        }

        const topics = normalizeTopics(data);

        setSubjects((current) =>
          current.map((subject) => {
            if (subject.id !== subjectId) {
              return subject;
            }

            const units = getUnits(subject).map(
              (unit) =>
                unit.id === unitId
                  ? {
                      ...unit,
                      Topic: topics,
                      topics,
                    }
                  : unit,
            );

            return {
              ...subject,
              Unit: units,
              units,
            };
          }),
        );
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Failed to load topics",
        );
      }
    },
    [showToast],
  );

  const fetchResources = useCallback(
    async (
      topicId: string,
      unitId?: string,
      subjectId?: string,
    ) => {
      try {
        const response = await fetch(
          `/api/admin/resources?topicId=${encodeURIComponent(
            topicId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              "Failed to load resources",
            ),
          );
        }

        const resources = normalizeResources(data);

        if (!unitId || !subjectId) {
          return;
        }

        setSubjects((current) =>
          current.map((subject) => {
            if (subject.id !== subjectId) {
              return subject;
            }

            const units = getUnits(subject).map(
              (unit) => {
                if (unit.id !== unitId) {
                  return unit;
                }

                const topics = getTopics(unit).map(
                  (topic) =>
                    topic.id === topicId
                      ? {
                          ...topic,
                          Resource: resources,
                          resources,
                        }
                      : topic,
                );

                return {
                  ...unit,
                  Topic: topics,
                  topics,
                };
              },
            );

            return {
              ...subject,
              Unit: units,
              units,
            };
          }),
        );
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Failed to load resources",
        );
      }
    },
    [showToast],
  );

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  const uploadResourceFile = async (
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<{
    fileKey: string;
    fileType: string;
    fileSize: number;
  }> => {
    if (file.size <= 0) {
      throw new Error("The selected file is empty.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        "File is too large. Maximum allowed size is 100 MB.",
      );
    }

    onProgress?.(0);

    const response = await fetch(
      "/api/upload",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType:
            file.type ||
            "application/octet-stream",
          fileSize: file.size,
        }),
        cache: "no-store",
      },
    );

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Failed to create Supabase upload URL",
        ),
      );
    }

    if (
      !data ||
      typeof data !== "object" ||
      !("signedUrl" in data) ||
      !("publicUrl" in data) ||
      !("path" in data) ||
      !("token" in data)
    ) {
      throw new Error(
        "Supabase returned an invalid upload response.",
      );
    }

    const uploadData = data as {
      signedUrl: string;
      publicUrl: string;
      path: string;
      token: string;
    };

    await new Promise<void>(
      (resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open(
          "PUT",
          uploadData.signedUrl,
          true,
        );

        xhr.upload.addEventListener(
          "progress",
          (event) => {
            if (event.lengthComputable) {
              const progress = Math.round(
                (event.loaded / event.total) *
                  100,
              );

              onProgress?.(progress);
            }
          },
        );

        xhr.addEventListener(
          "load",
          () => {
            if (
              xhr.status >= 200 &&
              xhr.status < 300
            ) {
              onProgress?.(100);
              resolve();
              return;
            }

            let errorMessage =
              `Supabase upload failed (HTTP ${xhr.status})`;

            try {
              const responseBody = JSON.parse(
                xhr.responseText,
              );

              if (
                responseBody?.message
              ) {
                errorMessage =
                  responseBody.message;
              } else if (
                responseBody?.error
              ) {
                errorMessage =
                  responseBody.error;
              }
            } catch {
              // Keep default error.
            }

            reject(
              new Error(errorMessage),
            );
          },
        );

        xhr.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "Network error while uploading to Supabase.",
              ),
            );
          },
        );

        xhr.addEventListener(
          "abort",
          () => {
            reject(
              new Error(
                "Supabase upload was cancelled.",
              ),
            );
          },
        );

        const formData = new FormData();

        formData.append(
          "cacheControl",
          "3600",
        );

        formData.append(
          "",
          file,
        );

        xhr.send(formData);
      },
    );

    return {
      fileKey: uploadData.publicUrl,
      fileType:
        file.type ||
        "application/octet-stream",
      fileSize: file.size,
    };
  };

  const handleCreateSubject = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const title = subjectTitle.trim();

    if (!title) {
      showToast(
        "error",
        "Subject title is required.",
      );
      return;
    }

    setCreating(true);

    try {
      await createSubject(
        title,
        subjectDescription.trim(),
      );

      setSubjectTitle("");
      setSubjectDescription("");
      setShowSubjectForm(false);

      await fetchSubjects();

      showToast(
        "success",
        "Subject created successfully.",
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to create subject.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUnit = async (
    event: FormEvent,
    subjectId: string,
  ) => {
    event.preventDefault();

    const title = unitTitle.trim();

    if (!title) {
      showToast(
        "error",
        "Unit title is required.",
      );
      return;
    }

    setCreating(true);

    try {
      await createUnit(
        subjectId,
        title,
        unitDescription.trim(),
      );

      setUnitTitle("");
      setUnitDescription("");
      setShowUnitForm(null);

      await fetchUnits(subjectId);

      showToast(
        "success",
        "Unit created successfully.",
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to create unit.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreateTopic = async (
    event: FormEvent,
    unitId: string,
    subjectId: string,
  ) => {
    event.preventDefault();

    const title = topicTitle.trim();

    if (!title) {
      showToast(
        "error",
        "Topic title is required.",
      );
      return;
    }

    setCreating(true);

    try {
      await createTopic(
        unitId,
        title,
        topicDescription.trim(),
      );

      setTopicTitle("");
      setTopicDescription("");
      setShowTopicForm(null);

      await fetchTopics(
        unitId,
        subjectId,
      );

      showToast(
        "success",
        "Topic created successfully.",
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to create topic.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreateResource = async (
    event: FormEvent,
    topicId: string,
    unitId: string,
    subjectId: string,
  ) => {
    event.preventDefault();

    const title = newResource.title.trim();

    if (!title) {
      showToast(
        "error",
        "Resource title is required.",
      );
      return;
    }

    setCreating(true);
    setUploadProgress(0);

    try {
      let fileInfo: {
        fileKey: string;
        fileType: string;
        fileSize: number;
      } | null = null;

      if (newResource.file) {
        fileInfo =
          await uploadResourceFile(
            newResource.file,
            setUploadProgress,
          );
      }

      const response = await fetch(
        "/api/admin/resources",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            topicId,
            title,
            description:
              newResource.description.trim(),
            type: newResource.type,
            fileKey:
              fileInfo?.fileKey ?? null,
            fileType:
              fileInfo?.fileType ?? null,
            fileSize:
              fileInfo?.fileSize ?? null,
          }),
        },
      );

      const data =
        await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Failed to create resource.",
          ),
        );
      }

      await fetchResources(
        topicId,
        unitId,
        subjectId,
      );

      setShowResourceForm(null);
      setSelectedResourceTopic(null);
      setNewResource({
        title: "",
        description: "",
        type: "NOTE",
        file: null,
      });
      setUploadProgress(0);

      showToast(
        "success",
        "Resource created successfully.",
      );
    } catch (error) {
      setUploadProgress(0);

      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to create resource.",
      );
    } finally {
      setCreating(false);
    }
  };

  const toggleSubject = async (
    subjectId: string,
  ) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
      setExpandedUnit(null);
      setExpandedTopic(null);
      return;
    }

    setExpandedSubject(subjectId);
    setExpandedUnit(null);
    setExpandedTopic(null);

    const subject = subjects.find(
      (item) => item.id === subjectId,
    );

    if (!subject) return;

    if (getUnits(subject).length === 0) {
      await fetchUnits(subjectId);
    }
  };

  const toggleUnit = async (
    subjectId: string,
    unitId: string,
  ) => {
    if (expandedUnit === unitId) {
      setExpandedUnit(null);
      setExpandedTopic(null);
      return;
    }

    setExpandedSubject(subjectId);
    setExpandedUnit(unitId);
    setExpandedTopic(null);

    const subject = subjects.find(
      (item) => item.id === subjectId,
    );

    const unit = subject
      ? getUnits(subject).find(
          (item) => item.id === unitId,
        )
      : undefined;

    if (!unit) return;

    if (getTopics(unit).length === 0) {
      await fetchTopics(
        unitId,
        subjectId,
      );
    }
  };

  const toggleTopic = async (
    subjectId: string,
    unitId: string,
    topicId: string,
  ) => {
    if (expandedTopic === topicId) {
      setExpandedTopic(null);
      return;
    }

    setExpandedSubject(subjectId);
    setExpandedUnit(unitId);
    setExpandedTopic(topicId);
    setSelectedResourceTopic(
      topicId,
    );

    await fetchResources(
      topicId,
      unitId,
      subjectId,
    );
  };

  const totalSubjects = subjects.length;

  const totalUnits = useMemo(
    () =>
      subjects.reduce(
        (count, subject) =>
          count + getUnits(subject).length,
        0,
      ),
    [subjects],
  );

  const totalTopics = useMemo(
    () =>
      subjects.reduce(
        (subjectCount, subject) =>
          subjectCount +
          getUnits(subject).reduce(
            (unitCount, unit) =>
              unitCount +
              getTopics(unit).length,
            0,
          ),
        0,
      ),
    [subjects],
  );

  const totalResources = useMemo(
    () =>
      subjects.reduce(
        (subjectCount, subject) =>
          subjectCount +
          getUnits(subject).reduce(
            (unitCount, unit) =>
              unitCount +
              getTopics(unit).reduce(
                (topicCount, topic) =>
                  topicCount +
                  getResources(topic)
                    .length,
                0,
              ),
            0,
          ),
        0,
      ),
    [subjects],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {message && (
          <div
            className={`fixed right-5 top-5 z-50 max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Content Management
            </h1>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage subjects, units, topics, and learning resources.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowSubjectForm(
                (current) => !current,
              )
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showSubjectForm
              ? "Close"
              : "Add Subject"}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Subjects
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalSubjects}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Units
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalUnits}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Topics
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalTopics}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Resources
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalResources}
            </div>
          </div>
        </div>

        {showSubjectForm && (
          <form
            onSubmit={handleCreateSubject}
            className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Create Subject
            </h2>

            <div className="grid gap-4 lg:grid-cols-2">
              <input
                value={subjectTitle}
                onChange={(event) =>
                  setSubjectTitle(
                    event.target.value,
                  )
                }
                placeholder="Subject title"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />

              <input
                value={subjectDescription}
                onChange={(event) =>
                  setSubjectDescription(
                    event.target.value,
                  )
                }
                placeholder="Description"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Creating..."
                : "Create Subject"}
            </button>
          </form>
        )}

        {loadingSubjects ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
            Loading content...
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No subjects found.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {subjects
              .slice()
              .sort(
                (a, b) =>
                  (a.order ?? 0) -
                  (b.order ?? 0),
              )
              .map((subject) => (
                <div
                  key={subject.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        void toggleSubject(
                          subject.id,
                        )
                      }
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg text-gray-400">
                          {expandedSubject ===
                          subject.id
                            ? "▼"
                            : "▶"}
                        </span>

                        <div>
                          <h2 className="font-semibold text-gray-900 dark:text-white">
                            {subject.title}
                          </h2>

                          {subject.description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {
                                subject.description
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUnitForm(
                          (current) =>
                            current === subject.id
                              ? null
                              : subject.id,
                        );

                        setUnitTitle("");
                        setUnitDescription("");
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Add Unit
                    </button>
                  </div>

                  {showUnitForm ===
                    subject.id && (
                    <form
                      onSubmit={(event) =>
                        void handleCreateUnit(
                          event,
                          subject.id,
                        )
                      }
                      className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
                    >
                      <div className="grid gap-3 lg:grid-cols-2">
                        <input
                          value={unitTitle}
                          onChange={(
                            event,
                          ) =>
                            setUnitTitle(
                              event.target
                                .value,
                            )
                          }
                          placeholder="Unit title"
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />

                        <input
                          value={
                            unitDescription
                          }
                          onChange={(
                            event,
                          ) =>
                            setUnitDescription(
                              event.target
                                .value,
                            )
                          }
                          placeholder="Unit description"
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={creating}
                        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creating
                          ? "Creating..."
                          : "Create Unit"}
                      </button>
                    </form>
                  )}

                  {expandedSubject ===
                    subject.id && (
                    <div className="border-t border-gray-200 dark:border-gray-800">
                      {loadingContent &&
                      getUnits(subject)
                        .length === 0 ? (
                        <div className="p-6 text-sm text-gray-500">
                          Loading units...
                        </div>
                      ) : (
                        <div className="space-y-3 p-4">
                          {getUnits(subject)
                            .length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
                              No units yet.
                            </div>
                          ) : (
                            getUnits(
                              subject,
                            ).map(
                              (unit) => (
                                <div
                                  key={
                                    unit.id
                                  }
                                  className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                                >
                                  <div className="flex flex-col gap-3 bg-gray-50 p-4 dark:bg-gray-950 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void toggleUnit(
                                          subject.id,
                                          unit.id,
                                        )
                                      }
                                      className="flex-1 text-left"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-400">
                                          {expandedUnit ===
                                          unit.id
                                            ? "▼"
                                            : "▶"}
                                        </span>

                                        <div>
                                          <h3 className="font-medium text-gray-900 dark:text-white">
                                            {
                                              unit.title
                                            }
                                          </h3>

                                          {unit.description && (
                                            <p className="mt-1 text-sm text-gray-500">
                                              {
                                                unit.description
                                              }
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowTopicForm(
                                          (
                                            current,
                                          ) =>
                                            current ===
                                            unit.id
                                              ? null
                                              : unit.id,
                                        );

                                        setTopicTitle(
                                          "",
                                        );
                                        setTopicDescription(
                                          "",
                                        );
                                      }}
                                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                                    >
                                      Add Topic
                                    </button>
                                  </div>

                                  {showTopicForm ===
                                    unit.id && (
                                    <form
                                      onSubmit={(
                                        event,
                                      ) =>
                                        void handleCreateTopic(
                                          event,
                                          unit.id,
                                          subject.id,
                                        )
                                      }
                                      className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                                    >
                                      <div className="grid gap-3 lg:grid-cols-2">
                                        <input
                                          value={
                                            topicTitle
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            setTopicTitle(
                                              event
                                                .target
                                                .value,
                                            )
                                          }
                                          placeholder="Topic title"
                                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        />

                                        <input
                                          value={
                                            topicDescription
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            setTopicDescription(
                                              event
                                                .target
                                                .value,
                                            )
                                          }
                                          placeholder="Topic description"
                                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        />
                                      </div>

                                      <button
                                        type="submit"
                                        disabled={
                                          creating
                                        }
                                        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        {creating
                                          ? "Creating..."
                                          : "Create Topic"}
                                      </button>
                                    </form>
                                  )}

                                  {expandedUnit ===
                                    unit.id && (
                                    <div className="border-t border-gray-200 dark:border-gray-800">
                                      <div className="space-y-3 p-4">
                                        {getTopics(
                                          unit,
                                        ).length ===
                                        0 ? (
                                          <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
                                            No topics yet.
                                          </div>
                                        ) : (
                                          getTopics(
                                            unit,
                                          ).map(
                                            (
                                              topic,
                                            ) => (
                                              <div
                                                key={
                                                  topic.id
                                                }
                                                className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                                              >
                                                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      void toggleTopic(
                                                        subject.id,
                                                        unit.id,
                                                        topic.id,
                                                      )
                                                    }
                                                    className="flex-1 text-left"
                                                  >
                                                    <div className="flex items-center gap-3">
                                                      <span className="text-sm text-gray-400">
                                                        {expandedTopic ===
                                                        topic.id
                                                          ? "▼"
                                                          : "▶"}
                                                      </span>

                                                      <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                          {
                                                            topic.title
                                                          }
                                                        </h4>

                                                        {topic.description && (
                                                          <p className="mt-1 text-sm text-gray-500">
                                                            {
                                                              topic.description
                                                            }
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setShowResourceForm(
                                                        (
                                                          current,
                                                        ) =>
                                                          current ===
                                                          topic.id
                                                            ? null
                                                            : topic.id,
                                                      );

                                                      setSelectedResourceTopic(
                                                        topic.id,
                                                      );

                                                      setNewResource(
                                                        {
                                                          title:
                                                            "",
                                                          description:
                                                            "",
                                                          type:
                                                            "NOTE",
                                                          file: null,
                                                        },
                                                      );

                                                      setUploadProgress(
                                                        0,
                                                      );
                                                    }}
                                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                                  >
                                                    Add Resource
                                                  </button>
                                                </div>

                                                {showResourceForm ===
                                                  topic.id && (
                                                  <form
                                                    onSubmit={(
                                                      event,
                                                    ) =>
                                                      void handleCreateResource(
                                                        event,
                                                        topic.id,
                                                        unit.id,
                                                        subject.id,
                                                      )
                                                    }
                                                    className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
                                                  >
                                                    <div className="grid gap-4">
                                                      <input
                                                        value={
                                                          newResource.title
                                                        }
                                                        onChange={(
                                                          event,
                                                        ) =>
                                                          setNewResource(
                                                            (
                                                              current,
                                                            ) => ({
                                                              ...current,
                                                              title:
                                                                event
                                                                  .target
                                                                  .value,
                                                            }),
                                                          )
                                                        }
                                                        placeholder="Resource title"
                                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                      />

                                                      <textarea
                                                        value={
                                                          newResource.description
                                                        }
                                                        onChange={(
                                                          event,
                                                        ) =>
                                                          setNewResource(
                                                            (
                                                              current,
                                                            ) => ({
                                                              ...current,
                                                              description:
                                                                event
                                                                  .target
                                                                  .value,
                                                            }),
                                                          )
                                                        }
                                                        placeholder="Description"
                                                        rows={
                                                          3
                                                        }
                                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                      />

                                                      <div className="grid gap-4 lg:grid-cols-2">
                                                        <select
                                                          value={
                                                            newResource.type
                                                          }
                                                          onChange={(
                                                            event,
                                                          ) =>
                                                            setNewResource(
                                                              (
                                                                current,
                                                              ) => ({
                                                                ...current,
                                                                type: event
                                                                  .target
                                                                  .value as ResourceType,
                                                              }),
                                                            )
                                                          }
                                                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                        >
                                                          {RESOURCE_TYPES.map(
                                                            (
                                                              type,
                                                            ) => (
                                                              <option
                                                                key={
                                                                  type
                                                                }
                                                                value={
                                                                  type
                                                                }
                                                              >
                                                                {
                                                                  type
                                                                }
                                                              </option>
                                                            ),
                                                          )}
                                                        </select>

                                                        <input
                                                          type="file"
                                                          onChange={(
                                                            event,
                                                          ) => {
                                                            const file =
                                                              event
                                                                .target
                                                                .files?.[0] ??
                                                              null;

                                                            if (
                                                              file &&
                                                              file.size >
                                                                MAX_FILE_SIZE
                                                            ) {
                                                              showToast(
                                                                "error",
                                                                "File is too large. Maximum allowed size is 100 MB.",
                                                              );

                                                              event.target.value =
                                                                "";

                                                              setNewResource(
                                                                (
                                                                  current,
                                                                ) => ({
                                                                  ...current,
                                                                  file: null,
                                                                }),
                                                              );

                                                              return;
                                                            }

                                                            setNewResource(
                                                              (
                                                                current,
                                                              ) => ({
                                                                ...current,
                                                                file,
                                                              }),
                                                            );
                                                          }}
                                                          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                                        />
                                                      </div>

                                                      {newResource.file && (
                                                        <div className="text-sm text-gray-500">
                                                          <span>
                                                            {
                                                              newResource
                                                                .file
                                                                .name
                                                            }
                                                          </span>

                                                          <span className="ml-2">
                                                            (
                                                            {formatBytes(
                                                              newResource
                                                                .file
                                                                .size,
                                                            )}
                                                            )
                                                          </span>
                                                        </div>
                                                      )}

                                                      {creating &&
                                                        newResource.file && (
                                                          <div>
                                                            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                                                              <span>
                                                                Uploading...
                                                              </span>

                                                              <span>
                                                                {
                                                                  uploadProgress
                                                                }
                                                                %
                                                              </span>
                                                            </div>

                                                            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                                                              <div
                                                                className="h-full rounded-full bg-blue-600 transition-all"
                                                                style={{
                                                                  width: `${uploadProgress}%`,
                                                                }}
                                                              />
                                                            </div>
                                                          </div>
                                                        )}

                                                      <div className="flex gap-2">
                                                        <button
                                                          type="submit"
                                                          disabled={
                                                            creating
                                                          }
                                                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                          {creating
                                                            ? newResource.file
                                                              ? "Uploading..."
                                                              : "Creating..."
                                                            : "Create Resource"}
                                                        </button>

                                                        <button
                                                          type="button"
                                                          disabled={
                                                            creating
                                                          }
                                                          onClick={() =>
                                                            setShowResourceForm(
                                                              null,
                                                            )
                                                          }
                                                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                                        >
                                                          Cancel
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </form>
                                                )}

                                                {expandedTopic ===
                                                  topic.id && (
                                                  <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                                                    {getResources(
                                                      topic,
                                                    ).length ===
                                                    0 ? (
                                                      <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
                                                        No resources yet.
                                                      </div>
                                                    ) : (
                                                      <div className="space-y-3">
                                                        {getResources(
                                                          topic,
                                                        ).map(
                                                          (
                                                            resource,
                                                          ) => (
                                                            <div
                                                              key={
                                                                resource.id
                                                              }
                                                              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                                                            >
                                                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                <div className="min-w-0">
                                                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                                                    {
                                                                      resource.title
                                                                    }
                                                                  </h5>

                                                                  {resource.description && (
                                                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                                      {
                                                                        resource.description
                                                                      }
                                                                    </p>
                                                                  )}

                                                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                                                    {resource.type && (
                                                                      <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
                                                                        {
                                                                          resource.type
                                                                        }
                                                                      </span>
                                                                    )}

                                                                    {resource.fileSize && (
                                                                      <span>
                                                                        {formatBytes(
                                                                          resource.fileSize,
                                                                        )}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </div>

                                                                {resource.fileKey && (
                                                                  <div className="flex shrink-0 gap-2">
                                                                    <a
                                                                      href={getResourceOpenUrl(
                                                                        resource.fileKey,
                                                                      )}
                                                                      target="_blank"
                                                                      rel="noreferrer"
                                                                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                                                    >
                                                                      Open
                                                                    </a>

                                                                    <a
                                                                      href={getResourceDownloadUrl(
                                                                        resource.fileKey,
                                                                      )}
                                                                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                                                                    >
                                                                      Download
                                                                    </a>
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    )}

                                                    {selectedResourceTopic ===
                                                      topic.id &&
                                                      getResources(
                                                        topic,
                                                      ).length >
                                                        0 && (
                                                        <div className="mt-4 text-xs text-gray-500">
                                                          Resources loaded
                                                          without a page
                                                          refresh.
                                                        </div>
                                                      )}
                                                  </div>
                                                )}
                                              </div>
                                            ),
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ),
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
        </div>
      </div>
    </div>
  );
}"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ResourceType =
  | "NOTE"
  | "PDF"
  | "VIDEO"
  | "DOCUMENT"
  | "IMAGE"
  | "LINK"
  | "OTHER";

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  fileKey?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt?: string | null;
}

interface Topic {
  id: string;
  title: string;
  description?: string | null;
  order?: number | null;
  Resource?: Resource[];
  resources?: Resource[];
}

interface Unit {
  id: string;
  title: string;
  description?: string | null;
  order?: number | null;
  Topic?: Topic[];
  topics?: Topic[];
}

interface Subject {
  id: string;
  title: string;
  description?: string | null;
  order?: number | null;
  Unit?: Unit[];
  units?: Unit[];
}

interface NewResourceState {
  title: string;
  description: string;
  type: ResourceType;
  file: File | null;
}

const RESOURCE_TYPES: ResourceType[] = [
  "NOTE",
  "PDF",
  "VIDEO",
  "DOCUMENT",
  "IMAGE",
  "LINK",
  "OTHER",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function getUnits(subject: Subject): Unit[] {
  return [...(subject.Unit ?? subject.units ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
}

function getTopics(unit: Unit): Topic[] {
  return [...(unit.Topic ?? unit.topics ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
}

function getResources(topic: Topic): Resource[] {
  return [...(topic.Resource ?? topic.resources ?? [])];
}

function normalizeSubjects(data: unknown): Subject[] {
  if (Array.isArray(data)) return data as Subject[];

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { subjects?: unknown }).subjects)
  ) {
    return (data as { subjects: Subject[] }).subjects;
  }

  return [];
}

function normalizeUnits(data: unknown): Unit[] {
  if (Array.isArray(data)) return data as Unit[];

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { units?: unknown }).units)
  ) {
    return (data as { units: Unit[] }).units;
  }

  return [];
}

function normalizeTopics(data: unknown): Topic[] {
  if (Array.isArray(data)) return data as Topic[];

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { topics?: unknown }).topics)
  ) {
    return (data as { topics: Topic[] }).topics;
  }

  return [];
}

function normalizeResources(data: unknown): Resource[] {
  if (Array.isArray(data)) return data as Resource[];

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { resources?: unknown }).resources)
  ) {
    return (data as { resources: Resource[] }).resources;
  }

  return [];
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isRemoteUrl(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

function getResourceOpenUrl(fileKey: string): string {
  if (isRemoteUrl(fileKey)) {
    return fileKey;
  }

  return `/api/files/${encodeURIComponent(fileKey)}`;
}

function getResourceDownloadUrl(fileKey: string): string {
  if (isRemoteUrl(fileKey)) {
    return `${fileKey}?download=`;
  }

  return `/api/files/${encodeURIComponent(fileKey)}?download=true`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const object = data as {
      error?: unknown;
      message?: unknown;
    };

    if (typeof object.error === "string" && object.error.trim()) {
      return object.error;
    }

    if (
      typeof object.message === "string" &&
      object.message.trim()
    ) {
      return object.message;
    }
  }

  return fallback;
}

async function createSubject(
  title: string,
  description: string,
): Promise<unknown> {
  const response = await fetch("/api/admin/subjects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      description,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        "Failed to create subject",
      ),
    );
  }

  return data;
}

async function createUnit(
  subjectId: string,
  title: string,
  description: string,
): Promise<unknown> {
  const response = await fetch("/api/admin/units", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subjectId,
      title,
      description,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        "Failed to create unit",
      ),
    );
  }

  return data;
}

async function createTopic(
  unitId: string,
  title: string,
  description: string,
): Promise<unknown> {
  const response = await fetch("/api/admin/topics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      unitId,
      title,
      description,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        "Failed to create topic",
      ),
    );
  }

  return data;
}

export default function AdminContentPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  const [expandedSubject, setExpandedSubject] = useState<string | null>(
    null,
  );
  const [expandedUnit, setExpandedUnit] = useState<string | null>(
    null,
  );
  const [expandedTopic, setExpandedTopic] = useState<string | null>(
    null,
  );

  const [selectedResourceTopic, setSelectedResourceTopic] =
    useState<string | null>(null);

  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState<string | null>(null);
  const [showTopicForm, setShowTopicForm] = useState<string | null>(null);
  const [showResourceForm, setShowResourceForm] =
    useState<string | null>(null);

  const [subjectTitle, setSubjectTitle] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");

  const [unitTitle, setUnitTitle] = useState("");
  const [unitDescription, setUnitDescription] = useState("");

  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");

  const [newResource, setNewResource] =
    useState<NewResourceState>({
      title: "",
      description: "",
      type: "NOTE",
      file: null,
    });

  const [creating, setCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const showToast = useCallback(
    (
      type: "success" | "error",
      text: string,
    ) => {
      setMessageType(type);
      setMessage(text);

      window.setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3500);
    },
    [],
  );

  const fetchSubjects = useCallback(async () => {
    setLoadingSubjects(true);

    try {
      const response = await fetch(
        "/api/admin/subjects",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Failed to load subjects",
          ),
        );
      }

      setSubjects(normalizeSubjects(data));
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to load subjects",
      );
    } finally {
      setLoadingSubjects(false);
    }
  }, [showToast]);

  const fetchUnits = useCallback(
    async (subjectId: string) => {
      setLoadingContent(true);

      try {
        const response = await fetch(
          `/api/admin/units?subjectId=${encodeURIComponent(
            subjectId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              "Failed to load units",
            ),
          );
        }

        const units = normalizeUnits(data);

        setSubjects((current) =>
          current.map((subject) =>
            subject.id === subjectId
              ? {
                  ...subject,
                  Unit: units,
                  units,
                }
              : subject,
          ),
        );
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Failed to load units",
        );
      } finally {
        setLoadingContent(false);
      }
    },
    [showToast],
  );

  const fetchTopics = useCallback(
    async (unitId: string, subjectId: string) => {
      try {
        const response = await fetch(
          `/api/admin/topics?unitId=${encodeURIComponent(
            unitId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              "Failed to load topics",
            ),
          );
        }

        const topics = normalizeTopics(data);

        setSubjects((current) =>
          current.map((subject) => {
            if (subject.id !== subjectId) {
              return subject;
            }

            const units = getUnits(subject).map(
              (unit) =>
                unit.id === unitId
                  ? {
                      ...unit,
                      Topic: topics,
                      topics,
                    }
                  : unit,
            );

            return {
              ...subject,
              Unit: units,
              units,
            };
          }),
        );
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Failed to load topics",
        );
      }
    },
    [showToast],
  );

  const fetchResources = useCallback(
    async (
      topicId: string,
      unitId?: string,
      subjectId?: string,
    ) => {
      try {
        const response = await fetch(
          `/api/admin/resources?topicId=${encodeURIComponent(
            topicId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              "Failed to load resources",
            ),
          );
        }

        const resources = normalizeResources(data);

        if (!unitId || !subjectId) {
          return;
        }

        setSubjects((current) =>
          current.map((subject) => {
            if (subject.id !== subjectId) {
              return subject;
            }

            const units = getUnits(subject).map(
              (unit) => {
                if (unit.id !== unitId) {
                  return unit;
                }

                const topics = getTopics(unit).map(
                  (topic) =>
                    topic.id === topicId
                      ? {
                          ...topic,
                          Resource: resources,
                          resources,
                        }
                      : topic,
                );

                return {
                  ...unit,
                  Topic: topics,
                  topics,
                };
              },
            );

            return {
              ...subject,
              Unit: units,
              units,
            };
          }),
        );
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Failed to load resources",
        );
      }
    },
    [showToast],
  );

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  const uploadResourceFile = async (
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<{
    fileKey: string;
    fileType: string;
    fileSize: number;
  }> => {
    if (file.size <= 0) {
      throw new Error("The selected file is empty.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        "File is too large. Maximum allowed size is 100 MB.",
      );
    }

    onProgress?.(0);

    const response = await fetch(
      "/api/upload",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType:
            file.type ||
            "application/octet-stream",
          fileSize: file.size,
        }),
        cache: "no-store",
      },
    );

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Failed to create Supabase upload URL",
        ),
      );
    }

    if (
      !data ||
      typeof data !== "object" ||
      !("signedUrl" in data) ||
      !("publicUrl" in data) ||
      !("path" in data) ||
      !("token" in data)
    ) {
      throw new Error(
        "Supabase returned an invalid upload response.",
      );
    }

    const uploadData = data as {
      signedUrl: string;
      publicUrl: string;
      path: string;
      token: string;
    };

    await new Promise<void>(
      (resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open(
          "PUT",
          uploadData.signedUrl,
          true,
        );

        xhr.upload.addEventListener(
          "progress",
          (event) => {
            if (event.lengthComputable) {
              const progress = Math.round(
                (event.loaded / event.total) *
                  100,
              );

              onProgress?.(progress);
            }
          },
        );

        xhr.addEventListener(
          "load",
          () => {
            if (
              xhr.status >= 200 &&
              xhr.status < 300
            ) {
              onProgress?.(100);
              resolve();
              return;
            }

            let errorMessage =
              `Supabase upload failed (HTTP ${xhr.status})`;

            try {
              const responseBody = JSON.parse(
                xhr.responseText,
              );

              if (
                responseBody?.message
              ) {
                errorMessage =
                  responseBody.message;
              } else if (
                responseBody?.error
              ) {
                errorMessage =
                  responseBody.error;
              }
            } catch {
              // Keep default error.
            }

            reject(
              new Error(errorMessage),
            );
          },
        );

        xhr.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "Network error while uploading to Supabase.",
              ),
            );
          },
        );

        xhr.addEventListener(
          "abort",
          () => {
            reject(
              new Error(
                "Supabase upload was cancelled.",
              ),
            );
          },
        );

        const formData = new FormData();

        formData.append(
          "cacheControl",
          "3600",
        );

        formData.append(
          "",
          file,
        );

        xhr.send(formData);
      },
    );

    return {
      fileKey: uploadData.publicUrl,
      fileType:
        file.type ||
        "application/octet-stream",
      fileSize: file.size,
    };
  };

  const handleCreateSubject = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const title = subjectTitle.trim();

    if (!title) {
      showToast(
        "error",
        "Subject title is required.",
      );
      return;
    }

    setCreating(true);

    try {
      await createSubject(
        title,
        subjectDescription.trim(),
      );

      setSubjectTitle("");
      setSubjectDescription("");
      setShowSubjectForm(false);

      await fetchSubjects();

      showToast(
        "success",
        "Subject created successfully.",
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to create subject.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUnit = async (
    event: FormEvent,
    subjectId: string,
  ) => {
    event.preventDefault();

    const title = unitTitle.trim();

    if (!title) {
      showToast(
        "error",
        "Unit title is required.",
      );
      return;
    }

    setCreating(true);

    try {
      await createUnit(
        subjectId,
        title,
        unitDescription.trim(),
      );

      setUnitTitle("");
      setUnitDescription("");
      setShowUnitForm(null);

      await fetchUnits(subjectId);

      showToast(
        "success",
        "Unit created successfully.",
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to create unit.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreateTopic = async (
    event: FormEvent,
    unitId: string,
    subjectId: string,
  ) => {
    event.preventDefault();

    const title = topicTitle.trim();

    if (!title) {
      showToast(
        "error",
        "Topic title is required.",
      );
      return;
    }

    setCreating(true);

    try {
      await createTopic(
        unitId,
        title,
        topicDescription.trim(),
      );

      setTopicTitle("");
      setTopicDescription("");
      setShowTopicForm(null);

      await fetchTopics(
        unitId,
        subjectId,
      );

      showToast(
        "success",
        "Topic created successfully.",
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to create topic.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreateResource = async (
    event: FormEvent,
    topicId: string,
    unitId: string,
    subjectId: string,
  ) => {
    event.preventDefault();

    const title = newResource.title.trim();

    if (!title) {
      showToast(
        "error",
        "Resource title is required.",
      );
      return;
    }

    setCreating(true);
    setUploadProgress(0);

    try {
      let fileInfo: {
        fileKey: string;
        fileType: string;
        fileSize: number;
      } | null = null;

      if (newResource.file) {
        fileInfo =
          await uploadResourceFile(
            newResource.file,
            setUploadProgress,
          );
      }

      const response = await fetch(
        "/api/admin/resources",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            topicId,
            title,
            description:
              newResource.description.trim(),
            type: newResource.type,
            fileKey:
              fileInfo?.fileKey ?? null,
            fileType:
              fileInfo?.fileType ?? null,
            fileSize:
              fileInfo?.fileSize ?? null,
          }),
        },
      );

      const data =
        await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Failed to create resource.",
          ),
        );
      }

      await fetchResources(
        topicId,
        unitId,
        subjectId,
      );

      setShowResourceForm(null);
      setSelectedResourceTopic(null);
      setNewResource({
        title: "",
        description: "",
        type: "NOTE",
        file: null,
      });
      setUploadProgress(0);

      showToast(
        "success",
        "Resource created successfully.",
      );
    } catch (error) {
      setUploadProgress(0);

      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to create resource.",
      );
    } finally {
      setCreating(false);
    }
  };

  const toggleSubject = async (
    subjectId: string,
  ) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
      setExpandedUnit(null);
      setExpandedTopic(null);
      return;
    }

    setExpandedSubject(subjectId);
    setExpandedUnit(null);
    setExpandedTopic(null);

    const subject = subjects.find(
      (item) => item.id === subjectId,
    );

    if (!subject) return;

    if (getUnits(subject).length === 0) {
      await fetchUnits(subjectId);
    }
  };

  const toggleUnit = async (
    subjectId: string,
    unitId: string,
  ) => {
    if (expandedUnit === unitId) {
      setExpandedUnit(null);
      setExpandedTopic(null);
      return;
    }

    setExpandedSubject(subjectId);
    setExpandedUnit(unitId);
    setExpandedTopic(null);

    const subject = subjects.find(
      (item) => item.id === subjectId,
    );

    const unit = subject
      ? getUnits(subject).find(
          (item) => item.id === unitId,
        )
      : undefined;

    if (!unit) return;

    if (getTopics(unit).length === 0) {
      await fetchTopics(
        unitId,
        subjectId,
      );
    }
  };

  const toggleTopic = async (
    subjectId: string,
    unitId: string,
    topicId: string,
  ) => {
    if (expandedTopic === topicId) {
      setExpandedTopic(null);
      return;
    }

    setExpandedSubject(subjectId);
    setExpandedUnit(unitId);
    setExpandedTopic(topicId);
    setSelectedResourceTopic(
      topicId,
    );

    await fetchResources(
      topicId,
      unitId,
      subjectId,
    );
  };

  const totalSubjects = subjects.length;

  const totalUnits = useMemo(
    () =>
      subjects.reduce(
        (count, subject) =>
          count + getUnits(subject).length,
        0,
      ),
    [subjects],
  );

  const totalTopics = useMemo(
    () =>
      subjects.reduce(
        (subjectCount, subject) =>
          subjectCount +
          getUnits(subject).reduce(
            (unitCount, unit) =>
              unitCount +
              getTopics(unit).length,
            0,
          ),
        0,
      ),
    [subjects],
  );

  const totalResources = useMemo(
    () =>
      subjects.reduce(
        (subjectCount, subject) =>
          subjectCount +
          getUnits(subject).reduce(
            (unitCount, unit) =>
              unitCount +
              getTopics(unit).reduce(
                (topicCount, topic) =>
                  topicCount +
                  getResources(topic)
                    .length,
                0,
              ),
            0,
          ),
        0,
      ),
    [subjects],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {message && (
          <div
            className={`fixed right-5 top-5 z-50 max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Content Management
            </h1>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage subjects, units, topics, and learning resources.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowSubjectForm(
                (current) => !current,
              )
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showSubjectForm
              ? "Close"
              : "Add Subject"}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Subjects
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalSubjects}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Units
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalUnits}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Topics
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalTopics}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Resources
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalResources}
            </div>
          </div>
        </div>

        {showSubjectForm && (
          <form
            onSubmit={handleCreateSubject}
            className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Create Subject
            </h2>

            <div className="grid gap-4 lg:grid-cols-2">
              <input
                value={subjectTitle}
                onChange={(event) =>
                  setSubjectTitle(
                    event.target.value,
                  )
                }
                placeholder="Subject title"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />

              <input
                value={subjectDescription}
                onChange={(event) =>
                  setSubjectDescription(
                    event.target.value,
                  )
                }
                placeholder="Description"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Creating..."
                : "Create Subject"}
            </button>
          </form>
        )}

        {loadingSubjects ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
            Loading content...
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No subjects found.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {subjects
              .slice()
              .sort(
                (a, b) =>
                  (a.order ?? 0) -
                  (b.order ?? 0),
              )
              .map((subject) => (
                <div
                  key={subject.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        void toggleSubject(
                          subject.id,
                        )
                      }
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg text-gray-400">
                          {expandedSubject ===
                          subject.id
                            ? "▼"
                            : "▶"}
                        </span>

                        <div>
                          <h2 className="font-semibold text-gray-900 dark:text-white">
                            {subject.title}
                          </h2>

                          {subject.description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {
                                subject.description
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUnitForm(
                          (current) =>
                            current === subject.id
                              ? null
                              : subject.id,
                        );

                        setUnitTitle("");
                        setUnitDescription("");
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Add Unit
                    </button>
                  </div>

                  {showUnitForm ===
                    subject.id && (
                    <form
                      onSubmit={(event) =>
                        void handleCreateUnit(
                          event,
                          subject.id,
                        )
                      }
                      className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
                    >
                      <div className="grid gap-3 lg:grid-cols-2">
                        <input
                          value={unitTitle}
                          onChange={(
                            event,
                          ) =>
                            setUnitTitle(
                              event.target
                                .value,
                            )
                          }
                          placeholder="Unit title"
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />

                        <input
                          value={
                            unitDescription
                          }
                          onChange={(
                            event,
                          ) =>
                            setUnitDescription(
                              event.target
                                .value,
                            )
                          }
                          placeholder="Unit description"
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={creating}
                        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creating
                          ? "Creating..."
                          : "Create Unit"}
                      </button>
                    </form>
                  )}

                  {expandedSubject ===
                    subject.id && (
                    <div className="border-t border-gray-200 dark:border-gray-800">
                      {loadingContent &&
                      getUnits(subject)
                        .length === 0 ? (
                        <div className="p-6 text-sm text-gray-500">
                          Loading units...
                        </div>
                      ) : (
                        <div className="space-y-3 p-4">
                          {getUnits(subject)
                            .length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
                              No units yet.
                            </div>
                          ) : (
                            getUnits(
                              subject,
                            ).map(
                              (unit) => (
                                <div
                                  key={
                                    unit.id
                                  }
                                  className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                                >
                                  <div className="flex flex-col gap-3 bg-gray-50 p-4 dark:bg-gray-950 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void toggleUnit(
                                          subject.id,
                                          unit.id,
                                        )
                                      }
                                      className="flex-1 text-left"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-400">
                                          {expandedUnit ===
                                          unit.id
                                            ? "▼"
                                            : "▶"}
                                        </span>

                                        <div>
                                          <h3 className="font-medium text-gray-900 dark:text-white">
                                            {
                                              unit.title
                                            }
                                          </h3>

                                          {unit.description && (
                                            <p className="mt-1 text-sm text-gray-500">
                                              {
                                                unit.description
                                              }
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowTopicForm(
                                          (
                                            current,
                                          ) =>
                                            current ===
                                            unit.id
                                              ? null
                                              : unit.id,
                                        );

                                        setTopicTitle(
                                          "",
                                        );
                                        setTopicDescription(
                                          "",
                                        );
                                      }}
                                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                                    >
                                      Add Topic
                                    </button>
                                  </div>

                                  {showTopicForm ===
                                    unit.id && (
                                    <form
                                      onSubmit={(
                                        event,
                                      ) =>
                                        void handleCreateTopic(
                                          event,
                                          unit.id,
                                          subject.id,
                                        )
                                      }
                                      className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                                    >
                                      <div className="grid gap-3 lg:grid-cols-2">
                                        <input
                                          value={
                                            topicTitle
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            setTopicTitle(
                                              event
                                                .target
                                                .value,
                                            )
                                          }
                                          placeholder="Topic title"
                                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        />

                                        <input
                                          value={
                                            topicDescription
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            setTopicDescription(
                                              event
                                                .target
                                                .value,
                                            )
                                          }
                                          placeholder="Topic description"
                                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        />
                                      </div>

                                      <button
                                        type="submit"
                                        disabled={
                                          creating
                                        }
                                        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        {creating
                                          ? "Creating..."
                                          : "Create Topic"}
                                      </button>
                                    </form>
                                  )}

                                  {expandedUnit ===
                                    unit.id && (
                                    <div className="border-t border-gray-200 dark:border-gray-800">
                                      <div className="space-y-3 p-4">
                                        {getTopics(
                                          unit,
                                        ).length ===
                                        0 ? (
                                          <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
                                            No topics yet.
                                          </div>
                                        ) : (
                                          getTopics(
                                            unit,
                                          ).map(
                                            (
                                              topic,
                                            ) => (
                                              <div
                                                key={
                                                  topic.id
                                                }
                                                className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                                              >
                                                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      void toggleTopic(
                                                        subject.id,
                                                        unit.id,
                                                        topic.id,
                                                      )
                                                    }
                                                    className="flex-1 text-left"
                                                  >
                                                    <div className="flex items-center gap-3">
                                                      <span className="text-sm text-gray-400">
                                                        {expandedTopic ===
                                                        topic.id
                                                          ? "▼"
                                                          : "▶"}
                                                      </span>

                                                      <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                          {
                                                            topic.title
                                                          }
                                                        </h4>

                                                        {topic.description && (
                                                          <p className="mt-1 text-sm text-gray-500">
                                                            {
                                                              topic.description
                                                            }
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setShowResourceForm(
                                                        (
                                                          current,
                                                        ) =>
                                                          current ===
                                                          topic.id
                                                            ? null
                                                            : topic.id,
                                                      );

                                                      setSelectedResourceTopic(
                                                        topic.id,
                                                      );

                                                      setNewResource(
                                                        {
                                                          title:
                                                            "",
                                                          description:
                                                            "",
                                                          type:
                                                            "NOTE",
                                                          file: null,
                                                        },
                                                      );

                                                      setUploadProgress(
                                                        0,
                                                      );
                                                    }}
                                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                                  >
                                                    Add Resource
                                                  </button>
                                                </div>

                                                {showResourceForm ===
                                                  topic.id && (
                                                  <form
                                                    onSubmit={(
                                                      event,
                                                    ) =>
                                                      void handleCreateResource(
                                                        event,
                                                        topic.id,
                                                        unit.id,
                                                        subject.id,
                                                      )
                                                    }
                                                    className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
                                                  >
                                                    <div className="grid gap-4">
                                                      <input
                                                        value={
                                                          newResource.title
                                                        }
                                                        onChange={(
                                                          event,
                                                        ) =>
                                                          setNewResource(
                                                            (
                                                              current,
                                                            ) => ({
                                                              ...current,
                                                              title:
                                                                event
                                                                  .target
                                                                  .value,
                                                            }),
                                                          )
                                                        }
                                                        placeholder="Resource title"
                                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                      />

                                                      <textarea
                                                        value={
                                                          newResource.description
                                                        }
                                                        onChange={(
                                                          event,
                                                        ) =>
                                                          setNewResource(
                                                            (
                                                              current,
                                                            ) => ({
                                                              ...current,
                                                              description:
                                                                event
                                                                  .target
                                                                  .value,
                                                            }),
                                                          )
                                                        }
                                                        placeholder="Description"
                                                        rows={
                                                          3
                                                        }
                                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                      />

                                                      <div className="grid gap-4 lg:grid-cols-2">
                                                        <select
                                                          value={
                                                            newResource.type
                                                          }
                                                          onChange={(
                                                            event,
                                                          ) =>
                                                            setNewResource(
                                                              (
                                                                current,
                                                              ) => ({
                                                                ...current,
                                                                type: event
                                                                  .target
                                                                  .value as ResourceType,
                                                              }),
                                                            )
                                                          }
                                                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                        >
                                                          {RESOURCE_TYPES.map(
                                                            (
                                                              type,
                                                            ) => (
                                                              <option
                                                                key={
                                                                  type
                                                                }
                                                                value={
                                                                  type
                                                                }
                                                              >
                                                                {
                                                                  type
                                                                }
                                                              </option>
                                                            ),
                                                          )}
                                                        </select>

                                                        <input
                                                          type="file"
                                                          onChange={(
                                                            event,
                                                          ) => {
                                                            const file =
                                                              event
                                                                .target
                                                                .files?.[0] ??
                                                              null;

                                                            if (
                                                              file &&
                                                              file.size >
                                                                MAX_FILE_SIZE
                                                            ) {
                                                              showToast(
                                                                "error",
                                                                "File is too large. Maximum allowed size is 100 MB.",
                                                              );

                                                              event.target.value =
                                                                "";

                                                              setNewResource(
                                                                (
                                                                  current,
                                                                ) => ({
                                                                  ...current,
                                                                  file: null,
                                                                }),
                                                              );

                                                              return;
                                                            }

                                                            setNewResource(
                                                              (
                                                                current,
                                                              ) => ({
                                                                ...current,
                                                                file,
                                                              }),
                                                            );
                                                          }}
                                                          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                                        />
                                                      </div>

                                                      {newResource.file && (
                                                        <div className="text-sm text-gray-500">
                                                          <span>
                                                            {
                                                              newResource
                                                                .file
                                                                .name
                                                            }
                                                          </span>

                                                          <span className="ml-2">
                                                            (
                                                            {formatBytes(
                                                              newResource
                                                                .file
                                                                .size,
                                                            )}
                                                            )
                                                          </span>
                                                        </div>
                                                      )}

                                                      {creating &&
                                                        newResource.file && (
                                                          <div>
                                                            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                                                              <span>
                                                                Uploading...
                                                              </span>

                                                              <span>
                                                                {
                                                                  uploadProgress
                                                                }
                                                                %
                                                              </span>
                                                            </div>

                                                            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                                                              <div
                                                                className="h-full rounded-full bg-blue-600 transition-all"
                                                                style={{
                                                                  width: `${uploadProgress}%`,
                                                                }}
                                                              />
                                                            </div>
                                                          </div>
                                                        )}

                                                      <div className="flex gap-2">
                                                        <button
                                                          type="submit"
                                                          disabled={
                                                            creating
                                                          }
                                                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                          {creating
                                                            ? newResource.file
                                                              ? "Uploading..."
                                                              : "Creating..."
                                                            : "Create Resource"}
                                                        </button>

                                                        <button
                                                          type="button"
                                                          disabled={
                                                            creating
                                                          }
                                                          onClick={() =>
                                                            setShowResourceForm(
                                                              null,
                                                            )
                                                          }
                                                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                                        >
                                                          Cancel
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </form>
                                                )}

                                                {expandedTopic ===
                                                  topic.id && (
                                                  <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                                                    {getResources(
                                                      topic,
                                                    ).length ===
                                                    0 ? (
                                                      <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
                                                        No resources yet.
                                                      </div>
                                                    ) : (
                                                      <div className="space-y-3">
                                                        {getResources(
                                                          topic,
                                                        ).map(
                                                          (
                                                            resource,
                                                          ) => (
                                                            <div
                                                              key={
                                                                resource.id
                                                              }
                                                              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                                                            >
                                                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                <div className="min-w-0">
                                                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                                                    {
                                                                      resource.title
                                                                    }
                                                                  </h5>

                                                                  {resource.description && (
                                                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                                      {
                                                                        resource.description
                                                                      }
                                                                    </p>
                                                                  )}

                                                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                                                    {resource.type && (
                                                                      <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
                                                                        {
                                                                          resource.type
                                                                        }
                                                                      </span>
                                                                    )}

                                                                    {resource.fileSize && (
                                                                      <span>
                                                                        {formatBytes(
                                                                          resource.fileSize,
                                                                        )}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </div>

                                                                {resource.fileKey && (
                                                                  <div className="flex shrink-0 gap-2">
                                                                    <a
                                                                      href={getResourceOpenUrl(
                                                                        resource.fileKey,
                                                                      )}
                                                                      target="_blank"
                                                                      rel="noreferrer"
                                                                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                                                    >
                                                                      Open
                                                                    </a>

                                                                    <a
                                                                      href={getResourceDownloadUrl(
                                                                        resource.fileKey,
                                                                      )}
                                                                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                                                                    >
                                                                      Download
                                                                    </a>
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    )}

                                                    {selectedResourceTopic ===
                                                      topic.id &&
                                                      getResources(
                                                        topic,
                                                      ).length >
                                                        0 && (
                                                        <div className="mt-4 text-xs text-gray-500">
                                                          Resources loaded
                                                          without a page
                                                          refresh.
                                                        </div>
                                                      )}
                                                  </div>
                                                )}
                                              </div>
                                            ),
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ),
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
        </div>
      </div>
    </div>
  );
}
