"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ACTIVITY_DROPDOWN_KEYS,
  ACTIVITY_DROPDOWN_LABELS,
  createActivityDropdownOption,
  listActivityDropdownOptionRows,
  moveActivityDropdownOption,
  setActivityDropdownOptionActive,
  updateActivityDropdownOptionLabel,
  type ActivityDropdownKey,
  type ActivityDropdownOptionRow,
} from "@/lib/activityDropdownOptions";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
}

export default function SettingsPanel() {
  const [selectedDropdown, setSelectedDropdown] =
    useState<ActivityDropdownKey>("category");
  const [dropdownRows, setDropdownRows] = useState<ActivityDropdownOptionRow[]>(
    []
  );
  const [newDropdownValue, setNewDropdownValue] = useState("");
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [dropdownMessage, setDropdownMessage] = useState("");
  const [dropdownError, setDropdownError] = useState("");
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [isSavingDropdowns, setIsSavingDropdowns] = useState(false);

  const selectedDropdownRows = useMemo(() => {
    return dropdownRows
      .filter((row) => row.dropdown_key === selectedDropdown)
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }

        return a.label.localeCompare(b.label);
      });
  }, [dropdownRows, selectedDropdown]);

  async function loadDropdownRows() {
    setDropdownError("");
    setIsLoadingDropdowns(true);

    try {
      const rows = await listActivityDropdownOptionRows();
      setDropdownRows(rows);
    } catch (error) {
      console.error("Dropdown options could not be loaded.", error);
      setDropdownError(
        "Dropdown options could not be loaded. Make sure the activity_dropdown_options table exists in Supabase."
      );
    } finally {
      setIsLoadingDropdowns(false);
    }
  }

  useEffect(() => {
    loadDropdownRows();
  }, []);

  async function handleAddDropdownValue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSavingDropdowns) {
      return;
    }

    setDropdownMessage("");
    setDropdownError("");

    const cleanValue = newDropdownValue.trim();

    if (!cleanValue) {
      setDropdownError("Enter a dropdown value before adding it.");
      return;
    }

    setIsSavingDropdowns(true);

    try {
      await createActivityDropdownOption(selectedDropdown, cleanValue);
      setNewDropdownValue("");
      setDropdownMessage(`Added "${cleanValue}".`);
      await loadDropdownRows();
    } catch (error) {
      console.error("Dropdown option could not be added.", error);
      setDropdownError(getErrorMessage(error));
    } finally {
      setIsSavingDropdowns(false);
    }
  }

  function startEditingOption(row: ActivityDropdownOptionRow) {
    setEditingOptionId(row.id);
    setEditingValue(row.label);
    setDropdownMessage("");
    setDropdownError("");
  }

  function cancelEditingOption() {
    setEditingOptionId(null);
    setEditingValue("");
  }

  async function handleSaveEditedOption(optionId: string) {
    if (isSavingDropdowns) {
      return;
    }

    setDropdownMessage("");
    setDropdownError("");

    const cleanValue = editingValue.trim();

    if (!cleanValue) {
      setDropdownError("Dropdown value cannot be blank.");
      return;
    }

    setIsSavingDropdowns(true);

    try {
      await updateActivityDropdownOptionLabel(optionId, cleanValue);
      setEditingOptionId(null);
      setEditingValue("");
      setDropdownMessage(`Updated dropdown value to "${cleanValue}".`);
      await loadDropdownRows();
    } catch (error) {
      console.error("Dropdown option could not be updated.", error);
      setDropdownError(getErrorMessage(error));
    } finally {
      setIsSavingDropdowns(false);
    }
  }

  async function handleToggleActive(row: ActivityDropdownOptionRow) {
    if (isSavingDropdowns) {
      return;
    }

    const nextActiveValue = !row.is_active;

    setDropdownMessage("");
    setDropdownError("");
    setIsSavingDropdowns(true);

    try {
      await setActivityDropdownOptionActive(row.id, nextActiveValue);
      setDropdownMessage(
        nextActiveValue
          ? `"${row.label}" is active again.`
          : `"${row.label}" is now inactive.`
      );
      await loadDropdownRows();
    } catch (error) {
      console.error("Dropdown option status could not be updated.", error);
      setDropdownError(getErrorMessage(error));
    } finally {
      setIsSavingDropdowns(false);
    }
  }

  async function handleMoveOption(
    optionId: string,
    direction: "up" | "down"
  ) {
    if (isSavingDropdowns) {
      return;
    }

    setDropdownMessage("");
    setDropdownError("");
    setIsSavingDropdowns(true);

    try {
      await moveActivityDropdownOption(optionId, direction);
      await loadDropdownRows();
      setDropdownMessage("Dropdown order saved.");
    } catch (error) {
      console.error("Dropdown order could not be saved.", error);
      setDropdownError(getErrorMessage(error));
    } finally {
      setIsSavingDropdowns(false);
    }
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">User Management</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admins can add/remove users, reset passwords, send invites, and
            assign roles.
          </p>

          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-5 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            <div className="grid grid-cols-5 px-4 py-4 text-sm text-slate-600">
              <div>Coach User</div>
              <div>coach@email.com</div>
              <div>User</div>
              <div>Active</div>
              <div className="flex gap-3">
                <button className="font-semibold text-slate-700">Reset</button>
                <button className="font-semibold text-slate-700">Remove</button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Create User / Onboard User</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admin can create a user with a temporary password or send an invite
            email so the user creates their own password.
          </p>

          <form className="mt-6 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Name</span>
              <input
                type="text"
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Free text"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">Email</span>
              <input
                type="email"
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="name@email.com"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">Role</span>
              <select className="rounded-lg border border-slate-300 px-3 py-2">
                <option>User</option>
                <option>Admin</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">Temporary Password</span>
              <input
                type="text"
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Auto-generate or enter"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" defaultChecked />
              Require password reset on first login
            </label>

            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Recommended: use Send Invite so the admin never handles the
              user&apos;s real password.
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                Create User
              </button>

              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
              >
                Send Invite
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Dropdown Value Management</h2>
            <p className="mt-2 text-sm text-slate-600">
              Manage the values and display order used in activity forms and
              search filters. Changes are saved to Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDropdownRows}
            disabled={isLoadingDropdowns || isSavingDropdowns}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {ACTIVITY_DROPDOWN_KEYS.map((dropdownKey) => (
            <button
              key={dropdownKey}
              type="button"
              onClick={() => {
                setSelectedDropdown(dropdownKey);
                setNewDropdownValue("");
                setEditingOptionId(null);
                setEditingValue("");
                setDropdownMessage("");
                setDropdownError("");
              }}
              className={`rounded-lg px-4 py-2 font-semibold ${
                selectedDropdown === dropdownKey
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700"
              }`}
            >
              {ACTIVITY_DROPDOWN_LABELS[dropdownKey]}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleAddDropdownValue}
          className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row"
        >
          <label className="grid flex-1 gap-1">
            <span className="text-sm font-semibold">
              Add {ACTIVITY_DROPDOWN_LABELS[selectedDropdown]} Value
            </span>
            <input
              value={newDropdownValue}
              onChange={(event) => setNewDropdownValue(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Enter new dropdown value"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSavingDropdowns}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Add Value
            </button>
          </div>
        </form>

        {dropdownError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {dropdownError}
          </div>
        )}

        {dropdownMessage && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {dropdownMessage}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1fr_auto] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 md:grid-cols-[1fr_auto_auto]">
            <div>{ACTIVITY_DROPDOWN_LABELS[selectedDropdown]} Values</div>
            <div className="hidden md:block">Status</div>
            <div>Actions</div>
          </div>

          {isLoadingDropdowns ? (
            <div className="px-4 py-6 text-sm text-slate-600">
              Loading dropdown values...
            </div>
          ) : selectedDropdownRows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-600">
              No dropdown values found for this type.
            </div>
          ) : (
            selectedDropdownRows.map((row, index) => {
              const isEditing = editingOptionId === row.id;

              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-[1fr_auto] items-center gap-3 border-t border-slate-200 px-4 py-4 text-sm md:grid-cols-[1fr_auto_auto] ${
                    row.is_active ? "text-slate-700" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  <div>
                    {isEditing ? (
                      <input
                        value={editingValue}
                        onChange={(event) => setEditingValue(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700"
                      />
                    ) : (
                      <span className={row.is_active ? "" : "line-through"}>
                        {row.label}
                      </span>
                    )}
                  </div>

                  <div className="hidden text-xs font-bold uppercase tracking-wide md:block">
                    {row.is_active ? "Active" : "Inactive"}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveOption(row.id, "up")}
                      disabled={isSavingDropdowns || index === 0}
                      className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Up
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveOption(row.id, "down")}
                      disabled={
                        isSavingDropdowns ||
                        index === selectedDropdownRows.length - 1
                      }
                      className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Down
                    </button>

                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEditedOption(row.id)}
                          disabled={isSavingDropdowns}
                          className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditingOption}
                          disabled={isSavingDropdowns}
                          className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditingOption(row)}
                        disabled={isSavingDropdowns}
                        className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Edit
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleActive(row)}
                      disabled={isSavingDropdowns}
                      className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {row.is_active ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
