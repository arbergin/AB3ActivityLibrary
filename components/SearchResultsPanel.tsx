"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteStoredActivity,
  getStoredActivities,
  updateStoredActivityHidden,
} from "@/lib/activityStorage";
import { downloadActivityAsPdf } from "@/lib/downloadActivityPdf";
import {
  deleteSupabaseActivity,
  getSupabaseActivities,
  updateSupabaseActivityHidden,
} from "@/lib/supabaseActivities";
import type { Activity } from "@/types/activity";
import type {
  SearchFilterValues,
  SearchSortValue,
} from "@/components/SearchPageClient";

type SearchResultsPanelProps = {
  includeHidden: boolean;
  filters: SearchFilterValues;
  sortValue: SearchSortValue;
  hasSearched: boolean;
  refreshKey: number;
};

type ActivitySource = "supabase" | "local";

type ActivityWithSource = Activity & {
  source: ActivitySource;
};

function isUuid(value: string) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

  return uuidPattern.test(value);
}

function safeLower(value?: string | number | null) {
  return String(value ?? "").toLowerCase();
}

function numberOfPlayersMatchesFilter(
  activityPlayerCount: number | "",
  filterValue: string
) {
  const cleanedFilter = filterValue.trim().toLowerCase();

  if (!cleanedFilter) return true;
  if (activityPlayerCount === "") return false;

  const playerCount = Number(activityPlayerCount);

  if (Number.isNaN(playerCount)) return false;

  if (cleanedFilter.endsWith("+")) {
    const minimum = Number(cleanedFilter.replace("+", ""));
    if (Number.isNaN(minimum)) return false;
    return playerCount >= minimum;
  }

  if (cleanedFilter.startsWith(">=")) {
    const minimum = Number(cleanedFilter.replace(">=", ""));
    if (Number.isNaN(minimum)) return false;
    return playerCount >= minimum;
  }

  if (cleanedFilter.startsWith(">")) {
    const minimum = Number(cleanedFilter.replace(">", ""));
    if (Number.isNaN(minimum)) return false;
    return playerCount > minimum;
  }

  if (cleanedFilter.startsWith("<=")) {
    const maximum = Number(cleanedFilter.replace("<=", ""));
    if (Number.isNaN(maximum)) return false;
    return playerCount <= maximum;
  }

  if (cleanedFilter.startsWith("<")) {
    const maximum = Number(cleanedFilter.replace("<", ""));
    if (Number.isNaN(maximum)) return false;
    return playerCount < maximum;
  }

  const rangeParts = cleanedFilter.includes(" to ")
    ? cleanedFilter.split(" to ")
    : cleanedFilter.split("-");

  if (rangeParts.length === 2) {
    const minimum = Number(rangeParts[0].trim());
    const maximum = Number(rangeParts[1].trim());

    if (Number.isNaN(minimum) || Number.isNaN(maximum)) return false;

    return playerCount >= minimum && playerCount <= maximum;
  }

  const exactNumber = Number(cleanedFilter);

  if (Number.isNaN(exactNumber)) return false;

  return playerCount === exactNumber;
}

function getCreatedAtTime(activity: Activity) {
  if (!activity.createdAt) return 0;

  const createdAtTime = new Date(activity.createdAt).getTime();

  if (Number.isNaN(createdAtTime)) return 0;

  return createdAtTime;
}

function getUpdatedAtTime(activity: Activity) {
  if (!activity.updatedAt) return 0;

  const updatedAtTime = new Date(activity.updatedAt).getTime();

  if (Number.isNaN(updatedAtTime)) return 0;

  return updatedAtTime;
}

function getPlayerCountForSort(activity: Activity) {
  if (activity.numberOfPlayers === "") return 0;
  return Number(activity.numberOfPlayers);
}

