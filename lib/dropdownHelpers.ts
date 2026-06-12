import type { DropdownField, DropdownOption } from "@/lib/dropdownTypes";

export function makeDropdownValue(label: string) {
  return label.trim().replace(/\s+/g, " ");
}

export function sortDropdownFields(fields: DropdownField[]) {
  return [...fields]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((field) => ({
      ...field,
      dropdown_options: [...(field.dropdown_options ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    }));
}

export function getDropdownField(
  fields: DropdownField[],
  fieldKey: string
): DropdownField | undefined {
  return fields.find((field) => field.field_key === fieldKey);
}

export function getActiveDropdownOptions(
  fields: DropdownField[],
  fieldKey: string
): DropdownOption[] {
  const field = getDropdownField(fields, fieldKey);

  return (field?.dropdown_options ?? [])
    .filter((option) => option.active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getDropdownAllowedLabels(
  fields: DropdownField[],
  fieldKey: string
) {
  return getActiveDropdownOptions(fields, fieldKey).map(
    (option) => option.label
  );
}

export function resolveDropdownValue(
  fields: DropdownField[],
  fieldKey: string,
  submittedValue: string
) {
  const trimmedValue = submittedValue.trim();

  if (!trimmedValue) {
    return "";
  }

  const options = getActiveDropdownOptions(fields, fieldKey);

  const matchingOption = options.find(
    (option) =>
      option.value.trim().toLowerCase() === trimmedValue.toLowerCase() ||
      option.label.trim().toLowerCase() === trimmedValue.toLowerCase()
  );

  return matchingOption?.value ?? "";
}