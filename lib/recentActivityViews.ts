import { supabase } from "@/lib/supabaseClient";

const RECENT_OPENED_LIMIT = 5;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pending = new Map<string, Promise<void>>();

function getStorageKey(userId: string) {
  return `ab3_recent_opened_activity_ids_${userId}`;
}

function getLegacyHistory(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(getStorageKey(userId)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((value): value is string =>
      typeof value === "string" && uuidPattern.test(value)))].slice(0, RECENT_OPENED_LIMIT);
  } catch {
    return [];
  }
}

async function importLegacyHistory(userId: string): Promise<void> {
  const ids = getLegacyHistory(userId);
  if (!ids.length) return;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || user?.id !== userId) return;
  const { error } = await supabase.rpc("ab3_import_recent_activities", {
    p_user_id: userId, p_activity_ids: ids,
  });
  if (error) throw error;
  // Keep the old data until the database confirms the import.
  try {
    if (JSON.stringify(getLegacyHistory(userId)) === JSON.stringify(ids)) {
      window.localStorage.removeItem(getStorageKey(userId));
    }
  } catch { /* Storage can be unavailable; repeated imports are safe. */ }
}

export function recordRecentActivityOpen(userId: string, activityId: string): Promise<void> {
  if (!uuidPattern.test(activityId)) return Promise.resolve();
  const previous = pending.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    // A failed legacy import should not stop a new view from being recorded.
    try { await importLegacyHistory(userId); }
    catch (error) { console.error("Unable to import recent activity history.", error); }
    const { error } = await supabase.rpc("ab3_record_recent_activity", {
      p_user_id: userId, p_activity_id: activityId,
    });
    if (error) throw error;
  });
  pending.set(userId, next);
  const cleanup = () => { if (pending.get(userId) === next) pending.delete(userId); };
  void next.then(cleanup, cleanup);
  return next;
}

export async function syncRecentActivityHistory(userId: string): Promise<void> {
  await pending.get(userId)?.catch(() => undefined);
  await importLegacyHistory(userId);
}
