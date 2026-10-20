import { supabase } from "@/lib/supabaseClient";

export type TeamGame = {
  id: string;
  teamId: string;
  gameDate: string;
  opponentName: string;
  yourGoals: number | null;
  opponentGoals: number | null;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GameChanges = Pick<TeamGame, "gameDate" | "opponentName" | "yourGoals" | "opponentGoals" | "notes">;

type GameRow = {
  id: string; team_id: string; game_date: string; opponent_name: string;
  your_goals: number | null; opponent_goals: number | null;
  notes: string | null; is_active: boolean; created_at: string; updated_at: string;
};
const FIELDS = "id, team_id, game_date, opponent_name, your_goals, opponent_goals, notes, is_active, created_at, updated_at";
const fromRow = (r: GameRow): TeamGame => ({
  id: r.id, teamId: r.team_id, gameDate: r.game_date, opponentName: r.opponent_name,
  yourGoals: r.your_goals, opponentGoals: r.opponent_goals, notes: r.notes ?? "",
  isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at,
});

async function ownerId(teamId: string): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Please sign in to manage games.");
  const { data, error } = await supabase.from("planning_teams")
    .select("id").eq("id", teamId).eq("user_id", user.id).eq("is_active", true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Team not found or access denied.");
  return user.id;
}

function validated(input: GameChanges) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.gameDate)) throw new Error("Choose a game date.");
  if (!input.opponentName.trim()) throw new Error("Opponent name is required.");
  const score = (v: number | null, label: string) => {
    if (v === null) return null;
    if (!Number.isSafeInteger(v) || v < 0) throw new Error(`${label} must be a nonnegative whole number.`);
    return v;
  };
  const your = score(input.yourGoals, "Your goals");
  const their = score(input.opponentGoals, "Opponent goals");
  if ((your === null) !== (their === null)) throw new Error("Enter both scores or leave both blank.");
  return { game_date: input.gameDate, opponent_name: input.opponentName.trim(), your_goals: your, opponent_goals: their, notes: input.notes };
}

export function gameResult(game: Pick<TeamGame, "yourGoals" | "opponentGoals">): "Win" | "Loss" | "Tie" | "—" {
  if (game.yourGoals === null || game.opponentGoals === null) return "—";
  return game.yourGoals > game.opponentGoals ? "Win" : game.yourGoals < game.opponentGoals ? "Loss" : "Tie";
}

export async function listTeamGames(teamId: string, inactive = false): Promise<TeamGame[]> {
  await ownerId(teamId);
  const { data, error } = await supabase.from("team_games").select(FIELDS)
    .eq("team_id", teamId).eq("is_active", !inactive)
    .order("game_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as GameRow[]).map(fromRow);
}

export async function createTeamGame(teamId: string, input: GameChanges): Promise<TeamGame> {
  await ownerId(teamId);
  const { data, error } = await supabase.from("team_games")
    .insert({ ...validated(input), team_id: teamId }).select(FIELDS).single();
  if (error) throw error;
  return fromRow(data as unknown as GameRow);
}

export async function updateTeamGame(teamId: string, gameId: string, input: GameChanges): Promise<TeamGame> {
  await ownerId(teamId);
  const { data, error } = await supabase.from("team_games")
    .update(validated(input)).eq("id", gameId).eq("team_id", teamId).eq("is_active", true)
    .select(FIELDS).single();
  if (error) throw error;
  return fromRow(data as unknown as GameRow);
}

export async function renameTeamGame(teamId: string, gameId: string, opponentName: string): Promise<TeamGame> {
  await ownerId(teamId);
  if (!opponentName.trim()) throw new Error("Opponent name is required.");
  const { data, error } = await supabase.from("team_games")
    .update({ opponent_name: opponentName.trim() }).eq("id", gameId).eq("team_id", teamId).eq("is_active", true)
    .select(FIELDS).single();
  if (error) throw error;
  return fromRow(data as unknown as GameRow);
}

export async function archiveTeamGame(teamId: string, gameId: string): Promise<void> {
  await ownerId(teamId);
  const { data, error } = await supabase.from("team_games")
    .update({ is_active: false }).eq("id", gameId).eq("team_id", teamId).eq("is_active", true)
    .select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Game is no longer active.");
}

export async function restoreTeamGame(teamId: string, gameId: string): Promise<TeamGame> {
  await ownerId(teamId);
  const { data, error } = await supabase.from("team_games")
    .update({ is_active: true }).eq("id", gameId).eq("team_id", teamId).eq("is_active", false)
    .select(FIELDS).single();
  if (error) throw error;
  return fromRow(data as unknown as GameRow);
}

export async function permanentlyDeleteTeamGame(teamId: string, gameId: string): Promise<void> {
  await ownerId(teamId);
  const { data: existing, error: checkError } = await supabase.from("team_games")
    .select("id, is_active").eq("id", gameId).eq("team_id", teamId).maybeSingle();
  if (checkError) throw checkError;
  if (!existing) throw new Error("Game not found or access denied.");
  if (existing.is_active !== false) throw new Error("Only inactive games can be permanently deleted.");
  const { data, error } = await supabase.from("team_games").delete()
    .eq("id", gameId).eq("team_id", teamId).eq("is_active", false).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Game was not deleted. Its status may have changed.");
}
