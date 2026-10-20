import { supabase } from "@/lib/supabaseClient";

export type MentionPlayer = { id: string; name: string };
export const MENTION_RE = /@\[([^\]]+)\]\(player:([0-9a-f-]{36})\)/gi;
export function getMentionIds(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(MENTION_RE), m => m[2]))];
}
/** Inserts independent copies only for new mentions; never changes existing player notes. */
export async function createMentionNoteCopies(sourceType: "practice" | "game", sourceId: string, text: string): Promise<void> {
  const ids = getMentionIds(text);
  if (!ids.length) return;
  const { error } = await supabase.rpc("copy_mentioned_player_notes", {
    p_source_type: sourceType, p_source_id: sourceId, p_player_ids: ids,
  });
  if (error) throw error;
}
