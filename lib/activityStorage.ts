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

  const existingActivities = getStoredActivities();

  const updatedActivities = [activity, ...existingActivities];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivities));
}

export function getStoredActivityById(id: string): Activity | undefined {
  return getStoredActivities().find((activity) => activity.id === id);
}