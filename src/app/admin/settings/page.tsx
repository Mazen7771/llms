"use client";

import { useState, Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

const WHATSAPP = "+20 1558371576";
const PHONE = "01154861056";
const EMAIL = "shndqawy@gmail.com";

const copyToClipboard = (text: string, label: string, setToast: React.Dispatch<React.SetStateAction<{ type: "success" | "error"; text: string } | null>>) => {
  navigator.clipboard.writeText(text);
  setToast({ type: "success", text: `${label} copied to clipboard` });
};

const handleSave = async (
  url: string,
  data: Record<string, unknown>,
  successMessage: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setToast: React.Dispatch<React.SetStateAction<{ type: "success" | "error"; text: string } | null>>
) => {
  setLoading(true);
  setToast(null);
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setToast({ type: "success", text: successMessage });
    } else {
      setToast({ type: "error", text: "Failed to save settings" });
    }
  } catch {
    setToast({ type: "error", text: "An unexpected error occurred" });
  } finally {
    setLoading(false);
  }
};

const tabs = [
  {
    value: "general",
    label: "General",
    children: (
      <Card variant="outlined" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">General Settings</h2>
        <GeneralSettingsTab />
      </Card>
    ),
  },
  {
    value: "appearance",
    label: "Appearance",
    children: (
      <Card variant="outlined" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
        <AppearanceSettingsTab />
      </Card>
    ),
  },
  {
    value: "notifications",
    label: "Notifications",
    children: (
      <Card variant="outlined" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Admin Notification Settings</h2>
        <NotificationSettingsTab />
      </Card>
    ),
  },
  {
    value: "help",
    label: "Help & Support",
    children: <HelpSupportTab />,
  },
];

