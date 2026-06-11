import { supabase } from "@/lib/supabaseClient";
import type { Activity } from "@/types/activity";
import {
  activityToSupabaseInsert,
  activityToSupabaseUpdate,
  supabaseRowToActivity,
  type SupabaseActivityRow,
} from "@/types/supabaseActivity";

const ACTIVITY_FILES_BUCKET = "activity-files";

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

  return `activities/${safeActivityName || "activity"}_${timestamp}.${fileExtension}`;
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

export async function uploadActivityFile(activity: Activity) {
  if (!activity.previewDataUrl) {
    return null;
  }

  const fileBlob = dataUrlToBlob(activity.previewDataUrl);
  const filePath = createStorageFilePath(activity);

  const { error } = await supabase.storage
    .from(ACTIVITY_FILES_BUCKET)
    .upload(filePath, fileBlob, {
      contentType: activity.fileType || fileBlob.type,
      upsert: false,
    });

  if (error) {
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
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return undefined;
    }

    throw error;
  }

  const row = data as SupabaseActivityRow;
  const activity = supabaseRowToActivity(row);

  activity.previewDataUrl = getPublicActivityFileUrl(
    row.file_path || undefined
  );

  return activity;
}

export async function createSupabaseActivity(
  activity: Activity
): Promise<Activity> {
  const filePath = await uploadActivityFile(activity);
  const insertValue = activityToSupabaseInsert(activity, filePath);

  const { data, error } = await supabase
    .from("activities")
    .insert(insertValue)
    .select("*")
    .single();

  if (error) {
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
  const updateValue = activityToSupabaseUpdate(activity);

  const { data, error } = await supabase
    .from("activities")
    .update(updateValue)
    .eq("id", activity.id)
    .select("*")
    .single();

  if (error) {
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
  const { data, error } = await supabase
    .from("activities")
    .update({ hidden })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
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
  const { data, error: lookupError } = await supabase
    .from("activities")
    .select("file_path")
    .eq("id", id)
    .single();

  if (lookupError && lookupError.code !== "PGRST116") {
    throw lookupError;
  }

  const row = data as { file_path: string | null } | null;

  const { error: deleteError } = await supabase
    .from("activities")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw deleteError;
  }

  if (row?.file_path) {
    const { error: storageError } = await supabase.storage
      .from(ACTIVITY_FILES_BUCKET)
      .remove([row.file_path]);

    if (storageError) {
      throw storageError;
    }
  }
}