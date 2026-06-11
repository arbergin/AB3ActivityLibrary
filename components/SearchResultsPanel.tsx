"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deleteStoredActivity,
  getStoredActivities,
  updateStoredActivityHidden,
} from "@/lib/activityStorage";
import { mockActivities } from "@/lib/mockActivities";
import type { Activity } from "@/types/activity";
import type { SearchFilterValues } from "@/components/SearchPageClient";

type SearchResultsPanelProps = {
  includeHidden: boolean;
  filters: SearchFilterValues;
};

function numberOfPlayersMatchesFilter(
  activityPlayerCount: number | "",
  filterValue: string
) {
  const cleanedFilter = filterValue.trim().toLowerCase();

  if (!cleanedFilter) {
    return true;
  }

  if (activityPlayerCount === "") {
    return false;
  }

  const playerCount = Number(activityPlayerCount);

  if (Number.isNaN(playerCount)) {
    return false;
  }

  if (cleanedFilter.endsWith("+")) {
    const minimum = Number(cleanedFilter.replace("+", ""));

    if (Number.isNaN(minimum)) {
      return false;
    }

    return playerCount >= minimum;
  }

  if (cleanedFilter.startsWith(">=")) {
    const minimum = Number(cleanedFilter.replace(">=", ""));

    if (Number.isNaN(minimum)) {
      return false;
    }

    return playerCount >= minimum;
  }

  if (cleanedFilter.startsWith(">")) {
    const minimum = Number(cleanedFilter.replace(">", ""));

    if (Number.isNaN(minimum)) {
      return false;
    }

    return playerCount > minimum;
  }

  if (cleanedFilter.startsWith("<=")) {
    const maximum = Number(cleanedFilter.replace("<=", ""));

    if (Number.isNaN(maximum)) {
      return false;
    }

    return playerCount <= maximum;
  }

  if (cleanedFilter.startsWith("<")) {
    const maximum = Number(cleanedFilter.replace("<", ""));

    if (Number.isNaN(maximum)) {
      return false;
    }

    return playerCount < maximum;
  }

  const rangeParts = cleanedFilter.includes(" to ")
    ? cleanedFilter.split(" to ")
    : cleanedFilter.split("-");

  if (rangeParts.length === 2) {
    const minimum = Number(rangeParts[0].trim());
    const maximum = Number(rangeParts[1].trim());

    if (Number.isNaN(minimum) || Number.isNaN(maximum)) {
      return false;
    }

    return playerCount >= minimum && playerCount <= maximum;
  }

  const exactNumber = Number(cleanedFilter);

  if (Number.isNaN(exactNumber)) {
    return false;
  }

  return playerCount === exactNumber;
}

