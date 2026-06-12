"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveStoredActivity } from "@/lib/activityStorage";
import { createSupabaseActivity } from "@/lib/supabaseActivities";
import { getDropdownFields } from "@/lib/dropdownService";
import {
  getActiveDropdownOptions,
  getDropdownField,
} from "@/lib/dropdownHelpers";
import type { DropdownField } from "@/lib/dropdownTypes";
import type { Activity } from "@/types/activity";

type ActivityMetadataFormProps = {
  selectedFileName?: string;
  selectedFileType?: string;
  previewDataUrl?: string;
};

function createLocalFallbackActivity(activity: Activity): Activity {
  return {
    ...activity,
    previewDataUrl: undefined,
  };
}

export default function ActivityMetadataForm({
  selectedFileName,
  selectedFileType,
  previewDataUrl,
}: ActivityMetadataFormProps) {
  const router = useRouter();

  const [dropdownFields, setDropdownFields] = useState<DropdownField[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState("");

  const [activityName, setActivityName] = useState("");
  const [fieldLocation, setFieldLocation] = useState("");
  const [gamePhase, setGamePhase] = useState("");
  const [category, setCategory] = useState("");
  const [positionsInvolved, setPositionsInvolved] = useState("");
  const [numberOfPlayers, setNumberOfPlayers] = useState("");
  const [activityDetails, setActivityDetails] = useState("");
  const [formError, setFormError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fieldLocationOptions = getActiveDropdownOptions(
    dropdownFields,
    "fieldLocation"
  );

  const gamePhaseOptions = getActiveDropdownOptions(dropdownFields, "gamePhase");

  const categoryOptions = getActiveDropdownOptions(dropdownFields, "category");

  useEffect(() => {
    async function loadDropdowns() {
      try {
        setIsLoadingDropdowns(true);
        setDropdownError("");

        const fields = await getDropdownFields();
        setDropdownFields(fields);
      } catch (error) {
        console.error("Unable to load dropdown options.", error);
        setDropdownError(
          "Dropdown options could not be loaded. Check Supabase dropdown tables and RLS policies."
        );
      } finally {
        setIsLoadingDropdowns(false);
      }
    }

    loadDropdowns();
  }, []);

  async function handleSaveActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setFormError("");
    setSaveMessage("");

    if (!activityName.trim()) {
      setFormError("Activity Name is required.");
      return;
    }

    if (!getDropdownField(dropdownFields, "fieldLocation")) {
      setFormError("Field Location dropdown is missing from Settings.");
      return;
    }

    if (!getDropdownField(dropdownFields, "gamePhase")) {
      setFormError("Game Phase dropdown is missing from Settings.");
      return;
    }

    if (!getDropdownField(dropdownFields, "category")) {
      setFormError("Category dropdown is missing from Settings.");
      return;
    }

    const now = new Date().toISOString();

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
      createdAt: now,
      updatedAt: now,
    };

    setIsSaving(true);
    setSaveMessage("Saving activity to Supabase...");

    try {
      const savedSupabaseActivity = await createSupabaseActivity(newActivity);

      router.push(`/activity/${savedSupabaseActivity.id}`);
    } catch (error) {
      console.error(
        "Supabase save failed. Saving metadata locally instead.",
        error
      );

      const localFallbackActivity = createLocalFallbackActivity(newActivity);

      try {
        saveStoredActivity(localFallbackActivity);
        setSaveMessage(
          "Supabase save failed, so the activity metadata was saved locally in this browser."
        );
        router.push(`/activity/${localFallbackActivity.id}`);
      } catch (localError) {
        console.error("Local fallback save failed.", localError);
        setFormError(
          "The activity could not be saved to Supabase or local storage."
        );
      }
    } finally {
      setIsSaving(false);
    }
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

      {previewDataUrl && selectedFileType === "application/pdf" && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Attached PDF Preview
          </div>

          <iframe
            src={previewDataUrl}
            title="Activity PDF preview"
            className="h-[520px] w-full rounded-lg border border-slate-200"
          />
        </div>
      )}

      {previewDataUrl && selectedFileType !== "application/pdf" && (
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

      {dropdownError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {dropdownError}
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
              onChange={(event) => setFieldLocation(event.target.value)}
              disabled={isLoadingDropdowns}
              className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            >
              <option value="">
                {isLoadingDropdowns
                  ? "Loading field locations..."
                  : "Select field location"}
              </option>

              {fieldLocationOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Game Phase</span>
            <select
              value={gamePhase}
              onChange={(event) => setGamePhase(event.target.value)}
              disabled={isLoadingDropdowns}
              className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            >
              <option value="">
                {isLoadingDropdowns
                  ? "Loading game phases..."
                  : "Select game phase"}
              </option>

              {gamePhaseOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={isLoadingDropdowns}
              className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            >
              <option value="">
                {isLoadingDropdowns
                  ? "Loading categories..."
                  : "Select category"}
              </option>

              {categoryOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
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
              min="1"
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

        {saveMessage && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {saveMessage}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSaving || isLoadingDropdowns}
            className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Activity"}
          </button>
        </div>
      </div>
    </form>
  );
}