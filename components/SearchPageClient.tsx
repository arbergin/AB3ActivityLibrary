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

function hasSearchCriteria(filters: SearchFilterValues) {
  return Object.values(filters).some((value) => value.trim() !== "");
}

export default function SearchPageClient() {
  const [includeHidden, setIncludeHidden] = useState(false);
  const [filters, setFilters] = useState<SearchFilterValues>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<SearchFilterValues>(emptyFilters);
  const [appliedIncludeHidden, setAppliedIncludeHidden] = useState(false);
  const [sortValue, setSortValue] =
    useState<SearchSortValue>("activityNameAsc");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  function handleSearch() {
    if (!hasSearchCriteria(filters)) {
      setHasSearched(false);
      setSearchMessage("Enter at least one search criteria before searching.");
      setAppliedFilters(emptyFilters);
      setAppliedIncludeHidden(false);
      return;
    }

    setAppliedFilters(filters);
    setAppliedIncludeHidden(includeHidden);
    setHasSearched(true);
    setSearchMessage("");
  }

  function handleClearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setIncludeHidden(false);
    setAppliedIncludeHidden(false);
    setSortValue("activityNameAsc");
    setHasSearched(false);
    setSearchMessage("");
  }

  return (
    <div className="grid min-w-0 gap-8 overflow-hidden">
      <div className="min-w-0">
        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
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
          includeHidden={appliedIncludeHidden}
          filters={appliedFilters}
          sortValue={sortValue}
          hasSearched={hasSearched}
        />
      </div>
    </div>
  );
}