import { supabase } from "@/lib/supabaseClient";
import { syncRecentActivityHistory } from "@/lib/recentActivityViews";
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

  try {
    await syncRecentActivityHistory(user.id);
  } catch (error) {
    console.error("Unable to migrate recent activity history.", error);
  }

  // The inner join filters activities that are no longer visible to this user
  // before applying the limit, using the existing activities RLS policies.
  const { data, error } = await supabase
    .from("recent_activity_views")
    .select("activity_id, last_viewed_at, activities!inner(*)")
    .eq("user_id", user.id)
    .order("last_viewed_at", { ascending: false })
    .order("activity_id", { ascending: true })
    .limit(5);

  if (error) {
    console.error("Unable to load recent opened activities.", error);
    throw error;
  }

  return (data ?? []).flatMap((row) => {
    // PostgREST returns a to-one relationship; also tolerate array inference
    // from the untyped Supabase client.
    const joined = row.activities as unknown as SupabaseActivityRow | SupabaseActivityRow[] | null;
    const activity = Array.isArray(joined) ? joined[0] : joined;
    return activity ? [addPreviewUrl(activity)] : [];
  });
}
