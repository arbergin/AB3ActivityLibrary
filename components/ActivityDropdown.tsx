"use client";

import { DropdownOption } from "@/lib/dropdownTypes";
import { getOptionsForSavedValue } from "@/lib/dropdownHelpers";

type ActivityDropdownProps = {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
};

export default function ActivityDropdown({
  label,
  value,
  options,
  onChange,
}: ActivityDropdownProps) {
  const displayOptions = getOptionsForSavedValue(options, value);

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">Select...</option>

        {displayOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}