import type { Activity, ActivityCreatorState } from "@/types/activity";

export type SupabaseActivityRow = {
  id: string;

  activity_name: string;
  field_location: string | null;
  game_phase: string | null;
  category: string | null;
  positions_involved: string | null;
  number_of_players: number | null;
  activity_details: string | null;

  created_by: string;
  hidden: boolean;

  activity_source: "import" | "create" | null;
  creator_state: ActivityCreatorState | null;

  file_name: string | null;
  file_type: string | null;
  file_path: string | null;
  file_bucket: string;

  created_at: string;
  updated_at: string;
};

export function supabaseRowToActivity(row: SupabaseActivityRow): Activity {
  return {
    id: row.id,
    activityName: row.activity_name,
    fieldLocation: (row.field_location || "") as Activity["fieldLocation"],
    gamePhase: (row.game_phase || "") as Activity["gamePhase"],
    category: (row.category || "") as Activity["category"],
    positionsInvolved: row.positions_involved || "",
    numberOfPlayers: row.number_of_players ?? "",
    activityDetails: row.activity_details || "",
    createdBy: row.created_by,
    hidden: row.hidden,
    activitySource: row.activity_source || (row.creator_state ? "create" : "import"),
    creatorState: row.creator_state || undefined,
    fileName: row.file_name || undefined,
    fileType: row.file_type || undefined,
    previewDataUrl: undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function activityToSupabaseInsert(
  activity: Activity,
  filePath: string | null
) {
  return {
    activity_name: activity.activityName,
    field_location: activity.fieldLocation || null,
    game_phase: activity.gamePhase || null,
    category: activity.category || null,
    positions_involved: activity.positionsInvolved || null,
    number_of_players:
      activity.numberOfPlayers === "" ? null : Number(activity.numberOfPlayers),
    activity_details: activity.activityDetails || null,

    created_by: activity.createdBy || "Coach User",
    hidden: activity.hidden,

    activity_source: activity.activitySource || (activity.creatorState ? "create" : "import"),
    creator_state: activity.creatorState || null,

    file_name: activity.fileName || null,
    file_type: activity.fileType || null,
    file_path: filePath,
    file_bucket: "activity-files",
  };
}

export function activityToSupabaseUpdate(
  activity: Activity,
  filePath?: string | null
) {
  return {
    activity_name: activity.activityName,
    field_location: activity.fieldLocation || null,
    game_phase: activity.gamePhase || null,
    category: activity.category || null,
    positions_involved: activity.positionsInvolved || null,
    number_of_players:
      activity.numberOfPlayers === "" ? null : Number(activity.numberOfPlayers),
    activity_details: activity.activityDetails || null,

    created_by: activity.createdBy || "Coach User",
    hidden: activity.hidden,

    activity_source: activity.activitySource || (activity.creatorState ? "create" : "import"),
    creator_state: activity.creatorState || null,

    file_name: activity.fileName || null,
    file_type: activity.fileType || null,
    ...(filePath !== undefined ? { file_path: filePath } : {}),
    file_bucket: "activity-files",
  };
}
