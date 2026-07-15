"use client";

import { useCallback, useEffect, useState } from "react";
import SearchFilters from "@/components/SearchFilters";
import SearchResultsPanel from "@/components/SearchResultsPanel";

export type SearchFilterValues = {
  activityName: string;
  fieldLocation: string;
  gamePhase: string;
  category: string;
  positionsInvolved: string;
  numberOfPlayers: string;
  activityDetails: string;
};

export type SearchSortValue =
  | "activityNameAsc"
  | "activityNameDesc"
  | "newestFirst"
  | "oldestFirst"
  | "recentlyUpdated"
  | "oldestUpdated"
  | "playersLowToHigh"
  | "playersHighToLow";

const emptyFilters: SearchFilterValues = {
  activityName: "",
  fieldLocation: "",
  gamePhase: "",
  category: "",
  positionsInvolved: "",
  numberOfPlayers: "",
  activityDetails: "",
};

const SEARCH_PAGE_STATE_KEY = "ab3-search-page-state";

type PersistedSearchPageState = {
  filters: SearchFilterValues;
  appliedFilters: SearchFilterValues;
  myActivitiesOnly: boolean;
  appliedMyActivitiesOnly: boolean;
  includeHidden: boolean;
  appliedIncludeHidden: boolean;
  sortValue: SearchSortValue;
  hasSearched: boolean;
  searchMessage: string;
  refreshKey: number;
};

function isSearchSortValue(value: unknown): value is SearchSortValue {
  return (
    value === "activityNameAsc" ||
    value === "activityNameDesc" ||
    value === "newestFirst" ||
    value === "oldestFirst" ||
    value === "recentlyUpdated" ||
    value === "oldestUpdated" ||
    value === "playersLowToHigh" ||
    value === "playersHighToLow"
  );
}

function isSearchFilterValues(value: unknown): value is SearchFilterValues {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.activityName === "string" &&
    typeof record.fieldLocation === "string" &&
    typeof record.gamePhase === "string" &&
    typeof record.category === "string" &&
    typeof record.positionsInvolved === "string" &&
    typeof record.numberOfPlayers === "string" &&
    typeof record.activityDetails === "string"
  );
}

function hasSearchCriteria(filters: SearchFilterValues) {
  return Object.values(filters).some((value) => value.trim() !== "");
}



export default function SearchPageClient() {
  const [myActivitiesOnly, setMyActivitiesOnly] = useState(false);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [filters, setFilters] = useState<SearchFilterValues>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<SearchFilterValues>(emptyFilters);
  const [appliedMyActivitiesOnly, setAppliedMyActivitiesOnly] = useState(false);
  const [appliedIncludeHidden, setAppliedIncludeHidden] = useState(false);
  const [sortValue, setSortValue] =
    useState<SearchSortValue>("activityNameAsc");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasRestoredSearchState, setHasRestoredSearchState] = useState(false);

  const resetSearchState = useCallback(() => {
    window.sessionStorage.removeItem(SEARCH_PAGE_STATE_KEY);
    window.sessionStorage.removeItem("ab3-search-selected-activity-id");
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setMyActivitiesOnly(false);
    setAppliedMyActivitiesOnly(false);
    setIncludeHidden(false);
    setAppliedIncludeHidden(false);
    setSortValue("activityNameAsc");
    setHasSearched(false);
    setSearchMessage("");
    setRefreshKey((current) => current + 1);
  }, []);

  function handleSearch() {

    if (!hasSearchCriteria(filters)) {
      setHasSearched(false);
      setSearchMessage("Enter at least one search criteria before searching.");
      setAppliedFilters(emptyFilters);
      setAppliedIncludeHidden(false);
      setRefreshKey((current) => current + 1);
      return;
    }

    setAppliedFilters(filters);
    setAppliedMyActivitiesOnly(myActivitiesOnly);
    setAppliedIncludeHidden(includeHidden);
    setHasSearched(true);
    setSearchMessage("");
    setRefreshKey((current) => current + 1);
  }

  function handleClearFilters() {
    resetSearchState();
  }

  useEffect(() => {
    try {
      const savedValue = window.sessionStorage.getItem(SEARCH_PAGE_STATE_KEY);

      if (savedValue) {
        const savedState = JSON.parse(
          savedValue
        ) as Partial<PersistedSearchPageState>;

        if (isSearchFilterValues(savedState.filters)) {
          setFilters(savedState.filters);
        }

        if (isSearchFilterValues(savedState.appliedFilters)) {
          setAppliedFilters(savedState.appliedFilters);
        }

        if (typeof savedState.myActivitiesOnly === "boolean") {
          setMyActivitiesOnly(savedState.myActivitiesOnly);
        }

        if (typeof savedState.appliedMyActivitiesOnly === "boolean") {
          setAppliedMyActivitiesOnly(savedState.appliedMyActivitiesOnly);
        }

        if (typeof savedState.includeHidden === "boolean") {
          setIncludeHidden(savedState.includeHidden);
        }

        if (typeof savedState.appliedIncludeHidden === "boolean") {
          setAppliedIncludeHidden(savedState.appliedIncludeHidden);
        }

        if (isSearchSortValue(savedState.sortValue)) {
          setSortValue(savedState.sortValue);
        }

        if (typeof savedState.hasSearched === "boolean") {
          setHasSearched(savedState.hasSearched);
        }

        if (typeof savedState.searchMessage === "string") {
          setSearchMessage(savedState.searchMessage);
        }

        if (
          typeof savedState.refreshKey === "number" &&
          Number.isFinite(savedState.refreshKey)
        ) {
          setRefreshKey(savedState.refreshKey);
        }
      }
    } catch (error) {
      console.error("Unable to restore search state.", error);
    } finally {
      setHasRestoredSearchState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredSearchState) {
      return;
    }

    const stateToSave: PersistedSearchPageState = {
      filters,
      appliedFilters,
      myActivitiesOnly,
      appliedMyActivitiesOnly,
      includeHidden,
      appliedIncludeHidden,
      sortValue,
      hasSearched,
      searchMessage,
      refreshKey,
    };

    window.sessionStorage.setItem(
      SEARCH_PAGE_STATE_KEY,
      JSON.stringify(stateToSave)
    );
  }, [
    filters,
    appliedFilters,
    myActivitiesOnly,
    appliedMyActivitiesOnly,
    includeHidden,
    appliedIncludeHidden,
    sortValue,
    hasSearched,
    searchMessage,
    refreshKey,
    hasRestoredSearchState,
  ]);

  return (
    <div className="grid min-w-0 gap-8 overflow-hidden">
      <div className="min-w-0">
        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          myActivitiesOnly={myActivitiesOnly}
          onMyActivitiesOnlyChange={setMyActivitiesOnly}
          includeHidden={includeHidden}
          onIncludeHiddenChange={setIncludeHidden}
          sortValue={sortValue}
          onSortValueChange={setSortValue}
          onSearch={handleSearch}
          onClearFilters={handleClearFilters}
          searchMessage={searchMessage}
        />
      </div>

      <div className="min-w-0">
        <SearchResultsPanel
          myActivitiesOnly={appliedMyActivitiesOnly}
          includeHidden={appliedIncludeHidden}
          filters={appliedFilters}
          sortValue={sortValue}
          hasSearched={hasSearched}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