function GeneralSettingsTab() {
  const [settings, setSettings] = useState({
    siteName: "LMS Platform",
    siteDescription: "Biology & Chemistry Learning Platform",
    defaultLanguage: "en",
    timezone: "Africa/Cairo",
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  return (
    <>
      <div className="space-y-4">
        <Input
          id="siteName"
          label="Site Name"
          value={settings.siteName}
          onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
          placeholder="LMS Platform"
        />
        <Input
          id="siteDescription"
          label="Site Description"
          value={settings.siteDescription}
          onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
          placeholder="Biology & Chemistry Learning Platform"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Language</label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="Africa/Cairo">Africa/Cairo (UTC+2)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
        </div>
        <label className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Maintenance Mode</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Restrict access to admin users only</p>
          </div>
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
            className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
          />
        </label>
      </div>
      <div className="flex justify-end mt-6">
        <Button onClick={() => handleSave("/api/admin/settings/general", settings, "General settings saved", setLoading, setToast)} loading={loading}>
          Save General Settings
        </Button>
      </div>
      {toast && <Alert variant={toast.type} dismissible onDismiss={() => setToast(null)}>{toast.text}</Alert>}
    </>
  );
}

function AppearanceSettingsTab() {
  const [settings, setSettings] = useState({
    primaryColor: "#2563eb",
    darkMode: "system",
    logoUrl: "",
    faviconUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  return (
    <>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Color</label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={settings.primaryColor}
              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <input
              type="text"
              value={settings.primaryColor}
              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dark Mode</label>
          <div className="grid grid-cols-3 gap-3">
            {["light", "dark", "system"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSettings({ ...settings, darkMode: mode })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.darkMode === mode
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                aria-pressed={settings.darkMode === mode}
              >
                <div className="font-medium capitalize">{mode}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {mode === "system" ? "Matches system setting" : `${mode.charAt(0).toUpperCase() + mode.slice(1)} mode`}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            id="logoUrl"
            label="Logo URL"
            type="url"
            value={settings.logoUrl}
            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.svg"
          />
          <Input
            id="faviconUrl"
            label="Favicon URL"
            type="url"
            value={settings.faviconUrl}
            onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
            placeholder="https://example.com/favicon.ico"
          />
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <Button onClick={() => handleSave("/api/admin/settings/appearance", settings, "Appearance settings saved", setLoading, setToast)} loading={loading}>
          Save Appearance
        </Button>
      </div>
      {toast && <Alert variant={toast.type} dismissible onDismiss={() => setToast(null)}>{toast.text}</Alert>}
    </>
  );
}

function NotificationSettingsTab() {
  const [settings, setSettings] = useState({
    emailOnNewStudent: true,
    emailOnQuizComplete: true,
    emailOnNewContent: false,
    weeklyReports: true,
    pushEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const options = {
    emailOnNewStudent: { title: "New student registration", description: "Email when a student accepts an invitation" },
    emailOnQuizComplete: { title: "Quiz completion", description: "Email when a student completes a quiz" },
    emailOnNewContent: { title: "New content published", description: "Email when new lessons/resources are added" },
    weeklyReports: { title: "Weekly reports", description: "Receive weekly platform analytics summary" },
    pushEnabled: { title: "Push notifications", description: "Enable browser push notifications for admin" },
  };

  return (
    <>
      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => {
          const opt = options[key as keyof typeof options];
          return (
            <label key={key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{opt.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{opt.description}</p>
              </div>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
              />
            </label>
          );
        })}
      </div>
      <div className="flex justify-end mt-6">
        <Button onClick={() => handleSave("/api/admin/settings/notifications", settings, "Notification settings saved", setLoading, setToast)} loading={loading}>
          Save Notification Settings
        </Button>
      </div>
      {toast && <Alert variant={toast.type} dismissible onDismiss={() => setToast(null)}>{toast.text}</Alert>}
    </>
  );
}

function HelpSupportTab() {
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  return (
    <div className="space-y-6">
      {toast && <Alert variant={toast.type} dismissible onDismiss={() => setToast(null)}>{toast.text}</Alert>}
      <Card variant="outlined" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Help & Support</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Need assistance? Contact our support team.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="elevated" padding="lg" className="text-center">
            <div className="text-4xl mb-3" aria-hidden="true">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">WhatsApp Support</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Chat with us directly on WhatsApp</p>
            <div className="space-y-2 flex flex-col items-center">
              <p className="font-mono text-lg font-medium text-primary">{WHATSAPP}</p>
              <Button variant="outline" onClick={() => window.open(`https://wa.me/${WHATSAPP.replace(/\s+/g, "")}`, "_blank")}>
                Open WhatsApp
              </Button>
              <Button variant="ghost" onClick={() => copyToClipboard(WHATSAPP, "WhatsApp number", setToast)}>
                Copy Number
              </Button>
            </div>
          </Card>
          <Card variant="elevated" padding="lg" className="text-center">
            <div className="text-4xl mb-3" aria-hidden="true">📞</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Phone Support</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Call us during business hours (9 AM - 5 PM)</p>
            <div className="space-y-2 flex flex-col items-center">
              <p className="font-mono text-lg font-medium text-primary">{PHONE}</p>
              <Button variant="outline" onClick={() => window.open(`tel:${PHONE}`, "_self")}>
                Call Now
              </Button>
              <Button variant="ghost" onClick={() => copyToClipboard(PHONE, "Phone number", setToast)}>
                Copy Number
              </Button>
            </div>
          </Card>
          <Card variant="elevated" padding="lg" className="text-center md:col-span-2">
            <div className="text-4xl mb-3" aria-hidden="true">📧</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Support</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Send us an email for detailed inquiries</p>
            <div className="space-y-2 flex flex-col items-center">
              <p className="font-mono text-lg font-medium text-primary">{EMAIL}</p>
              <Button variant="outline" onClick={() => window.open(`mailto:${EMAIL}`, "_self")}>
                Send Email
              </Button>
              <Button variant="ghost" onClick={() => copyToClipboard(EMAIL, "Email address", setToast)}>
                Copy Email
              </Button>
            </div>
          </Card>
        </div>
      </Card>
      <Card variant="outlined" padding="lg" className="bg-gray-50 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Admin Quick Links</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a href="/admin" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <p className="font-medium text-gray-900 dark:text-white">📊 Admin Dashboard</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform overview and stats</p>
          </a>
          <a href="/admin/students" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <p className="font-medium text-gray-900 dark:text-white">👥 Student Management</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Invite and manage students</p>
          </a>
          <a href="/admin/content" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <p className="font-medium text-gray-900 dark:text-white">📚 Content Manager</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage subjects, units, topics, and content</p>
          </a>
        </div>
      </Card>
    </div>
  );
}

function AdminSettingsPageContent() {
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configure platform settings and preferences</p>
      </header>
      {toast && (
        <Alert variant={toast.type} dismissible onDismiss={() => setToast(null)}>
          {toast.text}
        </Alert>
      )}
      <Tabs defaultValue="general">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.children}
            </TabsContent>
          ))}
        </Tabs>
    </div>
  );
}

export default function AdminSettingsPageSuspense() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" aria-busy="true">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
        </div>
      }
    >
      <AdminSettingsPageContent />
    </Suspense>
  );
}