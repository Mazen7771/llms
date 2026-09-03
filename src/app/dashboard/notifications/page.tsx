"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

interface Notification {
  id: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/user/notifications")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data: { notifications?: Notification[] }) => {
        if (mounted) {
          setNotifications(data.notifications ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      // Only reflect the read state locally if the server confirmed it.
      if (!res.ok) return;
    } catch {
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
    await Promise.all(unreadIds.map((id) => handleMarkRead(id)));
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Stay updated with your learning activities</p>
          </div>
          {notifications.some((n) => !n.readAt) && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <GlassCard variant="default" padding="xl" className="text-center">
            <Bell className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No notifications yet</h2>
            <p className="text-gray-600 dark:text-gray-400">You'll see updates here when you have new activity</p>
            <Link href="/dashboard" className="mt-4 inline-block">
              <Button variant="primary">Go to Dashboard</Button>
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <GlassCard
                key={notification.id}
                variant={notification.readAt ? "subtle" : "default"}
                padding="md"
                className={`flex items-start gap-4 transition-all ${!notification.readAt ? "border-primary/30" : ""}`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white">{notification.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{notification.type.replaceAll("_", " ")}</span>
                    <span>·</span>
                    <time dateTime={notification.createdAt}>
                      {new Date(notification.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </div>
                {!notification.readAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkRead(notification.id)}
                    aria-label="Mark as read"
                  >
                    Mark as read
                  </Button>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}