export default function SearchResultsPanel({
  includeHidden,
  filters,
}: SearchResultsPanelProps) {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [selectedActivity, setSelectedActivity] = useState<
    Activity | undefined
  >(mockActivities[0]);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function loadActivitiesFromStorage() {
    const storedActivities = getStoredActivities();
    const combinedActivities = [...storedActivities, ...mockActivities];

    setActivities(combinedActivities);

    const firstVisibleActivity =
      combinedActivities.find((activity) => includeHidden || !activity.hidden) ??
      combinedActivities[0];

    setSelectedActivity(firstVisibleActivity);
  }

  const searchableActivities = useMemo(() => {
    if (includeHidden) {
      return activities;
    }

    return activities.filter((activity) => !activity.hidden);
  }, [activities, includeHidden]);

  const filteredActivities = useMemo(() => {
    return searchableActivities.filter((activity) => {
      const activityNameMatches = activity.activityName
        .toLowerCase()
        .includes(filters.activityName.toLowerCase().trim());

      const fieldLocationMatches =
        !filters.fieldLocation ||
        activity.fieldLocation === filters.fieldLocation;

      const gamePhaseMatches =
        !filters.gamePhase || activity.gamePhase === filters.gamePhase;

      const categoryMatches =
        !filters.category || activity.category === filters.category;

      const positionsMatch = activity.positionsInvolved
        .toLowerCase()
        .includes(filters.positionsInvolved.toLowerCase().trim());

      const numberOfPlayersMatches = numberOfPlayersMatchesFilter(
        activity.numberOfPlayers,
        filters.numberOfPlayers
      );

      const detailsMatch = activity.activityDetails
        .toLowerCase()
        .includes(filters.activityDetails.toLowerCase().trim());

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
  }, [searchableActivities, filters]);

  const resultsCountText = `Showing ${filteredActivities.length} of ${searchableActivities.length} ${
    searchableActivities.length === 1 ? "activity" : "activities"
  }`;

  useEffect(() => {
    loadActivitiesFromStorage();

    function handleWindowFocus() {
      loadActivitiesFromStorage();
    }

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filteredActivities.length === 0) {
      setSelectedActivity(undefined);
      setDownloadMessage("");
      setActionMessage("");
      setShowDeleteConfirm(false);
      return;
    }

    const selectedActivityIsVisible = filteredActivities.some(
      (activity) => activity.id === selectedActivity?.id
    );

    if (!selectedActivityIsVisible) {
      setSelectedActivity(filteredActivities[0]);
      setDownloadMessage("");
      setActionMessage("");
      setShowDeleteConfirm(false);
    }
  }, [filteredActivities, selectedActivity?.id]);

  function handleDownload() {
    if (!selectedActivity) {
      return;
    }

    setActionMessage("");
    setShowDeleteConfirm(false);

    if (!selectedActivity.previewDataUrl) {
      if (selectedActivity.fileType === "application/pdf") {
        setDownloadMessage("PDF download will be added later.");
        return;
      }

      setDownloadMessage("No imported file is available for this activity.");
      return;
    }

    const downloadLink = document.createElement("a");
    downloadLink.href = selectedActivity.previewDataUrl;
    downloadLink.download =
      selectedActivity.fileName || `${selectedActivity.activityName}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    setDownloadMessage("PNG download started.");
  }

  function handleSelectActivity(activity: Activity) {
    setSelectedActivity(activity);
    setDownloadMessage("");
    setActionMessage("");
    setShowDeleteConfirm(false);
  }

  function handleToggleHidden() {
    if (!selectedActivity) {
      return;
    }

    const updatedActivity = updateStoredActivityHidden(
      selectedActivity.id,
      !selectedActivity.hidden
    );

    setDownloadMessage("");
    setShowDeleteConfirm(false);

    if (!updatedActivity) {
      setActionMessage(
        "Only locally imported activities can be hidden for now. Sample activities are read-only."
      );
      return;
    }

    const storedActivities = getStoredActivities();
    const combinedActivities = [...storedActivities, ...mockActivities];

    setActivities(combinedActivities);
    setSelectedActivity(updatedActivity);

    setActionMessage(
      updatedActivity.hidden
        ? "Activity hidden. Check Include hidden activities to view it again."
        : "Activity is visible again."
    );
  }

  function handleDeleteClick() {
    if (!selectedActivity) {
      return;
    }

    setDownloadMessage("");

    const isLocalActivity = Boolean(
      getStoredActivities().find(
        (activity) => activity.id === selectedActivity.id
      )
    );

    if (!isLocalActivity) {
      setActionMessage(
        "Only locally imported activities can be deleted for now. Sample activities are read-only."
      );
      setShowDeleteConfirm(false);
      return;
    }

    setActionMessage("");
    setShowDeleteConfirm(true);
  }

  function handleConfirmDelete() {
    if (!selectedActivity) {
      return;
    }

    const deleted = deleteStoredActivity(selectedActivity.id);

    if (!deleted) {
      setActionMessage("This activity could not be deleted.");
      setShowDeleteConfirm(false);
      return;
    }

    const storedActivities = getStoredActivities();
    const combinedActivities = [...storedActivities, ...mockActivities];

    setActivities(combinedActivities);

    const nextVisibleActivity =
      combinedActivities.find((activity) => includeHidden || !activity.hidden) ??
      combinedActivities[0];

    setSelectedActivity(nextVisibleActivity);
    setShowDeleteConfirm(false);
    setDownloadMessage("");
    setActionMessage("Activity deleted.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Results</h2>
            <p className="mt-2 text-sm text-slate-600">
              Click a row to update the preview and metadata. Use Open to view
              the activity larger.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            {resultsCountText}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <div>Activity</div>
            <div>Location</div>
            <div>Phase</div>
            <div>Category</div>
            <div>Actions</div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              No activities match the current filters.
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const isSelected = activity.id === selectedActivity?.id;

              return (
                <div
                  key={activity.id}
                  onClick={() => handleSelectActivity(activity)}
                  className={`grid cursor-pointer grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center border-t border-slate-200 px-4 py-4 text-sm ${
                    isSelected ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      {activity.activityName}
                    </div>

                    {activity.fileName && (
                      <div className="mt-1 text-xs text-slate-500">
                        Imported from: {activity.fileName}
                      </div>
                    )}

                    {activity.hidden && (
                      <div className="mt-1 text-xs font-semibold text-amber-600">
                        Hidden — admin only
                      </div>
                    )}
                  </div>

                  <div className="text-slate-600">
                    {activity.fieldLocation || "—"}
                  </div>

                  <div className="text-slate-600">
                    {activity.gamePhase || "—"}
                  </div>

                  <div className="text-slate-600">
                    {activity.category || "—"}
                  </div>

                  <div className="flex gap-3">
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

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Activity Detail</h2>

        {!selectedActivity ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Select an activity or adjust the filters to see activity details.
          </div>
        ) : (
          <>
            <div className="mt-4 flex min-h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              {selectedActivity.previewDataUrl ? (
                <img
                  src={selectedActivity.previewDataUrl}
                  alt={`${selectedActivity.activityName} preview`}
                  className="max-h-80 w-full rounded-lg object-contain"
                />
              ) : (
                <div>
                  Preview pane
                  <div className="mt-2 text-xs">
                    PNG/PDF viewer placeholder
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3 text-sm">
              <div>
                <div className="font-semibold text-slate-700">
                  Activity Name
                </div>
                <div className="text-slate-600">
                  {selectedActivity.activityName}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
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
              </div>

              <div>
                <div className="font-semibold text-slate-700">
                  Positions Involved
                </div>
                <div className="text-slate-600">
                  {selectedActivity.positionsInvolved || "—"}
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-700">
                  Activity Details
                </div>
                <div className="text-slate-600">
                  {selectedActivity.activityDetails || "—"}
                </div>
              </div>

              {selectedActivity.fileName && (
                <div>
                  <div className="font-semibold text-slate-700">
                    Imported File
                  </div>
                  <div className="text-slate-600">
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

            {actionMessage && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                {actionMessage}
              </div>
            )}

            {showDeleteConfirm && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="font-semibold">
                  Delete this activity permanently?
                </div>
                <div className="mt-1">
                  This removes the locally saved activity from this browser.
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
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
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