"use client";

import { useState } from "react";
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

export default function SearchPageClient() {
  const [includeHidden, setIncludeHidden] = useState(false);
  const [filters, setFilters] = useState<SearchFilterValues>(emptyFilters);
  const [sortValue, setSortValue] =
    useState<SearchSortValue>("activityNameAsc");

  function handleClearFilters() {
    setFilters(emptyFilters);
    setIncludeHidden(false);
    setSortValue("activityNameAsc");
  }

  return (
    <div className="grid gap-8">
      <SearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        includeHidden={includeHidden}
        onIncludeHiddenChange={setIncludeHidden}
        sortValue={sortValue}
        onSortValueChange={setSortValue}
        onClearFilters={handleClearFilters}
      />

      <SearchResultsPanel
        includeHidden={includeHidden}
        filters={filters}
        sortValue={sortValue}
      />
    </div>
  );
}