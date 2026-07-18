import { supabase } from "@/lib/supabaseClient";
import type { Activity } from "@/types/activity";
import {
  activityToSupabaseInsert,
  activityToSupabaseUpdate,
  supabaseRowToActivity,
  type SupabaseActivityRow,
} from "@/types/supabaseActivity";

const ACTIVITY_FILES_BUCKET = "activity-files";

async function resolveActivityClubId(activity: Activity) {
  if (activity.visibility !== "club") {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in to share an activity with My Club.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  if (!profile?.club_id) {
    throw new Error("You must be assigned to a club before saving an activity as My Club.");
  }

  return profile.club_id as string;
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");

  if (!header || !base64) {
    throw new Error("Invalid file data.");
  }

  const contentTypeMatch = header.match(/data:(.*);base64/);
  const contentType = contentTypeMatch?.[1] || "application/octet-stream";

  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return new Blob([bytes], { type: contentType });
}

function getFileExtension(fileName: string, fileType?: string) {
  const existingExtension = fileName.split(".").pop();

  if (existingExtension) {
    return existingExtension.toLowerCase();
  }

  if (fileType === "application/pdf") {
    return "pdf";
  }

  if (fileType === "image/png") {
    return "png";
  }

  return "file";
}

function createStorageFilePath(activity: Activity) {
  const fileExtension = getFileExtension(
    activity.fileName || activity.activityName,
    activity.fileType
  );

  const safeActivityName = activity.activityName
    .trim()
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "_")
    .toLowerCase();

  const timestamp = Date.now();

  return `activities/${
    safeActivityName || "activity"
  }_${timestamp}.${fileExtension}`;
}

function isUuid(value: string) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidPattern.test(value);
}

