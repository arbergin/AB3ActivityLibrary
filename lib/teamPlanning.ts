import { supabase } from "@/lib/supabaseClient";

export type PlanningTeam = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanningWeek = {
  id: string;
  teamId: string;
  name: string;
  objectives: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PlanningPractice = {
  id: string;
  weekId: string;
  name: string;
  keyFocus: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PlanningPracticeActivity = {
  id: string;
  practiceId: string;
  activityId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PlanningNote = {
  id: string;
  practiceId: string;
  weekId: string | null;
  afterActivityRowId: string | null;
  noteScope: "week" | "practice" | "activity";
  noteText: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type PlanningTeamRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type PlanningWeekRow = {
  id: string;
  team_id: string;
  name: string;
  objectives: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type PlanningPracticeRow = {
  id: string;
  week_id: string;
  name: string;
  key_focus: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type PlanningPracticeActivityRow = {
  id: string;
  practice_id: string;
  activity_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type PlanningNoteRow = {
  id: string;
  practice_id: string;
  week_id: string | null;
  after_activity_row_id: string | null;
  note_scope: "week" | "practice" | "activity";
  note_text: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function rowToPlanningTeam(row: PlanningTeamRow): PlanningTeam {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPlanningWeek(row: PlanningWeekRow): PlanningWeek {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    objectives: row.objectives ?? "",
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPlanningPractice(row: PlanningPracticeRow): PlanningPractice {
  return {
    id: row.id,
    weekId: row.week_id,
    name: row.name,
    keyFocus: row.key_focus ?? "",
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPlanningPracticeActivity(
  row: PlanningPracticeActivityRow
): PlanningPracticeActivity {
  return {
    id: row.id,
    practiceId: row.practice_id,
    activityId: row.activity_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPlanningNote(row: PlanningNoteRow): PlanningNote {
  return {
    id: row.id,
    practiceId: row.practice_id,
    weekId: row.week_id,
    afterActivityRowId: row.after_activity_row_id,
    noteScope: row.note_scope,
    noteText: row.note_text,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("You must be logged in to use Team Planning.");
  }

  return user.id;
}

export async function getPlanningTeams(): Promise<PlanningTeam[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("planning_teams")
    .select("id, user_id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as PlanningTeamRow[]).map(rowToPlanningTeam);
}

export async function getPlanningTeamById(
  teamId: string
): Promise<PlanningTeam | null> {
  const { data, error } = await supabase
    .from("planning_teams")
    .select("id, user_id, name, created_at, updated_at")
    .eq("id", teamId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return rowToPlanningTeam(data as PlanningTeamRow);
}

export async function createPlanningTeam(name: string): Promise<PlanningTeam> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Team name is required.");

  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("planning_teams")
    .insert({ user_id: userId, name: cleanName })
    .select("id, user_id, name, created_at, updated_at")
    .single();

  if (error) throw error;
  return rowToPlanningTeam(data as PlanningTeamRow);
}

export async function renamePlanningTeam(
  teamId: string,
  name: string
): Promise<PlanningTeam> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Team name is required.");

  const { data, error } = await supabase
    .from("planning_teams")
    .update({ name: cleanName })
    .eq("id", teamId)
    .select("id, user_id, name, created_at, updated_at")
    .single();

  if (error) throw error;
  return rowToPlanningTeam(data as PlanningTeamRow);
}

export async function deletePlanningTeam(teamId: string): Promise<void> {
  const { error } = await supabase
    .from("planning_teams")
    .delete()
    .eq("id", teamId);

  if (error) throw error;
}

async function getNextSortOrder(
  table: "planning_weeks" | "planning_practices" | "planning_practice_activities",
  foreignKey: "team_id" | "week_id" | "practice_id",
  foreignId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select("sort_order")
    .eq(foreignKey, foreignId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) throw error;

  const currentMax = data?.[0]?.sort_order ?? -1;
  return currentMax + 1;
}

export async function getPlanningWeeks(
  teamId: string
): Promise<PlanningWeek[]> {
  const { data, error } = await supabase
    .from("planning_weeks")
    .select("id, team_id, name, objectives, sort_order, created_at, updated_at")
    .eq("team_id", teamId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as PlanningWeekRow[]).map(rowToPlanningWeek);
}

export async function createPlanningWeek(
  teamId: string,
  name = "New Week"
): Promise<PlanningWeek> {
  const sortOrder = await getNextSortOrder(
    "planning_weeks",
    "team_id",
    teamId
  );

  const { data, error } = await supabase
    .from("planning_weeks")
    .insert({
      team_id: teamId,
      name: name.trim() || "New Week",
      sort_order: sortOrder,
    })
    .select("id, team_id, name, objectives, sort_order, created_at, updated_at")
    .single();

  if (error) throw error;

  return rowToPlanningWeek(data as PlanningWeekRow);
}

export async function renamePlanningWeek(
  weekId: string,
  name: string
): Promise<PlanningWeek> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Week name is required.");

  const { data, error } = await supabase
    .from("planning_weeks")
    .update({ name: cleanName })
    .eq("id", weekId)
    .select("id, team_id, name, objectives, sort_order, created_at, updated_at")
    .single();

  if (error) throw error;
  return rowToPlanningWeek(data as PlanningWeekRow);
}

export async function updatePlanningWeekObjectives(
  weekId: string,
  objectives: string
): Promise<PlanningWeek> {
  const { data, error } = await supabase
    .from("planning_weeks")
    .update({ objectives: objectives.trim() || null })
    .eq("id", weekId)
    .select("id, team_id, name, objectives, sort_order, created_at, updated_at")
    .single();

  if (error) throw error;

  return rowToPlanningWeek(data as PlanningWeekRow);
}

export async function deletePlanningWeek(weekId: string): Promise<void> {
  const { error } = await supabase
    .from("planning_weeks")
    .delete()
    .eq("id", weekId);

  if (error) throw error;
}

export async function getPlanningPractices(
  weekIds: string[]
): Promise<PlanningPractice[]> {
  if (weekIds.length === 0) return [];

  const { data, error } = await supabase
    .from("planning_practices")
    .select("id, week_id, name, key_focus, sort_order, created_at, updated_at")
    .in("week_id", weekIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as PlanningPracticeRow[]).map(rowToPlanningPractice);
}

export async function createPlanningPractice(
  weekId: string,
  name = "New Practice"
): Promise<PlanningPractice> {
  const sortOrder = await getNextSortOrder(
    "planning_practices",
    "week_id",
    weekId
  );

  const { data, error } = await supabase
    .from("planning_practices")
    .insert({
      week_id: weekId,
      name: name.trim() || "New Practice",
      sort_order: sortOrder,
    })
    .select("id, week_id, name, key_focus, sort_order, created_at, updated_at")
    .single();

  if (error) throw error;
  return rowToPlanningPractice(data as PlanningPracticeRow);
}

export async function renamePlanningPractice(
  practiceId: string,
  name: string
): Promise<PlanningPractice> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Practice name is required.");

  const { data, error } = await supabase
    .from("planning_practices")
    .update({ name: cleanName })
    .eq("id", practiceId)
    .select("id, week_id, name, key_focus, sort_order, created_at, updated_at")
    .single();

  if (error) throw error;
  return rowToPlanningPractice(data as PlanningPracticeRow);
}

export async function updatePlanningPracticeKeyFocus(
  practiceId: string,
  keyFocus: string
): Promise<PlanningPractice> {
  const { data, error } = await supabase
    .from("planning_practices")
    .update({ key_focus: keyFocus.trim() || null })
    .eq("id", practiceId)
    .select("id, week_id, name, key_focus, sort_order, created_at, updated_at")
    .single();

  if (error) throw error;

  return rowToPlanningPractice(data as PlanningPracticeRow);
}

export async function deletePlanningPractice(
  practiceId: string
): Promise<void> {
  const { error } = await supabase
    .from("planning_practices")
    .delete()
    .eq("id", practiceId);

  if (error) throw error;
}

export async function getPlanningPracticeActivities(
  practiceIds: string[]
): Promise<PlanningPracticeActivity[]> {
  if (practiceIds.length === 0) return [];

  const { data, error } = await supabase
    .from("planning_practice_activities")
    .select("id, practice_id, activity_id, sort_order, created_at, updated_at")
    .in("practice_id", practiceIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as PlanningPracticeActivityRow[]).map(
    rowToPlanningPracticeActivity
  );
}

export async function createPlanningActivitySlot(
  practiceId: string
): Promise<PlanningPracticeActivity> {
  const sortOrder = await getNextSortOrder(
    "planning_practice_activities",
    "practice_id",
    practiceId
  );

  const { data, error } = await supabase
    .from("planning_practice_activities")
    .insert({
      practice_id: practiceId,
      activity_id: null,
      sort_order: sortOrder,
    })
    .select("id, practice_id, activity_id, sort_order, created_at, updated_at")
    .single();

  if (error) throw error;

  return rowToPlanningPracticeActivity(data as PlanningPracticeActivityRow);
}

export async function assignActivityToPlanningRow(
  rowId: string,
  activityId: string
): Promise<PlanningPracticeActivity> {
  const { data, error } = await supabase
    .from("planning_practice_activities")
    .update({ activity_id: activityId })
    .eq("id", rowId)
    .select("id, practice_id, activity_id, sort_order, created_at, updated_at")
    .single();

  if (error) throw error;

  return rowToPlanningPracticeActivity(
    data as PlanningPracticeActivityRow
  );
}

export async function clearActivityFromPlanningRow(
  rowId: string
): Promise<PlanningPracticeActivity> {
  const { data, error } = await supabase
    .from("planning_practice_activities")
    .update({ activity_id: null })
    .eq("id", rowId)
    .select("id, practice_id, activity_id, sort_order, created_at, updated_at")
    .single();

  if (error) throw error;

  return rowToPlanningPracticeActivity(
    data as PlanningPracticeActivityRow
  );
}

export async function getPlanningNotes(
  practiceIds: string[]
): Promise<PlanningNote[]> {
  if (practiceIds.length === 0) return [];

  const { data, error } = await supabase
    .from("planning_notes")
    .select(
      "id, practice_id, week_id, after_activity_row_id, note_scope, note_text, sort_order, created_at, updated_at"
    )
    .in("practice_id", practiceIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as PlanningNoteRow[]).map(rowToPlanningNote);
}

export async function createPlanningNote(
  practiceId: string,
  afterActivityRowId: string | null,
  noteScope: "week" | "practice" | "activity",
  weekId: string | null = null
): Promise<PlanningNote> {
  const { data: existing, error: existingError } = await supabase
    .from("planning_notes")
    .select("sort_order")
    .eq("practice_id", practiceId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (existingError) throw existingError;

  const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("planning_notes")
    .insert({
      practice_id: practiceId,
      week_id: weekId,
      after_activity_row_id: afterActivityRowId,
      note_scope: noteScope,
      note_text: "",
      sort_order: sortOrder,
    })
    .select(
      "id, practice_id, week_id, after_activity_row_id, note_scope, note_text, sort_order, created_at, updated_at"
    )
    .single();

  if (error) throw error;

  return rowToPlanningNote(data as PlanningNoteRow);
}

export async function updatePlanningNote(
  noteId: string,
  noteText: string
): Promise<PlanningNote> {
  const { data, error } = await supabase
    .from("planning_notes")
    .update({ note_text: noteText })
    .eq("id", noteId)
    .select(
      "id, practice_id, week_id, after_activity_row_id, note_scope, note_text, sort_order, created_at, updated_at"
    )
    .single();

  if (error) throw error;

  return rowToPlanningNote(data as PlanningNoteRow);
}

export async function deletePlanningNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from("planning_notes")
    .delete()
    .eq("id", noteId);

  if (error) throw error;
}

export async function deletePlanningPracticeActivity(
  rowId: string
): Promise<void> {
  const { error } = await supabase
    .from("planning_practice_activities")
    .delete()
    .eq("id", rowId);

  if (error) throw error;
}
export type PlanningPracticeOrderUpdate = {
  id: string;
  weekId: string;
  sortOrder: number;
};

export type PlanningActivityOrderUpdate = {
  id: string;
  practiceId: string;
  sortOrder: number;
};

/**
 * Persists practice ordering, including moves between weeks. Week-level notes
 * are re-anchored to the final practice in their week so they continue to
 * render in the correct location after a reorder.
 */
export async function reorderPlanningPractices(
  updates: PlanningPracticeOrderUpdate[]
): Promise<void> {
  if (updates.length === 0) return;

  const results = await Promise.all(
    updates.map((update) =>
      supabase
        .from("planning_practices")
        .update({
          week_id: update.weekId,
          sort_order: update.sortOrder,
        })
        .eq("id", update.id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const finalPracticeByWeek = new Map<string, PlanningPracticeOrderUpdate>();

  for (const update of updates) {
    const current = finalPracticeByWeek.get(update.weekId);
    if (!current || update.sortOrder > current.sortOrder) {
      finalPracticeByWeek.set(update.weekId, update);
    }
  }

  const noteResults = await Promise.all(
    Array.from(finalPracticeByWeek.entries()).map(([weekId, lastPractice]) =>
      supabase
        .from("planning_notes")
        .update({ practice_id: lastPractice.id })
        .eq("note_scope", "week")
        .eq("week_id", weekId)
    )
  );

  const failedNoteUpdate = noteResults.find((result) => result.error);
  if (failedNoteUpdate?.error) throw failedNoteUpdate.error;
}

/**
 * Persists activity-row ordering, including moves between practices. Notes
 * attached to an activity row follow that row into its destination practice.
 */
export async function reorderPlanningPracticeActivities(
  updates: PlanningActivityOrderUpdate[]
): Promise<void> {
  if (updates.length === 0) return;

  const results = await Promise.all(
    updates.map((update) =>
      supabase
        .from("planning_practice_activities")
        .update({
          practice_id: update.practiceId,
          sort_order: update.sortOrder,
        })
        .eq("id", update.id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const noteResults = await Promise.all(
    updates.map((update) =>
      supabase
        .from("planning_notes")
        .update({ practice_id: update.practiceId })
        .eq("note_scope", "activity")
        .eq("after_activity_row_id", update.id)
    )
  );

  const failedNoteUpdate = noteResults.find((result) => result.error);
  if (failedNoteUpdate?.error) throw failedNoteUpdate.error;
}
