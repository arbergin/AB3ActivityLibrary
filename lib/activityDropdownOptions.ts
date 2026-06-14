"use client";

import {
  categoryOptions as fallbackCategoryOptions,
  fieldLocationOptions as fallbackFieldLocationOptions,
  gamePhaseOptions as fallbackGamePhaseOptions,
} from "@/lib/activityOptions";
import { supabase } from "@/lib/supabaseClient";

export type ActivityDropdownKey = "fieldLocation" | "gamePhase" | "category";

export type ActivityDropdownOptionRow = {
  id: string;
  dropdown_key: ActivityDropdownKey;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ActivityDropdownOptions = {
  fieldLocationOptions: string[];
  gamePhaseOptions: string[];
  categoryOptions: string[];
};

export const ACTIVITY_DROPDOWN_LABELS: Record<ActivityDropdownKey, string> = {
  fieldLocation: "Field Location",
  gamePhase: "Game Phase",
  category: "Category",
};

export const ACTIVITY_DROPDOWN_KEYS: ActivityDropdownKey[] = [
  "fieldLocation",
  "gamePhase",
  "category",
];

const TABLE_NAME = "activity_dropdown_options";

const fallbackOptions: ActivityDropdownOptions = {
  fieldLocationOptions: [...fallbackFieldLocationOptions],
  gamePhaseOptions: [...fallbackGamePhaseOptions],
  categoryOptions: [...fallbackCategoryOptions],
};

function normalizeDropdownKey(value: unknown): ActivityDropdownKey | undefined {
  if (
    value === "fieldLocation" ||
    value === "field_location" ||
    value === "Field Location"
  ) {
    return "fieldLocation";
  }

  if (value === "gamePhase" || value === "game_phase" || value === "Game Phase") {
    return "gamePhase";
  }

  if (value === "category" || value === "Category") {
    return "category";
  }

  return undefined;
}

function normalizeRow(row: Record<string, unknown>): ActivityDropdownOptionRow | undefined {
  const dropdownKey = normalizeDropdownKey(
    row.dropdown_key ?? row.dropdown_type ?? row.type ?? row.category
  );

  const labelValue =
    row.label ?? row.option_label ?? row.option_value ?? row.value ?? row.name;

  const label = typeof labelValue === "string" ? labelValue.trim() : "";

  if (!dropdownKey || !label) {
    return undefined;
  }

  const idValue = row.id;
  const id =
    typeof idValue === "string" && idValue.trim()
      ? idValue
      : `${dropdownKey}-${label}`;

  const sortOrderValue = row.sort_order ?? row.display_order ?? row.order_index;
  const sortOrder =
    typeof sortOrderValue === "number"
      ? sortOrderValue
      : Number.isFinite(Number(sortOrderValue))
        ? Number(sortOrderValue)
        : 0;

  const isActiveValue = row.is_active ?? row.active;
  const isActive =
    typeof isActiveValue === "boolean" ? isActiveValue : isActiveValue !== false;

  return {
    id,
    dropdown_key: dropdownKey,
    label,
    sort_order: sortOrder,
    is_active: isActive,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function rowsToOptions(rows: ActivityDropdownOptionRow[]): ActivityDropdownOptions {
  const activeRows = rows
    .filter((row) => row.is_active)
    .sort((a, b) => {
      if (a.dropdown_key !== b.dropdown_key) {
        return a.dropdown_key.localeCompare(b.dropdown_key);
      }

      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }

      return a.label.localeCompare(b.label);
    });

  const fieldLocationOptions = activeRows
    .filter((row) => row.dropdown_key === "fieldLocation")
    .map((row) => row.label);

  const gamePhaseOptions = activeRows
    .filter((row) => row.dropdown_key === "gamePhase")
    .map((row) => row.label);

  const categoryOptions = activeRows
    .filter((row) => row.dropdown_key === "category")
    .map((row) => row.label);

  return {
    fieldLocationOptions:
      fieldLocationOptions.length > 0
        ? fieldLocationOptions
        : fallbackOptions.fieldLocationOptions,
    gamePhaseOptions:
      gamePhaseOptions.length > 0
        ? gamePhaseOptions
        : fallbackOptions.gamePhaseOptions,
    categoryOptions:
      categoryOptions.length > 0 ? categoryOptions : fallbackOptions.categoryOptions,
  };
}

export function getFallbackActivityDropdownOptions(): ActivityDropdownOptions {
  return {
    fieldLocationOptions: [...fallbackOptions.fieldLocationOptions],
    gamePhaseOptions: [...fallbackOptions.gamePhaseOptions],
    categoryOptions: [...fallbackOptions.categoryOptions],
  };
}

export async function listActivityDropdownOptionRows() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .order("dropdown_key", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load activity dropdown option rows.", error);
    throw error;
  }

  return ((data || []) as Record<string, unknown>[])
    .map(normalizeRow)
    .filter((row): row is ActivityDropdownOptionRow => Boolean(row));
}

export async function getActiveActivityDropdownOptions() {
  try {
    const rows = await listActivityDropdownOptionRows();
    return rowsToOptions(rows);
  } catch (error) {
    console.error("Using fallback activity dropdown options.", error);
    return getFallbackActivityDropdownOptions();
  }
}

export async function createActivityDropdownOption(
  dropdownKey: ActivityDropdownKey,
  label: string
) {
  const cleanLabel = label.trim();

  if (!cleanLabel) {
    throw new Error("Dropdown value is required.");
  }

  const existingRows = await listActivityDropdownOptionRows();
  const rowsForDropdown = existingRows.filter(
    (row) => row.dropdown_key === dropdownKey
  );

  const duplicate = rowsForDropdown.some(
    (row) => row.label.toLowerCase() === cleanLabel.toLowerCase()
  );

  if (duplicate) {
    throw new Error("That dropdown value already exists.");
  }

  const nextSortOrder =
    rowsForDropdown.length === 0
      ? 1
      : Math.max(...rowsForDropdown.map((row) => row.sort_order)) + 1;

  const { error } = await supabase.from(TABLE_NAME).insert({
    dropdown_key: dropdownKey,
    label: cleanLabel,
    sort_order: nextSortOrder,
    is_active: true,
  });

  if (error) {
    console.error("Failed to create activity dropdown option.", error);
    throw error;
  }
}

export async function updateActivityDropdownOptionLabel(
  optionId: string,
  label: string
) {
  const cleanLabel = label.trim();

  if (!cleanLabel) {
    throw new Error("Dropdown value is required.");
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      label: cleanLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", optionId);

  if (error) {
    console.error("Failed to update activity dropdown option.", error);
    throw error;
  }
}

export async function setActivityDropdownOptionActive(
  optionId: string,
  isActive: boolean
) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", optionId);

  if (error) {
    console.error("Failed to update activity dropdown option status.", error);
    throw error;
  }
}

export async function saveActivityDropdownOptionOrder(
  rows: ActivityDropdownOptionRow[]
) {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        sort_order: index + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (error) {
      console.error("Failed to save activity dropdown option order.", error);
      throw error;
    }
  }
}

export async function moveActivityDropdownOption(
  optionId: string,
  direction: "up" | "down"
) {
  const rows = await listActivityDropdownOptionRows();
  const option = rows.find((row) => row.id === optionId);

  if (!option) {
    throw new Error("Dropdown option was not found.");
  }

  const rowsForDropdown = rows
    .filter((row) => row.dropdown_key === option.dropdown_key)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }

      return a.label.localeCompare(b.label);
    });

  const currentIndex = rowsForDropdown.findIndex((row) => row.id === optionId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= rowsForDropdown.length
  ) {
    return;
  }

  const reorderedRows = [...rowsForDropdown];
  const [movedRow] = reorderedRows.splice(currentIndex, 1);
  reorderedRows.splice(targetIndex, 0, movedRow);

  await saveActivityDropdownOptionOrder(reorderedRows);
}
