"use client";

import { useState } from "react";
import SearchFilters from "@/components/SearchFilters";
import SearchResultsPanel from "@/components/SearchResultsPanel";

export default function SearchPageClient() {
  const [includeHidden, setIncludeHidden] = useState(false);

  return (
    <div className="grid gap-8">
      <SearchFilters
        includeHidden={includeHidden}
        onIncludeHiddenChange={setIncludeHidden}
      />

      <SearchResultsPanel includeHidden={includeHidden} />
    </div>
  );
}