const RECENT_OPENED_LIMIT = 5;

function getStorageKey(userId: string) {
  return `ab3_recent_opened_activity_ids_${userId}`;
}

export function getRecentOpenedActivityIds(userId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(getStorageKey(userId));

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((value) => typeof value === "string");
  } catch {
    return [];
  }
}

export function recordRecentActivityOpen(userId: string, activityId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const existingIds = getRecentOpenedActivityIds(userId);

  const updatedIds = [
    activityId,
    ...existingIds.filter((existingId) => existingId !== activityId),
  ].slice(0, RECENT_OPENED_LIMIT);

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(updatedIds));
}