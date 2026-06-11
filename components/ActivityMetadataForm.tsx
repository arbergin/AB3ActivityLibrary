"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";
import { saveStoredActivity } from "@/lib/activityStorage";
import type { Activity } from "@/types/activity";

type ActivityMetadataFormProps = {
  selectedFileName?: string;
  selectedFileType?: string;
  previewDataUrl?: string;
};

export default function ActivityMetadataForm({
  selectedFileName,
  selectedFileType,
  previewDataUrl,
}: ActivityMetadataFormProps) {
  const router = useRouter();

  const [activityName, setActivityName] = useState("");
  const [fieldLocation, setFieldLocation] =
    useState<Activity["fieldLocation"]>("First Third");
  const [gamePhase, setGamePhase] =
    useState<Activity["gamePhase"]>("Attacking");
  const [category, setCategory] =
    useState<Activity["category"]>("Small-Sided Games");
  const [positionsInvolved, setPositionsInvolved] = useState("");
  const [numberOfPlayers, setNumberOfPlayers] = useState("");
  const [activityDetails, setActivityDetails] = useState("");
  const [formError, setFormError] = useState("");

  function handleSaveActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activityName.trim()) {
      setFormError("Activity Name is required.");
      return;
    }

    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      activityName: activityName.trim(),
      fieldLocation,
      gamePhase,
      category,
      positionsInvolved: positionsInvolved.trim(),
      numberOfPlayers: numberOfPlayers ? Number(numberOfPlayers) : "",
      activityDetails: activityDetails.trim(),
      createdBy: "Coach User",
      hidden: false,
      fileName: selectedFileName,
      fileType: selectedFileType,
      previewDataUrl,
      createdAt: new Date().toISOString(),
    };

    saveStoredActivity(newActivity);

    router.push(`/activity/${newActivity.id}`);
  }

  function handleCancel() {
    setActivityName("");
    setFieldLocation("First Third");
    setGamePhase("Attacking");
    setCategory("Small-Sided Games");
    setPositionsInvolved("");
    setNumberOfPlayers("");
    setActivityDetails("");
    setFormError("");
  }

  return (
    <form
      onSubmit={handleSaveActivity}
      className="rounded-xl bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-bold">Activity Metadata</h2>

      <p className="mt-2 text-sm text-slate-600">
        Add searchable details for this activity. These fields will power the
        library search later.
      </p>

      {selectedFileName && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <span className="font-semibold">Selected file:</span>{" "}
          {selectedFileName}
        </div>
      )}

      {previewDataUrl && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Attached PNG Preview
          </div>

          <img
            src={previewDataUrl}
            alt="Activity preview"
            className="max-h-80 w-full rounded-lg border border-slate-200 object-contain"
          />
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm font-semibold">
            Activity Name <span className="text-red-600">*</span>
          </span>
          <input
            type="text"
            value={activityName}
            onChange={(event) => setActivityName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Example: 3v2 to Counter"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Field Location</span>
            <select
              value={fieldLocation}
              onChange={(event) =>
                setFieldLocation(event.target.value as Activity["fieldLocation"])
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {fieldLocationOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Game Phase</span>
            <select
              value={gamePhase}
              onChange={(event) =>
                setGamePhase(event.target.value as Activity["gamePhase"])
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {gamePhaseOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Category</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as Activity["category"])
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {categoryOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Positions Involved</span>
            <input
              type="text"
              value={positionsInvolved}
              onChange={(event) => setPositionsInvolved(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Example: 9, 10, Wingers"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Number of Players</span>
            <input
              type="number"
              value={numberOfPlayers}
              onChange={(event) => setNumberOfPlayers(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Example: 8"
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm font-semibold">Activity Details</span>
          <textarea
            value={activityDetails}
            onChange={(event) => setActivityDetails(event.target.value)}
            className="min-h-32 rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Describe setup, rules, coaching points, progressions, or constraints."
          />
        </label>

        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
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
            Save Activity
          </button>
        </div>
      </div>
    </form>
  );
}