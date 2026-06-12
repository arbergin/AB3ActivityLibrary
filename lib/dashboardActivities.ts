import { supabase } from "@/lib/supabaseClient";
import { getRecentOpenedActivityIds } from "@/lib/recentActivityViews";
import {
  supabaseRowToActivity,
  type SupabaseActivityRow,
} from "@/types/supabaseActivity";
import { getPublicActivityFileUrl } from "@/lib/supabaseActivities";
import type { Activity } from "@/types/activity";

function addPreviewUrl(row: SupabaseActivityRow): Activity {
  const activity = supabaseRowToActivity(row);

  activity.previewDataUrl = getPublicActivityFileUrl(row.file_path || undefined);

  return activity;
}

export async function getRecentCreatedActivitiesForCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return [];
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("created_by", user.email)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Unable to load recent created activities.", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return ((data || []) as SupabaseActivityRow[]).map(addPreviewUrl);
}

export async function getRecentOpenedActivitiesForCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return [];
  }

  const recentOpenedIds = getRecentOpenedActivityIds(user.id);

  if (recentOpenedIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .in("id", recentOpenedIds);

  if (error) {
    console.error("Unable to load recent opened activities.", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  const activities = ((data || []) as SupabaseActivityRow[]).map(addPreviewUrl);

  return recentOpenedIds
    .map((activityId) =>
      activities.find((activity) => activity.id === activityId)
    )
    .filter((activity): activity is Activity => Boolean(activity))
    .slice(0, 5);
}