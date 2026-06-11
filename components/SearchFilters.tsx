"use client";

import { useState } from "react";
import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";

type SearchFiltersProps = {
  includeHidden: boolean;
  onIncludeHiddenChange: (includeHidden: boolean) => void;
};

export default function SearchFilters({
  includeHidden,
  onIncludeHiddenChange,
}: SearchFiltersProps) {
  const [activityName, setActivityName] = useState("");
  const [fieldLocation, setFieldLocation] = useState("");
  const [gamePhase, setGamePhase] = useState("");
  const [category, setCategory] = useState("");
  const [positionsInvolved, setPositionsInvolved] = useState("");
  const [numberOfPlayers, setNumberOfPlayers] = useState("");
  const [activityDetails, setActivityDetails] = useState("");
  const [searchMessage, setSearchMessage] = useState("");

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSearchMessage(
      "Search filters applied. Database search will be connected in a later step."
    );
  }

  function handleClear() {
    setActivityName("");
    setFieldLocation("");
    setGamePhase("");
    setCategory("");
    setPositionsInvolved("");
    setNumberOfPlayers("");
    setActivityDetails("");
    onIncludeHiddenChange(false);
    setSearchMessage("");
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Search Activities</h2>
      <p className="mt-2 text-sm text-slate-600">
        Search by any activity metadata field. Results will appear below.
      </p>

      <form onSubmit={handleSearch} className="mt-6 grid gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Activity Name</span>
            <input
              type="text"
              value={activityName}
              onChange={(event) => setActivityName(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Contains text"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Field Location</span>
            <select
              value={fieldLocation}
              onChange={(event) => setFieldLocation(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Any</option>
              {fieldLocationOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Game Phase</span>
            <select
              value={gamePhase}
              onChange={(event) => setGamePhase(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Any</option>
              {gamePhaseOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Any</option>
              {categoryOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Positions Involved</span>
            <input
              type="text"
              value={positionsInvolved}
              onChange={(event) => setPositionsInvolved(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Contains text"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Number of Players</span>
            <input
              type="number"
              value={numberOfPlayers}
              onChange={(event) => setNumberOfPlayers(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="#"
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm font-semibold">Activity Details</span>
          <input
            type="text"
            value={activityDetails}
            onChange={(event) => setActivityDetails(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Keyword search"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeHidden}
            onChange={(event) => onIncludeHiddenChange(event.target.checked)}
          />
          Include hidden activities
          <span className="text-xs text-slate-400">Admin only later</span>
        </label>

        {searchMessage && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {searchMessage}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
          >
            Clear
          </button>

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            Search
          </button>
        </div>
      </form>
    </div>
  );
}