"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getActivityFormDropdownOptions,
  type ActivityFormDropdownOptions,
} from "@/lib/dropdownService";
import type { Activity, ActivityVisibility } from "@/types/activity";

export type InlineMetadataDraft = {
  fieldLocation: string;
  gamePhase: string;
  category: string;
  numberOfPlayers: string;
  positionsInvolved: string;
  visibility: ActivityVisibility;
};

const emptyOptions: ActivityFormDropdownOptions = {
  fieldLocationOptions: [],
  gamePhaseOptions: [],
  categoryOptions: [],
};

export function activityToInlineMetadataDraft(
  activity: Activity
): InlineMetadataDraft {
  return {
    fieldLocation: activity.fieldLocation || "",
    gamePhase: activity.gamePhase || "",
    category: activity.category || "",
    numberOfPlayers:
      activity.numberOfPlayers === "" ||
      activity.numberOfPlayers === undefined
        ? ""
        : String(activity.numberOfPlayers),
    positionsInvolved: activity.positionsInvolved || "",
    visibility: activity.visibility || "private",
  };
}

export function inlineMetadataDraftToActivity(
  activity: Activity,
  draft: InlineMetadataDraft
): Activity {
  return {
    ...activity,
    fieldLocation: draft.fieldLocation.trim(),
    gamePhase: draft.gamePhase.trim(),
    category: draft.category.trim(),
    numberOfPlayers: draft.numberOfPlayers.trim()
      ? Number(draft.numberOfPlayers)
      : "",
    positionsInvolved: draft.positionsInvolved.trim(),
    visibility: draft.visibility,
    clubId: draft.visibility === "club" ? activity.clubId || null : null,
    updatedAt: new Date().toISOString(),
  };
}

export function isValidInlineMetadataDraft(draft: InlineMetadataDraft) {
  const value = draft.numberOfPlayers.trim();

  if (!value) {
    return true;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
}

type InlineActivityMetadataFieldsProps = {
  activity: Activity;
  canEdit: boolean;
  draft: InlineMetadataDraft;
  onDraftChange: (draft: InlineMetadataDraft) => void;
  disabled?: boolean;
};

export default function InlineActivityMetadataFields({
  activity,
  canEdit,
  draft,
  onDraftChange,
  disabled = false,
}: InlineActivityMetadataFieldsProps) {
  const [options, setOptions] =
    useState<ActivityFormDropdownOptions>(emptyOptions);

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      const nextOptions = await getActivityFormDropdownOptions();

      if (isMounted) {
        setOptions(nextOptions);
      }
    }

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  function includeCurrentValue(values: string[], currentValue: string) {
    const trimmedValue = currentValue.trim();

    if (!trimmedValue || values.includes(trimmedValue)) {
      return values;
    }

    return [trimmedValue, ...values];
  }

  const fieldLocationOptions = useMemo(
    () => includeCurrentValue(options.fieldLocationOptions, draft.fieldLocation),
    [draft.fieldLocation, options.fieldLocationOptions]
  );

  const gamePhaseOptions = useMemo(
    () => includeCurrentValue(options.gamePhaseOptions, draft.gamePhase),
    [draft.gamePhase, options.gamePhaseOptions]
  );

  const categoryOptions = useMemo(
    () => includeCurrentValue(options.categoryOptions, draft.category),
    [draft.category, options.categoryOptions]
  );

  function updateField<K extends keyof InlineMetadataDraft>(
    field: K,
    value: InlineMetadataDraft[K]
  ) {
    onDraftChange({
      ...draft,
      [field]: value,
    });
  }

  if (!canEdit) {
    const visibilityLabel =
      activity.visibility === "club"
        ? "My Club"
        : activity.visibility === "everyone"
          ? "Everyone"
          : "Private";

    return (
      <>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <MetadataValue label="Field Location" value={activity.fieldLocation} />
          <MetadataValue label="Game Phase" value={activity.gamePhase} />
          <MetadataValue label="Category" value={activity.category} />
          <MetadataValue
            label="Number of Players"
            value={activity.numberOfPlayers}
          />
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <MetadataValue
            label="Positions Involved"
            value={activity.positionsInvolved}
          />
          <MetadataValue label="Activity Visibility" value={visibilityLabel} />
        </div>
      </>
    );
  }

  const selectClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#0d2140] focus:outline-none focus:ring-2 focus:ring-[#0d2140]/20 disabled:cursor-not-allowed disabled:bg-slate-100";
  const inputClass = selectClass;

  return (
    <>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="font-semibold text-slate-700">Field Location</span>
          <select
            value={draft.fieldLocation}
            onChange={(event) =>
              updateField("fieldLocation", event.target.value)
            }
            disabled={disabled}
            className={selectClass}
          >
            <option value="">No selection</option>
            {fieldLocationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="font-semibold text-slate-700">Game Phase</span>
          <select
            value={draft.gamePhase}
            onChange={(event) => updateField("gamePhase", event.target.value)}
            disabled={disabled}
            className={selectClass}
          >
            <option value="">No selection</option>
            {gamePhaseOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="font-semibold text-slate-700">Category</span>
          <select
            value={draft.category}
            onChange={(event) => updateField("category", event.target.value)}
            disabled={disabled}
            className={selectClass}
          >
            <option value="">No selection</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="font-semibold text-slate-700">
            Number of Players
          </span>
          <input
            type="number"
            min="1"
            step="1"
            value={draft.numberOfPlayers}
            onChange={(event) =>
              updateField("numberOfPlayers", event.target.value)
            }
            disabled={disabled}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="font-semibold text-slate-700">
            Positions Involved
          </span>
          <input
            type="text"
            value={draft.positionsInvolved}
            onChange={(event) =>
              updateField("positionsInvolved", event.target.value)
            }
            disabled={disabled}
            className={inputClass}
          />
        </label>

        <label className="grid gap-1">
          <span className="font-semibold text-slate-700">
            Activity Visibility
          </span>
          <select
            value={draft.visibility}
            onChange={(event) =>
              updateField(
                "visibility",
                event.target.value as ActivityVisibility
              )
            }
            disabled={disabled}
            className={selectClass}
          >
            <option value="private">Private</option>
            <option value="club">My Club</option>
            <option value="everyone">Everyone</option>
          </select>
        </label>
      </div>
    </>
  );
}

function MetadataValue({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <div className="font-semibold text-slate-700">{label}</div>
      <div className="break-words text-slate-600">{value || "—"}</div>
    </div>
  );
}
