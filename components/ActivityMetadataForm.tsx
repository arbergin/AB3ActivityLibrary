"use client";

import { useState } from "react";
import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";

type ActivityMetadataFormProps = {
  selectedFileName?: string;
};

export default function ActivityMetadataForm({
  selectedFileName,
}: ActivityMetadataFormProps) {
  const [activityName, setActivityName] = useState("");
  const [fieldLocation, setFieldLocation] = useState("");
  const [gamePhase, setGamePhase] = useState("");
  const [category, setCategory] = useState("");
  const [positionsInvolved, setPositionsInvolved] = useState("");
  const [numberOfPlayers, setNumberOfPlayers] = useState("");
  const [activityDetails, setActivityDetails] = useState("");
  const [formError, setFormError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setSaveMessage("");

    if (!activityName.trim()) {
      setFormError("Activity Name is required.");
      return;
    }

    setSaveMessage(
      `Saved draft activity: ${activityName.trim()}${
        selectedFileName ? ` from ${selectedFileName}` : ""
      }`
    );
  }

  function handleCancel() {
    setActivityName("");
    setFieldLocation("");
    setGamePhase("");
    setCategory("");
    setPositionsInvolved("");
    setNumberOfPlayers("");
    setActivityDetails("");
    setFormError("");
    setSaveMessage("");
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Activity Metadata</h2>

      {selectedFileName && (
        <p className="mt-2 text-sm text-slate-600">
          File: <span className="font-semibold">{selectedFileName}</span>
        </p>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          File preview
          <div className="mt-2 text-xs">PNG or PDF page thumbnail</div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Activity Name *</span>
            <input
              type="text"
              value={activityName}
              onChange={(event) => setActivityName(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Free text"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Field Location</span>
            <select
              value={fieldLocation}
              onChange={(event) => setFieldLocation(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Select value</option>
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
              <option value="">Select value</option>
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
              <option value="">Select value</option>
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
              placeholder="Free text"
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

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Activity Details</span>
            <textarea
              value={activityDetails}
              onChange={(event) => setActivityDetails(event.target.value)}
              className="min-h-32 rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Rules, setup, coaching points, progressions, constraints, etc."
            />
          </label>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {saveMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {saveMessage}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>

      <p className="mt-4 text-sm text-slate-500">* Required</p>
    </div>
  );
}