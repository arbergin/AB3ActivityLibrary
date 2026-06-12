"use client";

import { useEffect, useMemo, useState } from "react";
import { DropdownField, DropdownOption } from "@/lib/dropdownTypes";
import { makeDropdownValue } from "@/lib/dropdownHelpers";
import {
  addDropdownOption,
  deactivateDropdownOption,
  getDropdownFields,
  restoreDropdownOption,
  updateDropdownFieldLabel,
  updateDropdownOptionLabel,
} from "@/lib/dropdownService";

export default function SettingsDropdownManager() {
  const [fields, setFields] = useState<DropdownField[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newOptionLabels, setNewOptionLabels] = useState<Record<string, string>>(
    {}
  );

  const [editingFieldLabels, setEditingFieldLabels] = useState<
    Record<string, string>
  >({});

  const [editingOptionLabels, setEditingOptionLabels] = useState<
    Record<string, string>
  >({});

  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => a.sort_order - b.sort_order);
  }, [fields]);

  async function loadFields() {
    try {
      setLoading(true);
      setMessage("");

      const loadedFields = await getDropdownFields();
      setFields(loadedFields);

      const fieldLabelState: Record<string, string> = {};
      const optionLabelState: Record<string, string> = {};

      loadedFields.forEach((field) => {
        fieldLabelState[field.id] = field.label;

        field.dropdown_options.forEach((option) => {
          optionLabelState[option.id] = option.label;
        });
      });

      setEditingFieldLabels(fieldLabelState);
      setEditingOptionLabels(optionLabelState);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load dropdown settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFields();
  }, []);

  async function handleSaveFieldLabel(field: DropdownField) {
    const label = editingFieldLabels[field.id]?.trim();

    if (!label) {
      setMessage("Field label cannot be blank.");
      return;
    }

    try {
      setSavingId(field.id);
      setMessage("");

      await updateDropdownFieldLabel({
        fieldId: field.id,
        label,
      });

      setFields((current) =>
        current.map((item) =>
          item.id === field.id ? { ...item, label } : item
        )
      );

      setMessage("Dropdown field label updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update field label."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleAddOption(field: DropdownField) {
    const label = newOptionLabels[field.id]?.trim();

    if (!label) {
      setMessage("Enter an option name first.");
      return;
    }

    const value = makeDropdownValue(label);

    if (!value) {
      setMessage("Enter a valid option name.");
      return;
    }

    const alreadyExists = field.dropdown_options.some(
      (option) => option.value === value
    );

    if (alreadyExists) {
      setMessage(
        "That option already exists. If it is inactive, use Restore instead."
      );
      return;
    }

    const nextSortOrder =
      field.dropdown_options.length === 0
        ? 1
        : Math.max(...field.dropdown_options.map((option) => option.sort_order)) +
          1;

    try {
      setSavingId(field.id);
      setMessage("");

      await addDropdownOption({
        fieldId: field.id,
        label,
        value,
        sortOrder: nextSortOrder,
      });

      setNewOptionLabels((current) => ({
        ...current,
        [field.id]: "",
      }));

      await loadFields();

      setMessage("Dropdown option added.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not add dropdown option."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveOptionLabel(
    fieldId: string,
    option: DropdownOption
  ) {
    const label = editingOptionLabels[option.id]?.trim();

    if (!label) {
      setMessage("Option label cannot be blank.");
      return;
    }

    try {
      setSavingId(option.id);
      setMessage("");

      await updateDropdownOptionLabel({
        optionId: option.id,
        label,
      });

      setFields((current) =>
        current.map((field) => {
          if (field.id !== fieldId) return field;

          return {
            ...field,
            dropdown_options: field.dropdown_options.map((item) =>
              item.id === option.id ? { ...item, label } : item
            ),
          };
        })
      );

      setMessage("Dropdown option updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update dropdown option."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemoveOption(fieldId: string, option: DropdownOption) {
    try {
      setSavingId(option.id);
      setMessage("");

      await deactivateDropdownOption(option.id);

      setFields((current) =>
        current.map((field) => {
          if (field.id !== fieldId) return field;

          return {
            ...field,
            dropdown_options: field.dropdown_options.map((item) =>
              item.id === option.id ? { ...item, active: false } : item
            ),
          };
        })
      );

      setMessage(
        "Dropdown option removed from new selections. Existing saved activities will still keep this value."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not remove dropdown option."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleRestoreOption(fieldId: string, option: DropdownOption) {
    try {
      setSavingId(option.id);
      setMessage("");

      await restoreDropdownOption(option.id);

      setFields((current) =>
        current.map((field) => {
          if (field.id !== fieldId) return field;

          return {
            ...field,
            dropdown_options: field.dropdown_options.map((item) =>
              item.id === option.id ? { ...item, active: true } : item
            ),
          };
        })
      );

      setMessage("Dropdown option restored.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not restore dropdown option."
      );
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading dropdown settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {message}
        </div>
      ) : null}

      {sortedFields.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            No dropdown fields found. Add starter fields in Supabase first.
          </p>
        </div>
      ) : null}

      {sortedFields.map((field) => {
        const activeOptions = field.dropdown_options
          .filter((option) => option.active)
          .sort((a, b) => a.sort_order - b.sort_order);

        const inactiveOptions = field.dropdown_options
          .filter((option) => !option.active)
          .sort((a, b) => a.sort_order - b.sort_order);

        return (
          <section
            key={field.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={editingFieldLabels[field.id] ?? field.label}
                  onChange={(event) =>
                    setEditingFieldLabels((current) => ({
                      ...current,
                      [field.id]: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-bold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />

                <button
                  type="button"
                  onClick={() => handleSaveFieldLabel(field)}
                  disabled={savingId === field.id}
                  className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14345f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save Field
                </button>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Field key: {field.field_key}
              </p>
            </div>

            <div className="mb-5 flex flex-col gap-2 sm:flex-row">
              <input
                value={newOptionLabels[field.id] ?? ""}
                onChange={(event) =>
                  setNewOptionLabels((current) => ({
                    ...current,
                    [field.id]: event.target.value,
                  }))
                }
                placeholder={`Add option for ${field.label}`}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />

              <button
                type="button"
                onClick={() => handleAddOption(field)}
                disabled={savingId === field.id}
                className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14345f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add Option
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Active Options
              </h3>

              {activeOptions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No active options for this field.
                </p>
              ) : (
                activeOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
                  >
                    <input
                      value={editingOptionLabels[option.id] ?? option.label}
                      onChange={(event) =>
                        setEditingOptionLabels((current) => ({
                          ...current,
                          [option.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveOptionLabel(field.id, option)}
                        disabled={savingId === option.id}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveOption(field.id, option)}
                        disabled={savingId === option.id}
                        className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Inactive Options
              </h3>

              {inactiveOptions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No inactive options for this field.
                </p>
              ) : (
                inactiveOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        Saved value: {option.value}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreOption(field.id, option)}
                      disabled={savingId === option.id}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}