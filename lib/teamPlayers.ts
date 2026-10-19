import { supabase } from "@/lib/supabaseClient";

export type TeamPlayer = {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber: number | null;
  primaryPosition: string;
  secondaryPosition: string;
  strengths: string;
  opportunities: string;
  createdAt: string;
  updatedAt: string;
};

export type PlayerNote = {
  id: string;
  playerId: string;
  noteDate: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type PlayerRow = {
  id: string; team_id: string; name: string; jersey_number: number | null;
  primary_position: string | null; secondary_position: string | null;
  strengths: string; opportunities: string; created_at: string; updated_at: string;
};
type NoteRow = {
  id: string; player_id: string; note_date: string; title: string;
  content: string; created_at: string; updated_at: string;
};
const PLAYER_FIELDS = "id, team_id, name, jersey_number, primary_position, secondary_position, strengths, opportunities, created_at, updated_at";
const NOTE_FIELDS = "id, player_id, note_date, title, content, created_at, updated_at";
const toPlayer = (p: PlayerRow): TeamPlayer => ({
  id: p.id, teamId: p.team_id, name: p.name, jerseyNumber: p.jersey_number,
  primaryPosition: p.primary_position ?? "", secondaryPosition: p.secondary_position ?? "",
  strengths: p.strengths ?? "", opportunities: p.opportunities ?? "",
  createdAt: p.created_at, updatedAt: p.updated_at,
});
const toNote = (n: NoteRow): PlayerNote => ({
  id: n.id, playerId: n.player_id, noteDate: n.note_date,
  title: n.title, content: n.content, createdAt: n.created_at, updatedAt: n.updated_at,
});

export async function listTeamPlayers(teamId: string): Promise<TeamPlayer[]> {
  const { data, error } = await supabase.from("team_players").select(PLAYER_FIELDS)
    .eq("team_id", teamId).order("name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as PlayerRow[]).map(toPlayer);
}
export async function getTeamPlayer(teamId: string, playerId: string): Promise<TeamPlayer | null> {
  const { data, error } = await supabase.from("team_players").select(PLAYER_FIELDS)
    .eq("team_id", teamId).eq("id", playerId).maybeSingle();
  if (error) throw error;
  return data ? toPlayer(data as unknown as PlayerRow) : null;
}
export async function createTeamPlayer(teamId: string, name: string): Promise<TeamPlayer> {
  if (!name.trim()) throw new Error("Player name is required.");
  const { data, error } = await supabase.from("team_players")
    .insert({ team_id: teamId, name: name.trim() }).select(PLAYER_FIELDS).single();
  if (error) throw error;
  return toPlayer(data as unknown as PlayerRow);
}
export type PlayerChanges = Pick<TeamPlayer, "name" | "jerseyNumber" | "primaryPosition" | "secondaryPosition" | "strengths" | "opportunities">;
export async function saveTeamPlayer(teamId: string, playerId: string, changes: PlayerChanges): Promise<TeamPlayer> {
  if (!changes.name.trim()) throw new Error("Player name is required.");
  const { data, error } = await supabase.from("team_players").update({
    name: changes.name.trim(), jersey_number: changes.jerseyNumber,
    primary_position: changes.primaryPosition || null, secondary_position: changes.secondaryPosition || null,
    strengths: changes.strengths, opportunities: changes.opportunities,
  }).eq("team_id", teamId).eq("id", playerId).select(PLAYER_FIELDS).single();
  if (error) throw error;
  return toPlayer(data as unknown as PlayerRow);
}
export async function removeTeamPlayer(teamId: string, playerId: string): Promise<void> {
  const { error } = await supabase.from("team_players").delete().eq("team_id", teamId).eq("id", playerId);
  if (error) throw error;
}
export async function listPlayerNotes(playerId: string): Promise<PlayerNote[]> {
  const { data, error } = await supabase.from("player_notes").select(NOTE_FIELDS)
    .eq("player_id", playerId).order("note_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as NoteRow[]).map(toNote);
}
export type NoteChanges = Pick<PlayerNote, "noteDate" | "title" | "content">;
export async function createPlayerNote(playerId: string, changes: NoteChanges): Promise<PlayerNote> {
  if (!changes.title.trim()) throw new Error("Note title is required.");
  const { data, error } = await supabase.from("player_notes")
    .insert({ player_id: playerId, note_date: changes.noteDate, title: changes.title.trim(), content: changes.content })
    .select(NOTE_FIELDS).single();
  if (error) throw error;
  return toNote(data as unknown as NoteRow);
}
export async function savePlayerNote(playerId: string, noteId: string, changes: NoteChanges): Promise<PlayerNote> {
  if (!changes.title.trim()) throw new Error("Note title is required.");
  const { data, error } = await supabase.from("player_notes")
    .update({ note_date: changes.noteDate, title: changes.title.trim(), content: changes.content })
    .eq("player_id", playerId).eq("id", noteId).select(NOTE_FIELDS).single();
  if (error) throw error;
  return toNote(data as unknown as NoteRow);
}
export async function removePlayerNote(playerId: string, noteId: string): Promise<void> {
  const { error } = await supabase.from("player_notes").delete()
    .eq("player_id", playerId).eq("id", noteId);
  if (error) throw error;
}
