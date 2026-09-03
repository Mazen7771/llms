"use client";

import { useEffect, useState } from "react";
import { User, Bell, Paintbrush } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { PremiumInput } from "@/components/ui/PremiumInput";

interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    quizResults: boolean;
    announcements: boolean;
  };
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: {
      email: true,
      push: true,
      quizResults: true,
      announcements: true,
    },
    theme: "system",
    reducedMotion: false,
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/user/profile"), fetch("/api/user/preferences")])
      .then(async ([profileRes, prefRes]) => {
        const [profile, prefs] = await Promise.all([profileRes.json(), prefRes.json()]);
        setName(profile?.name || "");
        setEmail(profile?.email || "");
        if (prefs) setPreferences(prefs);
      })
      .catch(() => {
        // Leave defaults in place on load failure.
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const profileRes = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const prefRes = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (profileRes.ok && prefRes.ok) {
        setMessage("Settings saved successfully!");
      } else {
        setMessage("Failed to save settings. Please try again.");
      }
    } catch {
      setMessage("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: keyof UserPreferences["notifications"]) => {
    setPreferences((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-48 h-8 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="w-64 h-64 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes("success") ? "bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"}`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          <GlassCard variant="default" padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
            </div>
            <div className="space-y-4 max-w-md">
              <PremiumInput
                id="name"
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
              <PremiumInput
                id="email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </GlassCard>

          <GlassCard variant="default" padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: "email" as const, label: "Email notifications", desc: "Receive updates via email" },
                { key: "push" as const, label: "Push notifications", desc: "Get notified in your browser" },
                { key: "quizResults" as const, label: "Quiz results", desc: "Alert when quiz grades are posted" },
                { key: "announcements" as const, label: "Announcements", desc: "Teacher announcements and updates" },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifications[item.key]}
                    onChange={() => togglePref(item.key)}
                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                  />
                </label>
              ))}
            </div>
          </GlassCard>

          <GlassCard variant="default" padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Paintbrush className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white mb-2">Theme</p>
                <div className="grid grid-cols-3 gap-3 max-w-sm">
                  {(["light", "dark", "system"] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setPreferences((prev) => ({ ...prev, theme }))}
                      className={`px-4 py-2 rounded-xl font-medium transition-all ${
                        preferences.theme === theme
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Reduced motion</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Minimize animations and transitions</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.reducedMotion}
                  onChange={() => setPreferences((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }))}
                  className="w-5 h-5 rounded text-primary focus:ring-primary"
                />
              </label>
            </div>
          </GlassCard>

          <div className="flex justify-end">
            <Button variant="primary" onClick={handleSave} loading={saving} size="lg">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}