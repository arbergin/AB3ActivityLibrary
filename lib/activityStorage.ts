import type { Activity } from "@/types/activity";

const STORAGE_KEY = "ab3_activity_library_mock_activities";

function removeFileDataFromActivity(activity: Activity): Activity {
  return {
    ...activity,
    previewDataUrl: undefined,
  };
}

function removeFileDataFromActivities(activities: Activity[]) {
  return activities.map(removeFileDataFromActivity);
}

export function getStoredActivities(): Activity[] {
  if (typeof window === "undefined") return [];

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (!storedValue) return [];

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) return [];

    return removeFileDataFromActivities(parsedValue);
  } catch {
    return [];
  }
}

export function saveStoredActivity(activity: Activity) {
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();

  const activityToSave: Activity = removeFileDataFromActivity({
    ...activity,
    createdAt: activity.createdAt || now,
    updatedAt: activity.updatedAt || now,
  });

  const existingActivities = getStoredActivities();
  const updatedActivities = [activityToSave, ...existingActivities];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivities));
}

export function getStoredActivityById(id: string): Activity | undefined {
  return getStoredActivities().find((activity) => activity.id === id);
}

export function updateStoredActivity(
  updatedActivity: Activity
): Activity | undefined {
  if (typeof window === "undefined") return undefined;

  const existingActivities = getStoredActivities();

  const existingActivity = existingActivities.find(
    (activity) => activity.id === updatedActivity.id
  );

  if (!existingActivity) return undefined;

  const now = new Date().toISOString();

  const activityToSave: Activity = removeFileDataFromActivity({
    ...updatedActivity,
    createdAt: existingActivity.createdAt || updatedActivity.createdAt || now,
    updatedAt: now,
  });

  const updatedActivities = existingActivities.map((activity) =>
    activity.id === updatedActivity.id ? activityToSave : activity
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivities));

  return activityToSave;
}

export function updateStoredActivityHidden(
  id: string,
  hidden: boolean
): Activity | undefined {
  if (typeof window === "undefined") return undefined;

  const existingActivities = getStoredActivities();

  const activityExists = existingActivities.some(
    (activity) => activity.id === id
  );

  if (!activityExists) return undefined;

  let updatedActivity: Activity | undefined;
  const now = new Date().toISOString();

  const updatedActivities = existingActivities.map((activity) => {
    if (activity.id !== id) return activity;

    updatedActivity = removeFileDataFromActivity({
      ...activity,
      hidden,
      updatedAt: now,
    });

    return updatedActivity;
  });

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivities));

  return updatedActivity;
}

export function deleteStoredActivity(id: string): boolean {
  if (typeof window === "undefined") return false;

  const existingActivities = getStoredActivities();

  const activityExists = existingActivities.some(
    (activity) => activity.id === id
  );

  if (!activityExists) return false;

  const updatedActivities = existingActivities.filter(
    (activity) => activity.id !== id
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivities));

  return true;
}

export function clearStoredActivities() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
}

export function getStoredActivitiesSummary() {
  if (typeof window === "undefined") {
    return {
      count: 0,
      storageSizeKb: 0,
    };
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return {
      count: 0,
      storageSizeKb: 0,
    };
  }

  let count = 0;

  try {
    const parsedValue = JSON.parse(storedValue);

    if (Array.isArray(parsedValue)) {
      count = parsedValue.length;
    }
  } catch {
    count = 0;
  }

  return {
    count,
    storageSizeKb: Math.round((storedValue.length / 1024) * 10) / 10,
  };
}