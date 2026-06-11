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

  function handleClearFilters() {
    setFilters(emptyFilters);
    setIncludeHidden(false);
  }

  return (
    <div className="grid gap-8">
      <SearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        includeHidden={includeHidden}
        onIncludeHiddenChange={setIncludeHidden}
        onClearFilters={handleClearFilters}
      />

      <SearchResultsPanel includeHidden={includeHidden} filters={filters} />
    </div>
  );
}