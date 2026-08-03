"use client";

import { useMemo, useState } from "react";
import SearchFilters from "@/components/SearchFilters";
import type {
  SearchFilterValues,
  SearchSortValue,
} from "@/components/SearchPageClient";
import type { Activity } from "@/types/activity";

const emptyFilters: SearchFilterValues = {
  activityName: "",
  fieldLocation: "",
  gamePhase: "",
  category: "",
  positionsInvolved: "",
  numberOfPlayers: "",
  activityDetails: "",
};

function safeLower(value?: string | number | null) {
  return String(value ?? "").toLowerCase();
}

function activityNameMatches(value: string, searchText: string) {
  const cleanSearchText = searchText.trim().toLowerCase();

  if (!cleanSearchText) return true;

  const cleanValue = value.toLowerCase();

  if (!cleanSearchText.includes("*")) {
    return cleanValue.includes(cleanSearchText);
  }

  const escapedPattern = cleanSearchText
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp(`^${escapedPattern}$`, "i").test(cleanValue);
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
    const minimum = Number(cleanedFilter.slice(0, -1));
    return !Number.isNaN(minimum) && playerCount >= minimum;
  }

  if (cleanedFilter.startsWith(">=")) {
    const minimum = Number(cleanedFilter.slice(2));
    return !Number.isNaN(minimum) && playerCount >= minimum;
  }

  if (cleanedFilter.startsWith(">")) {
    const minimum = Number(cleanedFilter.slice(1));
    return !Number.isNaN(minimum) && playerCount > minimum;
  }

  if (cleanedFilter.startsWith("<=")) {
    const maximum = Number(cleanedFilter.slice(2));
    return !Number.isNaN(maximum) && playerCount <= maximum;
  }

  if (cleanedFilter.startsWith("<")) {
    const maximum = Number(cleanedFilter.slice(1));
    return !Number.isNaN(maximum) && playerCount < maximum;
  }

  const rangeParts = cleanedFilter.includes(" to ")
    ? cleanedFilter.split(" to ")
    : cleanedFilter.split("-");

  if (rangeParts.length === 2) {
    const minimum = Number(rangeParts[0].trim());
    const maximum = Number(rangeParts[1].trim());

    return (
      !Number.isNaN(minimum) &&
      !Number.isNaN(maximum) &&
      playerCount >= minimum &&
      playerCount <= maximum
    );
  }

  const exact = Number(cleanedFilter);
  return !Number.isNaN(exact) && playerCount === exact;
}

function getTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

type PlannerActivityPickerProps = {
  activities: Activity[];
  onSelect: (activity: Activity) => void;
  onClose: () => void;
};

