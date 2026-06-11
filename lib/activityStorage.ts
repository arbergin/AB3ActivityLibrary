import type { Activity } from "@/types/activity";

const STORAGE_KEY = "ab3_activity_library_mock_activities";

export function getStoredActivities(): Activity[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue;
  } catch {
    return [];
  }
}

export function saveStoredActivity(activity: Activity) {
  if (typeof window === "undefined") {
    return;
  }

  const now = new Date().toISOString();

  const activityToSave: Activity = {
    ...activity,
    createdAt: activity.createdAt || now,
    updatedAt: activity.updatedAt || now,
  };

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
  if (typeof window === "undefined") {
    return undefined;
  }

  const existingActivities = getStoredActivities();

  const existingActivity = existingActivities.find(
    (activity) => activity.id === updatedActivity.id
  );

  if (!existingActivity) {
    return undefined;
  }

  const now = new Date().toISOString();

  const activityToSave: Activity = {
    ...updatedActivity,
    createdAt: existingActivity.createdAt || updatedActivity.createdAt || now,
    updatedAt: now,
  };

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
  if (typeof window === "undefined") {
    return undefined;
  }

  const existingActivities = getStoredActivities();

  const activityExists = existingActivities.some(
    (activity) => activity.id === id
  );

  if (!activityExists) {
    return undefined;
  }

  let updatedActivity: Activity | undefined;
  const now = new Date().toISOString();

  const updatedActivities = existingActivities.map((activity) => {
    if (activity.id !== id) {
      return activity;
    }

    updatedActivity = {
      ...activity,
      hidden,
      updatedAt: now,
    };

    return updatedActivity;
  });

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivities));

  return updatedActivity;
}

export function deleteStoredActivity(id: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const existingActivities = getStoredActivities();

  const activityExists = existingActivities.some(
    (activity) => activity.id === id
  );

  if (!activityExists) {
    return false;
  }

  const updatedActivities = existingActivities.filter(
    (activity) => activity.id !== id
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivities));

  return true;
}