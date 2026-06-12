import type { DropdownField, DropdownOption } from "@/lib/dropdownTypes";

export type SelectDropdownOption = {
  value: string;
  label: string;
  active: boolean;
};

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

export function getOptionsForSavedValue(
  options: DropdownOption[],
  savedValue?: string | null
): SelectDropdownOption[] {
  const activeOptions = options
    .filter((option) => option.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((option) => ({
      value: option.value,
      label: option.label,
      active: true,
    }));

  if (!savedValue) {
    return activeOptions;
  }

  const savedOption = options.find(
    (option) => option.value === savedValue || option.label === savedValue
  );

  if (!savedOption) {
    return [
      ...activeOptions,
      {
        value: savedValue,
        label: `${savedValue} (saved value - no longer in settings)`,
        active: false,
      },
    ];
  }

  if (!savedOption.active) {
    const alreadyIncluded = activeOptions.some(
      (option) => option.value === savedOption.value
    );

    if (alreadyIncluded) {
      return activeOptions;
    }

    return [
      ...activeOptions,
      {
        value: savedOption.value,
        label: `${savedOption.label} (inactive)`,
        active: false,
      },
    ];
  }

  return activeOptions;
}