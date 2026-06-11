"use client";

import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";
import type {
  SearchFilterValues,
  SearchSortValue,
} from "@/components/SearchPageClient";

type SearchFiltersProps = {
  filters: SearchFilterValues;
  onFiltersChange: (filters: SearchFilterValues) => void;
  includeHidden: boolean;
  onIncludeHiddenChange: (includeHidden: boolean) => void;
  sortValue: SearchSortValue;
  onSortValueChange: (sortValue: SearchSortValue) => void;
  onClearFilters: () => void;
};

export default function SearchFilters({
  filters,
  onFiltersChange,
  includeHidden,
  onIncludeHiddenChange,
  sortValue,
  onSortValueChange,
  onClearFilters,
}: SearchFiltersProps) {
  function updateFilter(field: keyof SearchFilterValues, value: string) {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Filters</h2>
          <p className="mt-2 text-sm text-slate-600">
            Results update automatically as you enter filter values.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={includeHidden}
            onChange={(event) => onIncludeHiddenChange(event.target.checked)}
            className="h-4 w-4"
          />
          Include hidden activities
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Activity Name
          </span>
          <input
            value={filters.activityName}
            onChange={(event) =>
              updateFilter("activityName", event.target.value)
            }
            placeholder="Search by name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Field Location
          </span>
          <select
            value={filters.fieldLocation}
            onChange={(event) =>
              updateFilter("fieldLocation", event.target.value)
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            <option value="">Any field location</option>
            {fieldLocationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Game Phase
          </span>
          <select
            value={filters.gamePhase}
            onChange={(event) => updateFilter("gamePhase", event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            <option value="">Any game phase</option>
            {gamePhaseOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Category</span>
          <select
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            <option value="">Any category</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Positions Involved
          </span>
          <input
            value={filters.positionsInvolved}
            onChange={(event) =>
              updateFilter("positionsInvolved", event.target.value)
            }
            placeholder="Example: 6, 8, 10"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Number of Players
          </span>
          <input
            type="text"
            value={filters.numberOfPlayers}
            onChange={(event) =>
              updateFilter("numberOfPlayers", event.target.value)
            }
            placeholder="Example: 8, 6-10, 8+, <12"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-sm font-semibold text-slate-700">
          Activity Details
        </span>
        <input
          value={filters.activityDetails}
          onChange={(event) =>
            updateFilter("activityDetails", event.target.value)
          }
          placeholder="Search activity details"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
      </label>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <label className="grid min-w-64 gap-2">
          <span className="text-sm font-semibold text-slate-700">Sort By</span>
          <select
            value={sortValue}
            onChange={(event) =>
              onSortValueChange(event.target.value as SearchSortValue)
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            <option value="activityNameAsc">Activity Name A-Z</option>
            <option value="activityNameDesc">Activity Name Z-A</option>
            <option value="newestFirst">Newest First</option>
            <option value="oldestFirst">Oldest First</option>
            <option value="playersLowToHigh">Players Low to High</option>
            <option value="playersHighToLow">Players High to Low</option>
          </select>
        </label>

        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
        >
          Clear Filters
        </button>
      </div>
    </section>
  );
}