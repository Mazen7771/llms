import { prisma } from "@/lib/prisma";

/**
 * Persistent key-value settings backed by the Setting model.
 * Values are stored as JSON text. getSetting falls back to a default when
 * the key is absent, so settings work even before any value is saved.
 */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (!row) return fallback;
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function getSettings<T extends Record<string, unknown>>(
  keys: string[],
  defaults: T
): Promise<T> {
  const out = { ...defaults } as Record<string, unknown>;
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    for (const row of rows) {
      try {
        out[row.key] = JSON.parse(row.value);
      } catch {
        // keep default on parse error
      }
    }
  } catch {
    // fall back to defaults
  }
  return out as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  const existing = await prisma.setting.findUnique({ where: { key } });
  if (existing) {
    await prisma.setting.update({ where: { key }, data: { value: json } });
  } else {
    await prisma.setting.create({
      data: { id: crypto.randomUUID(), key, value: json },
    });
  }
}

export async function setSettings(entries: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    // eslint-disable-next-line no-await-in-loop
    await setSetting(key, value);
  }
}
