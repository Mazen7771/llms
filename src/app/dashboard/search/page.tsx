"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

type ResultType = "subject" | "unit" | "topic" | "resource" | "recording" | "quiz";

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  description?: string;
  subjectName?: string;
  unitName?: string;
  topicName?: string;
  href: string;
}

interface RawResults {
  subjects?: Array<{ id: string; name: string; slug: string }>;
  topics?: Array<{
    id: string;
    name: string;
    Unit?: { name?: string; Subject?: { name?: string; slug?: string } };
  }>;
  quizzes?: Array<{
    id: string;
    title: string;
    Topic?: { name?: string; Unit?: { name?: string; Subject?: { name?: string } } };
  }>;
  recordings?: Array<{
    id: string;
    title: string;
    description?: string | null;
    Topic?: { name?: string; Unit?: { name?: string; Subject?: { name?: string } } };
  }>;
  resources?: Array<{
    id: string;
    title: string;
    description?: string | null;
    fileType?: string | null;
    Topic?: { name?: string; Unit?: { name?: string; Subject?: { name?: string } } };
  }>;
}

function topicNames(t: { name?: string; Unit?: { name?: string; Subject?: { name?: string } } } | undefined) {
  return {
    topicName: t?.name,
    unitName: t?.Unit?.name,
    subjectName: t?.Unit?.Subject?.name,
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentSearches");
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // ignore corrupt localStorage
    }
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data: { results?: RawResults } = await res.json();
      const raw = data.results ?? {};

      const normalized: SearchResult[] = [
        ...(raw.subjects ?? []).map((s) => ({
          type: "subject" as ResultType,
          id: `subject-${s.id}`,
          title: s.name,
          subjectName: s.name,
          href: `/dashboard/content`,
        })),
        ...(raw.topics ?? []).map((t) => ({
          type: "topic" as ResultType,
          id: `topic-${t.id}`,
          title: t.name,
          ...topicNames(t),
          href: `/dashboard/content`,
        })),
        ...(raw.quizzes ?? []).map((q) => ({
          type: "quiz" as ResultType,
          id: `quiz-${q.id}`,
          title: q.title,
          ...topicNames(q.Topic),
          href: `/dashboard/quizzes`,
        })),
        ...(raw.recordings ?? []).map((r) => ({
          type: "recording" as ResultType,
          id: `recording-${r.id}`,
          title: r.title,
          description: r.description ?? undefined,
          ...topicNames(r.Topic),
          href: `/dashboard/content`,
        })),
        ...(raw.resources ?? []).map((r) => ({
          type: "resource" as ResultType,
          id: `resource-${r.id}`,
          title: r.title,
          description: r.description ?? undefined,
          ...topicNames(r.Topic),
          href: `/dashboard/content`,
        })),
      ];

      setResults(normalized);

      const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 5);
      setRecentSearches(updated);
      try {
        localStorage.setItem("recentSearches", JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setError(null);
  };

  const getTypeIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "subject":
        return "📚";
      case "unit":
        return "📖";
      case "topic":
        return "📝";
      case "resource":
        return "📄";
      case "recording":
        return "🎥";
      case "quiz":
        return "❓";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Search</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Find subjects, lessons, resources, and more</p>
        </div>

        <GlassCard variant="default" padding="lg" className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
              placeholder="Search for subjects, topics, resources..."
              className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/5 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {loading && <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-1/4" />}
        </GlassCard>

        {error && (
          <GlassCard variant="default" padding="md" className="text-center text-red-600 dark:text-red-400">
            {error}
          </GlassCard>
        )}

        {query && !error && results.length === 0 && !loading && (
          <GlassCard variant="default" padding="xl" className="text-center">
            <Search className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No results found</h2>
            <p className="text-gray-600 dark:text-gray-400">Try different keywords or check your spelling</p>
          </GlassCard>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Results for "{query}" ({results.length})
            </h2>
            {results.map((result) => (
              <GlassCard key={result.id} variant="default" padding="md" className="flex items-center gap-4">
                <span className="text-2xl" aria-hidden="true">{getTypeIcon(result.type)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">{result.title}</h3>
                  {result.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{result.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                    <span className="capitalize">{result.type}</span>
                    {result.subjectName && (
                      <>
                        <span>·</span>
                        <span>{result.subjectName}</span>
                      </>
                    )}
                    {result.unitName && (
                      <>
                        <span>·</span>
                        <span>{result.unitName}</span>
                      </>
                    )}
                    {result.topicName && (
                      <>
                        <span>·</span>
                        <span>{result.topicName}</span>
                      </>
                    )}
                  </div>
                </div>
                <Link
                  href={result.href}
                  className="inline-flex items-center justify-center font-medium rounded-lg px-3 py-1.5 text-sm gap-1.5 border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  View
                </Link>
              </GlassCard>
            ))}
          </div>
        )}

        {!query && recentSearches.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Searches</h2>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search) => (
                <Button
                  key={search}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery(search);
                    handleSearch(search);
                  }}
                  className="gap-1"
                >
                  <Search className="w-4 h-4" />
                  {search}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
