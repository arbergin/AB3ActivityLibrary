import { supabase } from "@/lib/supabaseClient";
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