export function getPublicActivityFileUrl(filePath?: string) {
  if (!filePath) {
    return undefined;
  }

  const { data } = supabase.storage
    .from(ACTIVITY_FILES_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

function isDataUrl(value?: string) {
  return Boolean(value && value.startsWith("data:"));
}

export async function uploadActivityFile(activity: Activity) {
  if (!isDataUrl(activity.previewDataUrl)) {
    return null;
  }

  const fileBlob = dataUrlToBlob(activity.previewDataUrl as string);
  const filePath = createStorageFilePath(activity);

  const { error } = await supabase.storage
    .from(ACTIVITY_FILES_BUCKET)
    .upload(filePath, fileBlob, {
      contentType: activity.fileType || fileBlob.type,
      upsert: false,
    });

  if (error) {
    console.error("Supabase storage upload failed:", {
      message: error.message,
      name: error.name,
    });

    throw error;
  }

  return filePath;
}

export async function getSupabaseActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase activities list failed:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return ((data || []) as SupabaseActivityRow[]).map((row) => {
    const activity = supabaseRowToActivity(row);

    activity.previewDataUrl = getPublicActivityFileUrl(
      row.file_path || undefined
    );

    return activity;
  });
}

export async function getSupabaseActivityById(
  id: string
): Promise<Activity | undefined> {
  if (!isUuid(id)) {
    return undefined;
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Supabase activity lookup failed:", {
      id,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  if (!data) {
    return undefined;
  }

  const row = data as SupabaseActivityRow;
  const activity = supabaseRowToActivity(row);

  activity.previewDataUrl = getPublicActivityFileUrl(row.file_path || undefined);

  return activity;
}

export async function createSupabaseActivity(
  activity: Activity
): Promise<Activity> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activityWithCreator: Activity = {
    ...activity,
    createdBy: user?.email || activity.createdBy || "Coach User",
  };

  const clubId = await resolveActivityClubId(activityWithCreator);
  activityWithCreator.clubId = clubId;

  const filePath = await uploadActivityFile(activityWithCreator);
  const insertValue = activityToSupabaseInsert(activityWithCreator, filePath);

  const { data, error } = await supabase
    .from("activities")
    .insert(insertValue)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase activity insert failed:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  const row = data as SupabaseActivityRow;
  const savedActivity = supabaseRowToActivity(row);

  savedActivity.previewDataUrl = getPublicActivityFileUrl(
    row.file_path || undefined
  );

  return savedActivity;
}


export async function duplicateSupabaseActivity(
  sourceActivityId: string
): Promise<Activity> {
  if (!isUuid(sourceActivityId)) {
    throw new Error("Cannot copy Supabase activity because the ID is not a UUID.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("You must be logged in to create a copy.");
  }

  const { data: sourceData, error: sourceError } = await supabase
    .from("activities")
    .select("*")
    .eq("id", sourceActivityId)
    .single();

  if (sourceError) {
    console.error("Supabase activity copy lookup failed:", {
      id: sourceActivityId,
      message: sourceError.message,
      details: sourceError.details,
      hint: sourceError.hint,
      code: sourceError.code,
    });
    throw sourceError;
  }

  const sourceRow = sourceData as SupabaseActivityRow;
  const sourceActivity = supabaseRowToActivity(sourceRow);
  const copiedActivity: Activity = {
    ...sourceActivity,
    id: crypto.randomUUID(),
    activityName: `${sourceActivity.activityName} - Copy`,
    createdBy: user.email,
    hidden: false,
    visibility: "club",
    clubId: null,
    createdAt: undefined,
    updatedAt: undefined,
  };

  copiedActivity.clubId = await resolveActivityClubId(copiedActivity);

  let copiedFilePath: string | null = null;

  if (sourceRow.file_path) {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(ACTIVITY_FILES_BUCKET)
      .download(sourceRow.file_path);

    if (downloadError) {
      console.error("Supabase activity copy file download failed:", {
        filePath: sourceRow.file_path,
        message: downloadError.message,
        name: downloadError.name,
      });
      throw downloadError;
    }

    copiedFilePath = createStorageFilePath(copiedActivity);

    const { error: uploadError } = await supabase.storage
      .from(ACTIVITY_FILES_BUCKET)
      .upload(copiedFilePath, fileBlob, {
        contentType: sourceRow.file_type || fileBlob.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase activity copy file upload failed:", {
        filePath: copiedFilePath,
        message: uploadError.message,
        name: uploadError.name,
      });
      throw uploadError;
    }
  }

  const insertValue = activityToSupabaseInsert(copiedActivity, copiedFilePath);
  const { data, error } = await supabase
    .from("activities")
    .insert(insertValue)
    .select("*")
    .single();

  if (error) {
    if (copiedFilePath) {
      await supabase.storage
        .from(ACTIVITY_FILES_BUCKET)
        .remove([copiedFilePath]);
    }

    console.error("Supabase activity copy insert failed:", {
      sourceActivityId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  const copiedRow = data as SupabaseActivityRow;
  const savedCopy = supabaseRowToActivity(copiedRow);
  savedCopy.previewDataUrl = getPublicActivityFileUrl(
    copiedRow.file_path || undefined
  );

  return savedCopy;
}


export type ActivityPreviewMetadataUpdate = {
  fieldLocation: string;
  gamePhase: string;
  category: string;
  numberOfPlayers: number | "";
  positionsInvolved: string;
  visibility: Activity["visibility"];
};

export async function updateSupabaseActivityPreviewMetadata(
  activityId: string,
  metadata: ActivityPreviewMetadataUpdate
): Promise<Activity> {
  if (!isUuid(activityId)) {
    throw new Error(
      "Cannot update Supabase activity because the ID is not a UUID."
    );
  }

  const currentActivity = await getSupabaseActivityById(activityId);

  if (!currentActivity) {
    throw new Error("The activity could not be found.");
  }

  const updatedActivity: Activity = {
    ...currentActivity,
    fieldLocation: metadata.fieldLocation.trim(),
    gamePhase: metadata.gamePhase.trim(),
    category: metadata.category.trim(),
    numberOfPlayers: metadata.numberOfPlayers,
    positionsInvolved: metadata.positionsInvolved.trim(),
    visibility: metadata.visibility,
  };

  updatedActivity.clubId = await resolveActivityClubId(updatedActivity);

  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("activities")
    .update({
      field_location: updatedActivity.fieldLocation || null,
      game_phase: updatedActivity.gamePhase || null,
      category: updatedActivity.category || null,
      number_of_players:
        updatedActivity.numberOfPlayers === ""
          ? null
          : Number(updatedActivity.numberOfPlayers),
      positions_involved: updatedActivity.positionsInvolved || null,
      visibility: updatedActivity.visibility || "private",
      club_id: updatedActivity.clubId || null,
      updated_at: updatedAt,
    })
    .eq("id", activityId)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase activity preview metadata update failed:", {
      id: activityId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  const row = data as SupabaseActivityRow;
  const savedActivity = supabaseRowToActivity(row);
  savedActivity.previewDataUrl = getPublicActivityFileUrl(
    row.file_path || undefined
  );

  return savedActivity;
}

export async function updateSupabaseActivity(
  activity: Activity
): Promise<Activity> {
  if (!isUuid(activity.id)) {
    throw new Error("Cannot update Supabase activity because the ID is not a UUID.");
  }

  const activityWithClub: Activity = {
    ...activity,
    clubId: await resolveActivityClubId(activity),
  };

  const filePath = isDataUrl(activityWithClub.previewDataUrl)
    ? await uploadActivityFile(activityWithClub)
    : undefined;

  const updateValue = activityToSupabaseUpdate(activityWithClub, filePath);

  const { data, error } = await supabase
    .from("activities")
    .update(updateValue)
    .eq("id", activity.id)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase activity update failed:", {
      id: activity.id,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  const row = data as SupabaseActivityRow;
  const updatedActivity = supabaseRowToActivity(row);

  updatedActivity.previewDataUrl = getPublicActivityFileUrl(
    row.file_path || undefined
  );

  return updatedActivity;
}

export async function updateSupabaseActivityHidden(
  id: string,
  hidden: boolean
): Promise<Activity> {
  if (!isUuid(id)) {
    throw new Error("Cannot update Supabase activity because the ID is not a UUID.");
  }

  const { data, error } = await supabase
    .from("activities")
    .update({ hidden })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase activity hidden update failed:", {
      id,
      hidden,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  const row = data as SupabaseActivityRow;
  const updatedActivity = supabaseRowToActivity(row);

  updatedActivity.previewDataUrl = getPublicActivityFileUrl(
    row.file_path || undefined
  );

  return updatedActivity;
}

export async function deleteSupabaseActivity(id: string): Promise<void> {
  if (!isUuid(id)) {
    throw new Error("Cannot delete Supabase activity because the ID is not a UUID.");
  }

  const { data, error: lookupError } = await supabase
    .from("activities")
    .select("file_path")
    .eq("id", id)
    .single();

  if (lookupError && lookupError.code !== "PGRST116") {
    console.error("Supabase activity delete lookup failed:", {
      id,
      message: lookupError.message,
      details: lookupError.details,
      hint: lookupError.hint,
      code: lookupError.code,
    });

    throw lookupError;
  }

  const row = data as { file_path: string | null } | null;

  const { error: deleteError } = await supabase
    .from("activities")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Supabase activity delete failed:", {
      id,
      message: deleteError.message,
      details: deleteError.details,
      hint: deleteError.hint,
      code: deleteError.code,
    });

    throw deleteError;
  }

  if (row?.file_path) {
    const { error: storageError } = await supabase.storage
      .from(ACTIVITY_FILES_BUCKET)
      .remove([row.file_path]);

    if (storageError) {
      console.error("Supabase storage file delete failed:", {
        filePath: row.file_path,
        message: storageError.message,
        name: storageError.name,
      });

      throw storageError;
    }
  }
}