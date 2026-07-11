import type { Activity } from "@/types/activity";
import type { UserProfile } from "@/lib/userProfile";

function normalizeIdentity(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function isActivityOwner(
  activity: Activity | undefined,
  profile: UserProfile | null | undefined
) {
  if (!activity || !profile) {
    return false;
  }

  const activityOwner = normalizeIdentity(activity.createdBy);
  const profileEmail = normalizeIdentity(profile.email);
  const profileId = normalizeIdentity(profile.id);

  return Boolean(
    activityOwner &&
      (activityOwner === profileEmail || activityOwner === profileId)
  );
}

export function canManageActivity(
  activity: Activity | undefined,
  profile: UserProfile | null | undefined
) {
  if (!activity || !profile) {
    return false;
  }

  if (profile.role === "admin") {
    return true;
  }

  return isActivityOwner(activity, profile);
}
