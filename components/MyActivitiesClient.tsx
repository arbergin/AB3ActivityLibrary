"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActivityDownloadButton from "@/components/ActivityDownloadButton";
import { getActivityCreatorFrameCount } from "@/lib/activityCreatorFrames";
import {
  deleteSupabaseActivity,
  duplicateSupabaseActivity,
  getSupabaseActivities,
} from "@/lib/supabaseActivities";
import { supabase } from "@/lib/supabaseClient";
import type { Activity } from "@/types/activity";
import { getUserDisplayName } from "@/lib/userProfile";
import ActivityDetailsMarkdown from "@/components/ActivityDetailsMarkdown";
import { stripActivityDetailsMarkdown } from "@/lib/activityDetailsMarkdown";

type SortOption = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";
type PageSize = 10 | 20 | 30;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updated_desc", label: "Date Updated: Newest" },
  { value: "updated_asc", label: "Date Updated: Oldest" },
  { value: "name_asc", label: "Name: A-Z" },
  { value: "name_desc", label: "Name: Z-A" },
];

const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 30];

function safeLower(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getActivityName(activity: Activity) {
  return activity.activityName?.trim() || "Untitled Activity";
}

function getUpdatedDateValue(activity: Activity) {
  const rawDate = activity.updatedAt || activity.createdAt || "";
  const timestamp = new Date(rawDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatActivityVisibility(value?: Activity["visibility"]) {
  if (value === "club") return "My Club";
  if (value === "everyone") return "Everyone";
  return "Private";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortActivities(activities: Activity[], sortOption: SortOption) {
  return [...activities].sort((a, b) => {
    if (sortOption === "name_asc") {
      return getActivityName(a).localeCompare(getActivityName(b));
    }

    if (sortOption === "name_desc") {
      return getActivityName(b).localeCompare(getActivityName(a));
    }

    if (sortOption === "updated_asc") {
      return getUpdatedDateValue(a) - getUpdatedDateValue(b);
    }

    return getUpdatedDateValue(b) - getUpdatedDateValue(a);
  });
}

function renderMultilineText(value?: string | number | null, fallback = "—") {
  const normalizedValue = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue.split("\n").map((line, index, lines) => (
    <span key={`${index}-${line}`}>
      {line || " "}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function PreviewFallback() {
  return (
    <div className="flex min-h-64 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      <div>
        Preview unavailable
        <div className="mt-2 text-xs">
          The activity record exists, but the preview file could not be loaded.
        </div>
      </div>
    </div>
  );
}

export default function MyActivitiesClient() {
  const router = useRouter();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<
    Activity | undefined
  >(undefined);
  const [selectedPreviewFailed, setSelectedPreviewFailed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingCopy, setIsCreatingCopy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("updated_desc");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [creatorDisplayName, setCreatorDisplayName] = useState("—");
  const activityRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadActivities() {
      setIsLoading(true);
      setErrorMessage("");
      setDeleteMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setActivities([]);
        setSelectedActivity(undefined);
        setErrorMessage("You must be logged in to view your activities.");
        setIsLoading(false);
        return;
      }

      const userEmail = safeLower(user.email);
      const userId = safeLower(user.id);

      try {
        // Use the same helper as SearchResultsPanel.
        // This converts file_path from Supabase Storage into previewDataUrl.
        const allActivities = await getSupabaseActivities();

        if (!isMounted) return;

        const myActivities = allActivities.filter((activity) => {
          const createdBy = safeLower(activity.createdBy);

          return (
            Boolean(createdBy) &&
            (createdBy === userEmail || createdBy === userId)
          );
        });

        setActivities(myActivities);
        setSelectedActivity((currentSelected) => {
          if (
            currentSelected &&
            myActivities.some((activity) => activity.id === currentSelected.id)
          ) {
            return currentSelected;
          }

          return sortActivities(myActivities, sortOption)[0];
        });
      } catch (error) {
        console.error("Unable to load your activities.", error);

        if (!isMounted) return;

        setActivities([]);
        setSelectedActivity(undefined);
        setShowDeleteConfirm(false);
        setErrorMessage(
          "Unable to load your activities. Refresh the page and try again.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, [sortOption]);

  const sortedActivities = useMemo(() => {
    return sortActivities(activities, sortOption);
  }, [activities, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedActivities.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const visibleActivities = sortedActivities.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOption, pageSize]);

  useEffect(() => {
    if (visibleActivities.length === 0) {
      setSelectedActivity(undefined);
      setShowDeleteConfirm(false);
      return;
    }

    const selectedActivityIsVisible = visibleActivities.some(
      (activity) => activity.id === selectedActivity?.id,
    );

    if (!selectedActivityIsVisible) {
      setSelectedActivity(visibleActivities[0]);
      setSelectedPreviewFailed(false);
      setShowDeleteConfirm(false);
    }
  }, [visibleActivities, selectedActivity?.id]);

  useEffect(() => {
    setSelectedPreviewFailed(false);
  }, [selectedActivity?.id, selectedActivity?.previewDataUrl]);

  useEffect(() => {
    let isMounted = true;

    async function loadCreatorDisplayName() {
      const displayName = await getUserDisplayName(selectedActivity?.createdBy);

      if (isMounted) {
        setCreatorDisplayName(displayName);
      }
    }

    loadCreatorDisplayName();

    return () => {
      isMounted = false;
    };
  }, [selectedActivity?.createdBy]);

  useEffect(() => {
    function isTypingOrControlTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return Boolean(
        target.closest(
          'input, textarea, select, button, [contenteditable="true"], [role="textbox"], [role="menu"]'
        )
      );
    }

    function handleArrowNavigation(event: KeyboardEvent) {
      if (
        isTypingOrControlTarget(event.target) ||
        sortedActivities.length === 0 ||
        !selectedActivity ||
        showDeleteConfirm
      ) {
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      const currentIndex = sortedActivities.findIndex(
        (activity) => activity.id === selectedActivity.id
      );

      if (currentIndex < 0) {
        return;
      }

      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(currentIndex + 1, sortedActivities.length - 1)
          : Math.max(currentIndex - 1, 0);

      // Stop the browser from scrolling even when already at the first/last item.
      event.preventDefault();

      if (nextIndex === currentIndex) {
        return;
      }

      const nextActivity = sortedActivities[nextIndex];
      const nextPage = Math.floor(nextIndex / pageSize) + 1;

      setCurrentPage(nextPage);
      handleSelectActivity(nextActivity);

      window.setTimeout(() => {
        activityRowRefs.current[nextActivity.id]?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }, 0);
    }

    window.addEventListener("keydown", handleArrowNavigation);

    return () => {
      window.removeEventListener("keydown", handleArrowNavigation);
    };
  }, [
    pageSize,
    selectedActivity,
    showDeleteConfirm,
    sortedActivities,
  ]);

  function handleSelectActivity(activity: Activity) {
    setSelectedActivity(activity);
    setSelectedPreviewFailed(false);
    setShowDeleteConfirm(false);
    setDeleteMessage("");
    setDownloadMessage("");
  }


  async function handleCreateCopy() {
    if (!selectedActivity || isCreatingCopy) return;

    setDeleteMessage("");
    setDownloadMessage("");
    setShowDeleteConfirm(false);
    setIsCreatingCopy(true);

    try {
      const copiedActivity = await duplicateSupabaseActivity(selectedActivity.id);
      router.push(`/activity/${copiedActivity.id}/edit`);
    } catch (error) {
      console.error("Unable to create activity copy.", error);
      setDeleteMessage(
        "This activity could not be copied. Refresh the page and try again.",
      );
      setIsCreatingCopy(false);
    }
  }

  function handleDeleteClick() {
    if (!selectedActivity) return;

    setDownloadMessage("");
    setDeleteMessage("");
    setShowDeleteConfirm(true);
  }

  async function handleConfirmDelete() {
    if (!selectedActivity || isDeleting) return;

    const activityToDelete = selectedActivity;

    try {
      setIsDeleting(true);
      setDeleteMessage("");

      await deleteSupabaseActivity(activityToDelete.id);

      const remainingActivities = activities.filter(
        (activity) => activity.id !== activityToDelete.id,
      );

      setActivities(remainingActivities);
      setShowDeleteConfirm(false);
      setSelectedPreviewFailed(false);
      setDownloadMessage("");
      setDeleteMessage("Activity deleted.");

      const sortedRemainingActivities = sortActivities(
        remainingActivities,
        sortOption,
      );

      const remainingOnCurrentPage = sortedRemainingActivities.slice(
        startIndex,
        endIndex,
      );

      if (remainingOnCurrentPage.length > 0) {
        setSelectedActivity(remainingOnCurrentPage[0]);
      } else if (sortedRemainingActivities.length > 0) {
        const newTotalPages = Math.max(
          1,
          Math.ceil(sortedRemainingActivities.length / pageSize),
        );
        const newCurrentPage = Math.min(safeCurrentPage, newTotalPages);
        setCurrentPage(newCurrentPage);
        setSelectedActivity(
          sortedRemainingActivities[(newCurrentPage - 1) * pageSize],
        );
      } else {
        setSelectedActivity(undefined);
        setCurrentPage(1);
      }

      router.refresh();
    } catch (error) {
      console.error("Unable to delete activity.", error);
      setDeleteMessage(
        "This activity could not be deleted. Refresh the page and try again.",
      );
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-md sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Activities</h1>
          <p className="mt-1 text-sm text-slate-600">
            Activities you created, sorted by the most recently updated by
            default.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Sort by
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as SortOption)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#0d2140] focus:outline-none focus:ring-2 focus:ring-[#0d2140]/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-300 bg-white p-8 text-center text-slate-600 shadow-md">
          Loading your activities...
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : sortedActivities.length === 0 ? (
        <div className="rounded-2xl border border-slate-300 bg-white p-8 text-center shadow-md">
          <h2 className="text-lg font-bold text-slate-900">
            No activities found
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Activities you create will appear here.
          </p>
          <Link
            href="/create"
            className="mt-5 inline-flex rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17345f]"
          >
            Create Activity
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Activity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Game Phase
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Updated
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {visibleActivities.map((activity) => {
                      const isSelected = activity.id === selectedActivity?.id;

                      return (
                        <tr
                          key={activity.id}
                          ref={(element) => {
                            activityRowRefs.current[activity.id] = element;
                          }}
                          tabIndex={isSelected ? 0 : -1}
                          aria-selected={isSelected}
                          onClick={() => handleSelectActivity(activity)}
                          className={
                            isSelected
                              ? "cursor-pointer bg-blue-50"
                              : "cursor-pointer hover:bg-slate-50"
                          }
                        >
                          <td className="px-4 py-4 align-top">
                            <div className="block w-full text-left">
                              <div className="font-semibold text-slate-900">
                                {getActivityName(activity)}
                              </div>
                              <div className="mt-1 line-clamp-2 max-w-xl whitespace-pre-line text-sm text-slate-500">
                                {stripActivityDetailsMarkdown(activity.activityDetails) ||
                                  "No activity details provided."}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {activity.category || "—"}
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {activity.gamePhase || "—"}
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {formatDate(
                              activity.updatedAt || activity.createdAt,
                            )}
                          </td>
                          <td className="px-4 py-4 text-right align-top">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/activity/${activity.id}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                }}
                                className="inline-flex rounded-lg bg-[#0d2140] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#17345f]"
                              >
                                Open
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="min-w-0 rounded-2xl border border-slate-300 bg-white p-5 shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900">
                    Activity Preview
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Select an activity to preview its file and metadata.
                  </p>
                </div>

                {selectedActivity && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <ActivityDownloadButton
                    activity={selectedActivity}
                    onMessage={setDownloadMessage}
                  />

                    <button
                      type="button"
                      onClick={handleCreateCopy}
                      disabled={isCreatingCopy}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreatingCopy ? "Creating Copy..." : "Create Copy"}
                    </button>

                    <Link
                      href={`/activity/${selectedActivity.id}/edit`}
                      className="rounded-lg border border-[#0d2140] bg-white px-3 py-1.5 text-sm font-semibold text-[#0d2140] transition hover:bg-slate-50"
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {showDeleteConfirm ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="font-semibold">
                    Delete this activity permanently?
                  </div>
                  <div className="mt-1">
                    This removes the activity and its uploaded file from
                    Supabase.
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeleting ? "Deleting..." : "Delete Activity"}
                    </button>
                  </div>
                </div>
              ) : null}

              {!selectedActivity ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Select an activity to see activity details.
                </div>
              ) : (
                <>
                  <div className="mt-4 flex min-h-64 min-w-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                    {selectedPreviewFailed ? (
                      <PreviewFallback />
                    ) : selectedActivity.previewDataUrl &&
                      selectedActivity.fileType === "application/pdf" ? (
                      <iframe
                        src={selectedActivity.previewDataUrl}
                        title={`${selectedActivity.activityName} PDF preview`}
                        className="h-80 w-full rounded-lg border border-slate-200"
                        onError={() => setSelectedPreviewFailed(true)}
                      />
                    ) : selectedActivity.previewDataUrl ? (
                      <img
                        src={selectedActivity.previewDataUrl}
                        alt={`${selectedActivity.activityName} preview`}
                        className="max-h-80 w-full rounded-lg object-contain"
                        onError={() => setSelectedPreviewFailed(true)}
                      />
                    ) : (
                      <PreviewFallback />
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
                      {selectedActivity.creatorState && (
                        <div className="mt-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {getActivityCreatorFrameCount(selectedActivity.creatorState)} {getActivityCreatorFrameCount(selectedActivity.creatorState) === 1 ? "tab" : "tabs"}
                          </span>
                        </div>
                      )}
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
                        <div className="font-semibold text-slate-700">
                          Category
                        </div>
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

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
                          Activity Visibility
                        </div>
                        <div className="text-slate-600">
                          {formatActivityVisibility(selectedActivity.visibility)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-700">
                        Activity Details
                      </div>
                      <ActivityDetailsMarkdown
                        value={selectedActivity.activityDetails}
                        className="text-slate-600"
                      />
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
                        Created By
                      </div>
                      <div className="break-words text-slate-600">
                        {creatorDisplayName}
                      </div>
                    </div>
                  </div>

                  {downloadMessage ? (
                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700">
                      {downloadMessage}
                    </div>
                  ) : null}

                  {deleteMessage ? (
                    <div
                      className={
                        deleteMessage === "Activity deleted."
                          ? "mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700"
                          : "mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
                      }
                    >
                      {deleteMessage}
                    </div>
                  ) : null}

                </>
              )}
            </aside>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(endIndex, sortedActivities.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {sortedActivities.length}
              </span>{" "}
              activities
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                Show
                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number(event.target.value) as PageSize)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#0d2140] focus:outline-none focus:ring-2 focus:ring-[#0d2140]/20"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                per page
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safeCurrentPage <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="min-w-[88px] text-center text-sm font-semibold text-slate-700">
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
