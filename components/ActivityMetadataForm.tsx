"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";
import {
  saveStoredActivity,
  updateStoredActivity,
} from "@/lib/activityStorage";
import {
  createSupabaseActivity,
  updateSupabaseActivity,
} from "@/lib/supabaseActivities";
import type { Activity, ActivityCreatorState } from "@/types/activity";

type ActivityMetadataFormProps = {
  mode?: "import" | "create";
  selectedFileName?: string;
  selectedFileType?: string;
  previewDataUrl?: string;
  creatorState?: ActivityCreatorState;
  initialActivity?: Activity;
  getPreviewDataUrl?: () => Promise<string | undefined>;
  onCancel?: () => void;
  onSaved?: (activity: Activity) => void;
};

export default function ActivityMetadataForm({
  mode = "import",
  selectedFileName,
  selectedFileType,
  previewDataUrl,
  creatorState,
  initialActivity,
  getPreviewDataUrl,
  onCancel,
  onSaved,
}: ActivityMetadataFormProps) {
  const router = useRouter();

  const [activityName, setActivityName] = useState(
    initialActivity?.activityName || ""
  );
  const [fieldLocation, setFieldLocation] =
    useState<Activity["fieldLocation"]>(initialActivity?.fieldLocation || "");
  const [gamePhase, setGamePhase] = useState<Activity["gamePhase"]>(
    initialActivity?.gamePhase || ""
  );
  const [category, setCategory] = useState<Activity["category"]>(
    initialActivity?.category || ""
  );
  const [positionsInvolved, setPositionsInvolved] = useState(
    initialActivity?.positionsInvolved || ""
  );
  const [numberOfPlayers, setNumberOfPlayers] = useState(
    initialActivity?.numberOfPlayers === "" ||
      initialActivity?.numberOfPlayers === undefined
      ? ""
      : String(initialActivity.numberOfPlayers)
  );
  const [activityDetails, setActivityDetails] = useState(
    initialActivity?.activityDetails || ""
  );
  const [formError, setFormError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = Boolean(initialActivity?.id);

  function createPreviewFileName(name: string) {
    const safeName = name
      .trim()
      .replace(/[^a-z0-9-_ ]/gi, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    return `${safeName || "created_activity"}.png`;
  }

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

    setIsSaving(true);

    let activityPreviewDataUrl = mode === "import" ? previewDataUrl : undefined;
    let activityFileName = mode === "import" ? selectedFileName : undefined;
    let activityFileType = mode === "import" ? selectedFileType : undefined;

    if (mode === "create") {
      setSaveMessage("Creating preview image...");

      try {
        activityPreviewDataUrl = await getPreviewDataUrl?.();
      } catch (error) {
        console.error("Created activity preview generation failed.", error);
        setFormError(
          "The activity could not be saved because the preview image could not be created."
        );
        setSaveMessage("");
        setIsSaving(false);
        return;
      }

      if (!activityPreviewDataUrl) {
        setFormError(
          "The activity could not be saved because the preview image could not be created."
        );
        setSaveMessage("");
        setIsSaving(false);
        return;
      }

      activityFileName = createPreviewFileName(activityName);
      activityFileType = "image/png";
    }

    const now = new Date().toISOString();

    const newActivity: Activity = {
      id: initialActivity?.id || `activity-${Date.now()}`,
      activityName: activityName.trim(),
      fieldLocation,
      gamePhase,
      category,
      positionsInvolved: positionsInvolved.trim(),
      numberOfPlayers: numberOfPlayers ? Number(numberOfPlayers) : "",
      activityDetails: activityDetails.trim(),
      createdBy: initialActivity?.createdBy || "Coach User",
      hidden: initialActivity?.hidden || false,
      activitySource: mode,
      creatorState: mode === "create" ? creatorState : undefined,
      fileName: activityFileName,
      fileType: activityFileType,
      previewDataUrl: activityPreviewDataUrl,
      createdAt: initialActivity?.createdAt || now,
      updatedAt: now,
    };

    setSaveMessage(isEditMode ? "Updating activity..." : "Saving activity...");

    try {
      const savedSupabaseActivity =
        isEditMode && initialActivity
          ? await updateSupabaseActivity(newActivity)
          : await createSupabaseActivity(newActivity);

      const savedActivity: Activity = {
        ...newActivity,
        id: savedSupabaseActivity.id,
        createdBy: savedSupabaseActivity.createdBy,
        createdAt: savedSupabaseActivity.createdAt,
        updatedAt: savedSupabaseActivity.updatedAt,
      };

      if (isEditMode) {
        updateStoredActivity(savedActivity);
      } else {
        saveStoredActivity(savedActivity);
      }

      onSaved?.(savedActivity);
      router.push(`/activity/${savedSupabaseActivity.id}`);
    } catch (error) {
      console.error("Supabase save failed. Saving locally instead.", error);

      if (isEditMode) {
        const updatedLocalActivity = updateStoredActivity(newActivity);
        const activityToUse = updatedLocalActivity || newActivity;

        setSaveMessage(
          "Supabase update failed, so the activity was updated locally in this browser."
        );

        onSaved?.(activityToUse);
        router.push(`/activity/${activityToUse.id}`);
        return;
      }

      saveStoredActivity(newActivity);

      setSaveMessage(
        "Supabase save failed, so the activity was saved locally in this browser."
      );

      onSaved?.(newActivity);
      router.push(`/activity/${newActivity.id}`);
    } finally {
      setIsSaving(false);
    }
  }

  function handleClearForm() {
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

  function renderFieldLocationSelect() {
    return (
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Field Location</span>
        <select
          value={fieldLocation}
          onChange={(event) =>
            setFieldLocation(event.target.value as Activity["fieldLocation"])
          }
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Select field location</option>
          {fieldLocationOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  function renderGamePhaseSelect() {
    return (
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Game Phase</span>
        <select
          value={gamePhase}
          onChange={(event) =>
            setGamePhase(event.target.value as Activity["gamePhase"])
          }
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Select game phase</option>
          {gamePhaseOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  function renderCategorySelect() {
    return (
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Category</span>
        <select
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as Activity["category"])
          }
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Select category</option>
          {categoryOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <form
      onSubmit={handleSaveActivity}
      className="rounded-xl bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Activity Metadata</h2>

          <p className="mt-2 text-sm text-slate-600">
            Add searchable details for this activity. These fields will power
            the library search later.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-full px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close metadata form"
            title="Close"
          >
            ×
          </button>
        )}
      </div>

      {mode === "import" && selectedFileName && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <span className="font-semibold">Selected file:</span>{" "}
          {selectedFileName}
        </div>
      )}

      {mode === "import" &&
        previewDataUrl &&
        selectedFileType === "application/pdf" && (
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

      {mode === "import" &&
        previewDataUrl &&
        selectedFileType !== "application/pdf" && (
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

      {mode === "create" && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          This will save the editable activity layout, including the pitch,
          icons, lines, colors, and sizes. A PNG preview will also be created
          for the activity detail and search result screens.
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

        {mode === "create" ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              {renderFieldLocationSelect()}
              {renderGamePhaseSelect()}
            </div>

            {renderCategorySelect()}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {renderFieldLocationSelect()}
            {renderGamePhaseSelect()}
            {renderCategorySelect()}
          </div>
        )}

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

        {saveMessage && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {saveMessage}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClearForm}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear Form
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? isEditMode
                ? "Updating..."
                : "Saving..."
              : isEditMode
                ? "Update Activity"
                : mode === "create"
                  ? "Save Editable Activity"
                  : "Save Activity"}
          </button>
        </div>
      </div>
    </form>
  );
}