function formatDate(dateValue?: string) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function removeDuplicateActivities(activities: ActivityWithSource[]) {
  const activityMap = new Map<string, ActivityWithSource>();

  activities.forEach((activity) => {
    if (!activityMap.has(activity.id)) {
      activityMap.set(activity.id, activity);
    }
  });

  return Array.from(activityMap.values());
}

function getFreshLocalActivities() {
  return getStoredActivities()
    .filter((activity) => !isUuid(activity.id))
    .map((activity) => ({
      ...activity,
      source: "local" as const,
    }));
}

function PreviewFallback() {
  return (
    <div className="flex min-h-64 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      <div>
        Preview unavailable
        <div className="mt-2 text-xs">
          The activity metadata exists, but the preview file could not be loaded.
        </div>
      </div>
    </div>
  );
}

export default function SearchResultsPanel({
  includeHidden,
  filters,
  sortValue,
  hasSearched,
  refreshKey,
}: SearchResultsPanelProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityWithSource[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<
    ActivityWithSource | undefined
  >(undefined);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [selectedPreviewFailed, setSelectedPreviewFailed] = useState(false);

  const loadActivities = useCallback(async () => {
    setIsLoadingActivities(true);

    try {
      const supabaseActivities = await getSupabaseActivities();

      const supabaseActivitiesWithSource: ActivityWithSource[] =
        supabaseActivities.map((activity) => ({
          ...activity,
          source: "supabase",
        }));

      const combinedActivities = removeDuplicateActivities([
        ...supabaseActivitiesWithSource,
        ...getFreshLocalActivities(),
      ]);

      setActivities(combinedActivities);
      setActionMessage("");
    } catch (error) {
      console.error("Unable to load activities from Supabase.", error);

      setActivities(getFreshLocalActivities());
      setActionMessage(
        "Supabase activities could not be loaded. Showing local-only activities."
      );
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  const searchableActivities = useMemo(() => {
    if (includeHidden) return activities;
    return activities.filter((activity) => !activity.hidden);
  }, [activities, includeHidden]);

  const filteredActivities = useMemo(() => {
    if (!hasSearched) return [];

    return searchableActivities.filter((activity) => {
      const activityNameMatches = safeLower(activity.activityName).includes(
        filters.activityName.toLowerCase().trim()
      );

      const fieldLocationMatches =
        !filters.fieldLocation || activity.fieldLocation === filters.fieldLocation;

      const gamePhaseMatches =
        !filters.gamePhase || activity.gamePhase === filters.gamePhase;

      const categoryMatches =
        !filters.category || activity.category === filters.category;

      const positionsMatch = safeLower(activity.positionsInvolved).includes(
        filters.positionsInvolved.toLowerCase().trim()
      );

      const numberOfPlayersMatches = numberOfPlayersMatchesFilter(
        activity.numberOfPlayers,
        filters.numberOfPlayers
      );

      const detailsMatch = safeLower(activity.activityDetails).includes(
        filters.activityDetails.toLowerCase().trim()
      );

      return (
        activityNameMatches &&
        fieldLocationMatches &&
        gamePhaseMatches &&
        categoryMatches &&
        positionsMatch &&
        numberOfPlayersMatches &&
        detailsMatch
      );
    });
  }, [hasSearched, searchableActivities, filters]);

  const visibleActivities = useMemo(() => {
    return [...filteredActivities].sort((activityA, activityB) => {
      if (sortValue === "activityNameAsc") {
        return activityA.activityName.localeCompare(activityB.activityName);
      }

      if (sortValue === "activityNameDesc") {
        return activityB.activityName.localeCompare(activityA.activityName);
      }

      if (sortValue === "newestFirst") {
        return getCreatedAtTime(activityB) - getCreatedAtTime(activityA);
      }

      if (sortValue === "oldestFirst") {
        return getCreatedAtTime(activityA) - getCreatedAtTime(activityB);
      }

      if (sortValue === "recentlyUpdated") {
        return getUpdatedAtTime(activityB) - getUpdatedAtTime(activityA);
      }

      if (sortValue === "oldestUpdated") {
        return getUpdatedAtTime(activityA) - getUpdatedAtTime(activityB);
      }

      if (sortValue === "playersLowToHigh") {
        return getPlayerCountForSort(activityA) - getPlayerCountForSort(activityB);
      }

      if (sortValue === "playersHighToLow") {
        return getPlayerCountForSort(activityB) - getPlayerCountForSort(activityA);
      }

      return 0;
    });
  }, [filteredActivities, sortValue]);

  const resultsCountText = hasSearched
    ? `Showing ${visibleActivities.length} of ${searchableActivities.length} ${
        searchableActivities.length === 1 ? "activity" : "activities"
      }`
    : "No search run yet";

  useEffect(() => {
    loadActivities();
  }, [loadActivities, refreshKey]);

  useEffect(() => {
    function handleWindowFocus() {
      loadActivities();
    }

    function handlePageShow() {
      loadActivities();
    }

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [loadActivities]);

  useEffect(() => {
    if (!hasSearched) {
      setSelectedActivity(undefined);
      setDownloadMessage("");
      setShowDeleteConfirm(false);
      setSelectedPreviewFailed(false);
      return;
    }

    if (visibleActivities.length === 0) {
      setSelectedActivity(undefined);
      setDownloadMessage("");
      setShowDeleteConfirm(false);
      setSelectedPreviewFailed(false);
      return;
    }

    const selectedActivityIsVisible = visibleActivities.some(
      (activity) => activity.id === selectedActivity?.id
    );

    if (!selectedActivityIsVisible) {
      setSelectedActivity(visibleActivities[0]);
      setDownloadMessage("");
      setShowDeleteConfirm(false);
      setSelectedPreviewFailed(false);
    }
  }, [hasSearched, visibleActivities, selectedActivity?.id]);

  useEffect(() => {
    setSelectedPreviewFailed(false);
  }, [selectedActivity?.id, selectedActivity?.previewDataUrl]);

  async function handleDownload() {
    if (!selectedActivity) return;

    setActionMessage("");
    setShowDeleteConfirm(false);

    if (!selectedActivity.previewDataUrl) {
      setDownloadMessage("No imported file is available for this activity.");
      return;
    }

    try {
      await downloadActivityAsPdf(selectedActivity);
      setDownloadMessage("PDF export download started.");
    } catch (error) {
      console.error("PDF export failed.", error);
      setDownloadMessage("The PDF export could not be created.");
    }
  }

  function handleSelectActivity(activity: ActivityWithSource) {
    setSelectedActivity(activity);
    setSelectedPreviewFailed(false);
    setDownloadMessage("");
    setActionMessage("");
    setShowDeleteConfirm(false);
  }

  async function handleToggleHidden() {
    if (!selectedActivity) return;

    setDownloadMessage("");
    setShowDeleteConfirm(false);
    setActionMessage("");

    if (selectedActivity.source === "supabase") {
      try {
        await updateSupabaseActivityHidden(
          selectedActivity.id,
          !selectedActivity.hidden
        );

        await loadActivities();
        setActionMessage(
          !selectedActivity.hidden
            ? "Activity hidden. Check Include hidden activities to view it again."
            : "Activity is visible again."
        );
        router.refresh();
        return;
      } catch (error) {
        console.error("Supabase hide/unhide failed.", error);
        setActionMessage("This activity could not be updated in Supabase.");
        return;
      }
    }

    const updatedActivity = updateStoredActivityHidden(
      selectedActivity.id,
      !selectedActivity.hidden
    );

    if (!updatedActivity) {
      setActionMessage("This local activity could not be updated.");
      return;
    }

    const updatedActivityWithSource: ActivityWithSource = {
      ...updatedActivity,
      source: "local",
    };

    setActivities((currentActivities) =>
      currentActivities.map((activity) =>
        activity.id === selectedActivity.id ? updatedActivityWithSource : activity
      )
    );

    setSelectedActivity(updatedActivityWithSource);

    setActionMessage(
      updatedActivity.hidden
        ? "Activity hidden. Check Include hidden activities to view it again."
        : "Activity is visible again."
    );
  }

  function handleDeleteClick() {
    setDownloadMessage("");
    setActionMessage("");

    if (!selectedActivity) return;

    setShowDeleteConfirm(true);
  }

  async function handleConfirmDelete() {
    if (!selectedActivity) return;

    const activityToDelete = selectedActivity;

    if (activityToDelete.source === "supabase") {
      try {
        await deleteSupabaseActivity(activityToDelete.id);
        deleteStoredActivity(activityToDelete.id);

        setSelectedActivity(undefined);
        setShowDeleteConfirm(false);
        setDownloadMessage("");
        await loadActivities();
        setActionMessage("Activity deleted from Supabase.");
        router.refresh();
        return;
      } catch (error) {
        console.error("Supabase delete failed.", error);
        setActionMessage("This activity could not be deleted from Supabase.");
        setShowDeleteConfirm(false);
        return;
      }
    }

    const deleted = deleteStoredActivity(activityToDelete.id);

    if (!deleted) {
      setActionMessage("This activity could not be deleted.");
      setShowDeleteConfirm(false);
      return;
    }

    setSelectedActivity(undefined);
    setShowDeleteConfirm(false);
    setDownloadMessage("");
    await loadActivities();
    setActionMessage("Activity deleted.");
  }

  return (
    <div className="grid min-w-0 gap-6 overflow-hidden lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">Results</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter search criteria above, then click Search to view matching
              activities.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            {isLoadingActivities ? "Loading activities..." : resultsCountText}
          </div>
        </div>

        {actionMessage && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {actionMessage}
          </div>
        )}

        <div className="mt-6 min-w-0 overflow-hidden rounded-lg border border-slate-200">
          <div className="hidden grid-cols-[1.4fr_0.85fr_0.9fr_0.9fr_0.85fr_auto] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 lg:grid">
            <div>Activity</div>
            <div>Location</div>
            <div>Phase</div>
            <div>Category</div>
            <div>Created</div>
            <div>Actions</div>
          </div>

          {isLoadingActivities ? (
            <div className="px-4 py-8 text-sm text-slate-500">
              Loading activities...
            </div>
          ) : !hasSearched ? (
            <div className="px-4 py-8 text-sm text-slate-500">
              No results yet. Enter at least one search criteria and click
              Search.
            </div>
          ) : visibleActivities.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              No activities match the current filters.
            </div>
          ) : (
            visibleActivities.map((activity) => {
              const isSelected = activity.id === selectedActivity?.id;

              return (
                <div
                  key={activity.id}
                  onClick={() => handleSelectActivity(activity)}
                  className={`cursor-pointer border-t border-slate-200 px-4 py-4 text-sm lg:grid lg:grid-cols-[1.4fr_0.85fr_0.9fr_0.9fr_0.85fr_auto] lg:items-center ${
                    isSelected ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="break-words font-semibold text-slate-800">
                      {activity.activityName}
                    </div>

                    {activity.fileName && (
                      <div className="mt-1 break-words text-xs text-slate-500">
                        Imported from: {activity.fileName}
                      </div>
                    )}

                    {activity.hidden && (
                      <div className="mt-1 text-xs font-semibold text-amber-600">
                        Hidden — admin only
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 text-slate-600 sm:grid-cols-2 lg:mt-0 lg:block">
                    <div>
                      <span className="font-semibold text-slate-700 lg:hidden">
                        Location:{" "}
                      </span>
                      {activity.fieldLocation || "—"}
                    </div>

                    <div className="lg:hidden">
                      <span className="font-semibold text-slate-700">
                        Phase:{" "}
                      </span>
                      {activity.gamePhase || "—"}
                    </div>
                  </div>

                  <div className="hidden text-slate-600 lg:block">
                    {activity.gamePhase || "—"}
                  </div>

                  <div className="mt-2 text-slate-600 lg:mt-0">
                    <span className="font-semibold text-slate-700 lg:hidden">
                      Category:{" "}
                    </span>
                    {activity.category || "—"}
                  </div>

                  <div className="mt-2 text-slate-600 lg:mt-0">
                    <span className="font-semibold text-slate-700 lg:hidden">
                      Created:{" "}
                    </span>
                    {formatDate(activity.createdAt)}
                  </div>

                  <div className="mt-4 flex gap-3 lg:mt-0">
                    <Link
                      href={`/activity/${activity.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Activity Detail</h2>

        {!selectedActivity ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Search for an activity, then select a result to see activity
            details.
          </div>
        ) : (
          <>
            <div className="mt-4 flex min-h-64 min-w-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              {!selectedActivity.previewDataUrl || selectedPreviewFailed ? (
                <PreviewFallback />
              ) : selectedActivity.fileType === "application/pdf" ? (
                <iframe
                  src={selectedActivity.previewDataUrl}
                  title={`${selectedActivity.activityName} PDF preview`}
                  className="h-80 w-full rounded-lg border border-slate-200"
                  onError={() => setSelectedPreviewFailed(true)}
                />
              ) : (
                <img
                  src={selectedActivity.previewDataUrl}
                  alt={`${selectedActivity.activityName} preview`}
                  className="max-h-80 w-full rounded-lg object-contain"
                  onError={() => setSelectedPreviewFailed(true)}
                />
              )}
            </div>

            <div className="mt-6 grid min-w-0 gap-3 text-sm">
              <div className="min-w-0">
                <div className="font-semibold text-slate-700">
                  Activity Name
                </div>
                <div className="break-words text-slate-600">
                  {selectedActivity.activityName}
                </div>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div>
                  <div className="font-semibold text-slate-700">
                    Field Location
                  </div>
                  <div className="text-slate-600">
                    {selectedActivity.fieldLocation || "—"}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">
                    Game Phase
                  </div>
                  <div className="text-slate-600">
                    {selectedActivity.gamePhase || "—"}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">Category</div>
                  <div className="text-slate-600">
                    {selectedActivity.category || "—"}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">
                    Number of Players
                  </div>
                  <div className="text-slate-600">
                    {selectedActivity.numberOfPlayers || "—"}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">
                    Created Date
                  </div>
                  <div className="text-slate-600">
                    {formatDate(selectedActivity.createdAt)}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">
                    Last Updated
                  </div>
                  <div className="text-slate-600">
                    {formatDate(selectedActivity.updatedAt)}
                  </div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-700">
                  Positions Involved
                </div>
                <div className="break-words text-slate-600">
                  {selectedActivity.positionsInvolved || "—"}
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-700">
                  Activity Details
                </div>
                <div className="break-words text-slate-600">
                  {selectedActivity.activityDetails || "—"}
                </div>
              </div>

              {selectedActivity.fileName && (
                <div>
                  <div className="font-semibold text-slate-700">
                    Imported File
                  </div>
                  <div className="break-words text-slate-600">
                    {selectedActivity.fileName}
                  </div>
                </div>
              )}
            </div>

            {downloadMessage && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                {downloadMessage}
              </div>
            )}

            {showDeleteConfirm && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="font-semibold">
                  Delete this activity permanently?
                </div>
                <div className="mt-1">
                  This removes the activity and its uploaded file if it came
                  from Supabase.
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white"
                  >
                    Delete Activity
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
              >
                Download
              </button>

              <Link
                href={`/activity/${selectedActivity.id}/edit`}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                Edit
              </Link>

              <button
                type="button"
                onClick={handleToggleHidden}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                {selectedActivity.hidden ? "Unhide" : "Hide"}
              </button>

              <button
                type="button"
                onClick={handleDeleteClick}
                className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
