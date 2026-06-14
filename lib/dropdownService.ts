import { supabase } from "@/lib/supabaseClient";
import {
  categoryOptions as fallbackCategoryOptions,
  fieldLocationOptions as fallbackFieldLocationOptions,
  gamePhaseOptions as fallbackGamePhaseOptions,
} from "@/lib/activityOptions";
import { sortDropdownFields } from "@/lib/dropdownHelpers";
import type { DropdownField } from "@/lib/dropdownTypes";

export async function getDropdownFields() {
  const { data, error } = await supabase
    .from("dropdown_fields")
    .select(
      `
      id,
      field_key,
      label,
      sort_order,
      active,
      created_at,
      dropdown_options (
        id,
        field_id,
        value,
        label,
        sort_order,
        active,
        created_at
      )
    `
    )
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return sortDropdownFields((data ?? []) as DropdownField[]);
}

export async function updateDropdownFieldLabel({
  fieldId,
  label,
}: {
  fieldId: string;
  label: string;
}) {
  const { error } = await supabase
    .from("dropdown_fields")
    .update({ label })
    .eq("id", fieldId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addDropdownOption({
  fieldId,
  label,
  value,
  sortOrder,
}: {
  fieldId: string;
  label: string;
  value: string;
  sortOrder: number;
}) {
  const { error } = await supabase.from("dropdown_options").insert({
    field_id: fieldId,
    label,
    value,
    sort_order: sortOrder,
    active: true,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateDropdownOptionLabel({
  optionId,
  label,
}: {
  optionId: string;
  label: string;
}) {
  const { error } = await supabase
    .from("dropdown_options")
    .update({
      label,
      value: label.trim().replace(/\s+/g, " "),
    })
    .eq("id", optionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deactivateDropdownOption(optionId: string) {
  const { error } = await supabase
    .from("dropdown_options")
    .update({ active: false })
    .eq("id", optionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function restoreDropdownOption(optionId: string) {
  const { error } = await supabase
    .from("dropdown_options")
    .update({ active: true })
    .eq("id", optionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateDropdownOptionSortOrder({
  optionId,
  sortOrder,
}: {
  optionId: string;
  sortOrder: number;
}) {
  const { error } = await supabase
    .from("dropdown_options")
    .update({ sort_order: sortOrder })
    .eq("id", optionId);

  if (error) {
    throw new Error(error.message);
  }
}


export type ActivityFormDropdownOptions = {
  fieldLocationOptions: string[];
  gamePhaseOptions: string[];
  categoryOptions: string[];
};

const fallbackActivityFormDropdownOptions: ActivityFormDropdownOptions = {
  fieldLocationOptions: [...fallbackFieldLocationOptions],
  gamePhaseOptions: [...fallbackGamePhaseOptions],
  categoryOptions: [...fallbackCategoryOptions],
};

function normalizeFieldKey(value: string | undefined | null) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getFieldValues(
  fields: DropdownField[],
  acceptedKeys: string[],
  fallbackValues: string[]
) {
  const normalizedAcceptedKeys = acceptedKeys.map(normalizeFieldKey);

  const matchingField = fields.find((field) =>
    normalizedAcceptedKeys.includes(normalizeFieldKey(field.field_key))
  );

  const values = (matchingField?.dropdown_options ?? [])
    .filter((option) => option.active)
    .sort((optionA, optionB) => {
      if (optionA.sort_order !== optionB.sort_order) {
        return optionA.sort_order - optionB.sort_order;
      }

      return optionA.label.localeCompare(optionB.label);
    })
    .map((option) => option.label?.trim())
    .filter((label): label is string => Boolean(label));

  return values.length > 0 ? values : fallbackValues;
}

export async function getActivityFormDropdownOptions(): Promise<ActivityFormDropdownOptions> {
  try {
    const fields = await getDropdownFields();

    return {
      fieldLocationOptions: getFieldValues(
        fields,
        ["fieldLocation", "field_location", "Field Location"],
        fallbackActivityFormDropdownOptions.fieldLocationOptions
      ),
      gamePhaseOptions: getFieldValues(
        fields,
        ["gamePhase", "game_phase", "Game Phase"],
        fallbackActivityFormDropdownOptions.gamePhaseOptions
      ),
      categoryOptions: getFieldValues(
        fields,
        ["category", "Category"],
        fallbackActivityFormDropdownOptions.categoryOptions
      ),
    };
  } catch (error) {
    console.error("Unable to load activity form dropdown options.", error);
    return fallbackActivityFormDropdownOptions;
  }
}