export default function PlannerActivityPicker({
  activities,
  onSelect,
  onClose,
}: PlannerActivityPickerProps) {
  const [filters, setFilters] = useState<SearchFilterValues>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<SearchFilterValues>(emptyFilters);
  const [myActivitiesOnly, setMyActivitiesOnly] = useState(false);
  const [appliedMyActivitiesOnly, setAppliedMyActivitiesOnly] = useState(false);
  const [sortValue, setSortValue] =
    useState<SearchSortValue>("activityNameAsc");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null
  );

  function handleSearch() {
    const hasCriteria = Object.values(filters).some(
      (value) => value.trim() !== ""
    );

    if (!hasCriteria && !myActivitiesOnly) {
      setSearchMessage(
        "Enter at least one search criteria, or select My Activities Only."
      );
      setHasSearched(false);
      return;
    }

    setAppliedFilters(filters);
    setAppliedMyActivitiesOnly(myActivitiesOnly);
    setHasSearched(true);
    setSearchMessage("");
    setSelectedActivityId(null);
  }

  function handleClearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setMyActivitiesOnly(false);
    setAppliedMyActivitiesOnly(false);
    setHasSearched(false);
    setSearchMessage("");
    setSelectedActivityId(null);
  }

  const filteredActivities = useMemo(() => {
    if (!hasSearched) return [];

    return activities
      .filter((activity) => !activity.hidden)
      .filter((activity) => {
        if (
          appliedMyActivitiesOnly &&
          !activity.createdBy
        ) {
          return false;
        }

        return (
          activityNameMatches(
            activity.activityName ?? "",
            appliedFilters.activityName
          ) &&
          (!appliedFilters.fieldLocation ||
            activity.fieldLocation === appliedFilters.fieldLocation) &&
          (!appliedFilters.gamePhase ||
            activity.gamePhase === appliedFilters.gamePhase) &&
          (!appliedFilters.category ||
            activity.category === appliedFilters.category) &&
          safeLower(activity.positionsInvolved).includes(
            appliedFilters.positionsInvolved.toLowerCase().trim()
          ) &&
          numberOfPlayersMatchesFilter(
            activity.numberOfPlayers,
            appliedFilters.numberOfPlayers
          ) &&
          safeLower(activity.activityDetails).includes(
            appliedFilters.activityDetails.toLowerCase().trim()
          )
        );
      })
      .sort((a, b) => {
        if (sortValue === "activityNameAsc") {
          return a.activityName.localeCompare(b.activityName);
        }

        if (sortValue === "activityNameDesc") {
          return b.activityName.localeCompare(a.activityName);
        }

        if (sortValue === "newestFirst") {
          return getTime(b.createdAt) - getTime(a.createdAt);
        }

        if (sortValue === "oldestFirst") {
          return getTime(a.createdAt) - getTime(b.createdAt);
        }

        if (sortValue === "recentlyUpdated") {
          return getTime(b.updatedAt) - getTime(a.updatedAt);
        }

        if (sortValue === "oldestUpdated") {
          return getTime(a.updatedAt) - getTime(b.updatedAt);
        }

        const aPlayers = a.numberOfPlayers === "" ? 0 : Number(a.numberOfPlayers);
        const bPlayers = b.numberOfPlayers === "" ? 0 : Number(b.numberOfPlayers);

        if (sortValue === "playersLowToHigh") {
          return aPlayers - bPlayers;
        }

        if (sortValue === "playersHighToLow") {
          return bPlayers - aPlayers;
        }

        return 0;
      });
  }, [
    activities,
    appliedFilters,
    appliedMyActivitiesOnly,
    hasSearched,
    sortValue,
  ]);

  const selectedActivity =
    filteredActivities.find((activity) => activity.id === selectedActivityId) ??
    null;

  return (
    <div className="fixed inset-0 z-[170] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-4 sm:p-8">
      <div className="w-full max-w-7xl rounded-2xl bg-[#e8eef7] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-2xl border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Search Activity Library
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select an activity, preview it, then add it to this practice.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-bold text-slate-600 hover:bg-slate-50"
            aria-label="Close search"
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 p-4 sm:p-6">
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            myActivitiesOnly={myActivitiesOnly}
            onMyActivitiesOnlyChange={setMyActivitiesOnly}
            sortValue={sortValue}
            onSortValueChange={setSortValue}
            onSearch={handleSearch}
            onClearFilters={handleClearFilters}
            searchMessage={searchMessage}
          />

          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <section className="min-w-0 rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900">Results</h3>
                <span className="text-xs font-semibold text-slate-500">
                  {hasSearched
                    ? `${filteredActivities.length} result${
                        filteredActivities.length === 1 ? "" : "s"
                      }`
                    : "No search run yet"}
                </span>
              </div>

              <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-slate-200">
                {!hasSearched ? (
                  <div className="px-4 py-8 text-sm text-slate-500">
                    Enter search criteria above and click Search.
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-slate-500">
                    No activities match the current search.
                  </div>
                ) : (
                  filteredActivities.map((activity) => {
                    const selected = activity.id === selectedActivityId;

                    return (
                      <button
                        key={activity.id}
                        type="button"
                        onClick={() => setSelectedActivityId(activity.id)}
                        className={`block w-full border-t border-slate-200 px-4 py-3 text-left first:border-t-0 ${
                          selected
                            ? "bg-[#e8eef7]"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-semibold text-slate-900">
                          {activity.activityName}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{activity.fieldLocation || "No location"}</span>
                          <span>{activity.gamePhase || "No phase"}</span>
                          <span>{activity.category || "No category"}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-slate-900">Preview</h3>

              {!selectedActivity ? (
                <div className="mt-4 flex min-h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Select an activity from the results.
                </div>
              ) : (
                <>
                  <div className="mt-4 flex min-h-72 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {selectedActivity.previewDataUrl &&
                    selectedActivity.fileType === "application/pdf" ? (
                      <iframe
                        src={selectedActivity.previewDataUrl}
                        title={`${selectedActivity.activityName} preview`}
                        className="h-80 w-full rounded-lg"
                      />
                    ) : selectedActivity.previewDataUrl ? (
                      <img
                        src={selectedActivity.previewDataUrl}
                        alt={`${selectedActivity.activityName} preview`}
                        className="max-h-80 w-full object-contain"
                      />
                    ) : (
                      <div className="text-sm text-slate-500">
                        Preview unavailable.
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="text-lg font-bold text-slate-900">
                      {selectedActivity.activityName}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {selectedActivity.activityDetails ||
                        "No activity details provided."}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelect(selectedActivity)}
                    className="mt-5 w-full rounded-lg bg-[#0d2140] px-4 py-3 text-sm font-bold text-white hover:bg-[#17345f]"
                  >
                    Add to Practice
                  </button>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
