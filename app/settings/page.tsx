"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import RoleBadge from "@/components/RoleBadge";
import {
  clearStoredActivities,
  getStoredActivitiesSummary,
} from "@/lib/activityStorage";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentSessionUser,
  getCurrentUserProfile,
  isAdminProfile,
  type UserProfile,
  type UserRole,
} from "@/lib/userProfile";
import { getAllUserProfiles, updateUserRole } from "@/lib/userManagement";
import {
  addDropdownOption,
  deactivateDropdownOption,
  getDropdownFields,
  restoreDropdownOption,
  updateDropdownFieldLabel,
  updateDropdownOptionLabel,
} from "@/lib/dropdownService";
import { makeDropdownValue } from "@/lib/dropdownHelpers";
import type { DropdownField, DropdownOption } from "@/lib/dropdownTypes";

type LocalDataSummary = {
  count: number;
  storageSizeKb: number;
};

export default function SettingsPage() {
  const [localDataSummary, setLocalDataSummary] = useState<LocalDataSummary>({
    count: 0,
    storageSizeKb: 0,
  });

  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(
    undefined
  );

  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUpdatingRoleUserId, setIsUpdatingRoleUserId] = useState<
    string | undefined
  >(undefined);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("user");
  const [newUserMustChangePassword, setNewUserMustChangePassword] =
    useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [resetPasswordUserId, setResetPasswordUserId] = useState<
    string | undefined
  >(undefined);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetMustChangePassword, setResetMustChangePassword] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [deleteUserId, setDeleteUserId] = useState<string | undefined>(
    undefined
  );
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [message, setMessage] = useState("");
  const [userManagementMessage, setUserManagementMessage] = useState("");

  const [dropdownFields, setDropdownFields] = useState<DropdownField[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);
  const [dropdownMessage, setDropdownMessage] = useState("");
  const [dropdownSavingId, setDropdownSavingId] = useState<
    string | undefined
  >(undefined);
  const [newDropdownOptionLabels, setNewDropdownOptionLabels] = useState<
    Record<string, string>
  >({});
  const [editingDropdownFieldLabels, setEditingDropdownFieldLabels] = useState<
    Record<string, string>
  >({});
  const [editingDropdownOptionLabels, setEditingDropdownOptionLabels] =
    useState<Record<string, string>>({});

  const isAdmin = isAdminProfile(profile);

  const sortedDropdownFields = useMemo(() => {
    return [...dropdownFields].sort((a, b) => a.sort_order - b.sort_order);
  }, [dropdownFields]);

  function refreshLocalDataSummary() {
    setLocalDataSummary(getStoredActivitiesSummary());
  }

  function handleClearLocalData() {
    clearStoredActivities();
    refreshLocalDataSummary();
    setMessage("Local browser data cleared.");
  }

  async function getAccessToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token;
  }

  async function loadUserProfiles() {
    setIsLoadingUsers(true);
    setUserManagementMessage("");

    try {
      const profiles = await getAllUserProfiles();
      setUserProfiles(profiles);
    } catch (error) {
      console.error("Unable to load user management list.", error);
      setUserManagementMessage(
        "Unable to load users. Confirm your account is an admin and the profiles RLS policies are correct."
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function loadDropdownFields() {
    setIsLoadingDropdowns(true);
    setDropdownMessage("");

    try {
      const fields = await getDropdownFields();

      setDropdownFields(fields);

      const fieldLabelState: Record<string, string> = {};
      const optionLabelState: Record<string, string> = {};

      fields.forEach((field) => {
        fieldLabelState[field.id] = field.label;

        field.dropdown_options.forEach((option) => {
          optionLabelState[option.id] = option.label;
        });
      });

      setEditingDropdownFieldLabels(fieldLabelState);
      setEditingDropdownOptionLabels(optionLabelState);
    } catch (error) {
      console.error("Unable to load dropdown settings.", error);
      setDropdownMessage(
        "Unable to load dropdown settings. Confirm your account is an admin and the dropdown RLS policies are correct."
      );
    } finally {
      setIsLoadingDropdowns(false);
    }
  }

  async function handleSaveDropdownFieldLabel(field: DropdownField) {
    const nextLabel = editingDropdownFieldLabels[field.id]?.trim();

    if (!nextLabel) {
      setDropdownMessage("Dropdown field label cannot be blank.");
      return;
    }

    setDropdownSavingId(field.id);
    setDropdownMessage("");

    try {
      await updateDropdownFieldLabel({
        fieldId: field.id,
        label: nextLabel,
      });

      setDropdownFields((currentFields) =>
        currentFields.map((currentField) =>
          currentField.id === field.id
            ? { ...currentField, label: nextLabel }
            : currentField
        )
      );

      setDropdownMessage("Dropdown field label updated.");
    } catch (error) {
      console.error("Unable to update dropdown field label.", error);
      setDropdownMessage("Unable to update dropdown field label.");
    } finally {
      setDropdownSavingId(undefined);
    }
  }

  async function handleAddDropdownOption(field: DropdownField) {
    const nextLabel = newDropdownOptionLabels[field.id]?.trim();

    if (!nextLabel) {
      setDropdownMessage("Enter an option name first.");
      return;
    }

    const nextValue = makeDropdownValue(nextLabel);

    if (!nextValue) {
      setDropdownMessage("Enter a valid option name.");
      return;
    }

    const options = field.dropdown_options ?? [];

    const existingOption = options.find(
      (option) => option.value === nextValue
    );

    if (existingOption?.active) {
      setDropdownMessage("That option already exists.");
      return;
    }

    if (existingOption && !existingOption.active) {
      setDropdownMessage(
        "That option already exists as inactive. Use Restore instead."
      );
      return;
    }

    const nextSortOrder =
      options.length === 0
        ? 1
        : Math.max(...options.map((option) => option.sort_order)) + 1;

    setDropdownSavingId(field.id);
    setDropdownMessage("");

    try {
      await addDropdownOption({
        fieldId: field.id,
        label: nextLabel,
        value: nextValue,
        sortOrder: nextSortOrder,
      });

      setNewDropdownOptionLabels((current) => ({
        ...current,
        [field.id]: "",
      }));

      await loadDropdownFields();

      setDropdownMessage("Dropdown option added.");
    } catch (error) {
      console.error("Unable to add dropdown option.", error);
      setDropdownMessage("Unable to add dropdown option.");
    } finally {
      setDropdownSavingId(undefined);
    }
  }

  async function handleSaveDropdownOptionLabel(
    fieldId: string,
    option: DropdownOption
  ) {
    const nextLabel = editingDropdownOptionLabels[option.id]?.trim();

    if (!nextLabel) {
      setDropdownMessage("Dropdown option label cannot be blank.");
      return;
    }

    setDropdownSavingId(option.id);
    setDropdownMessage("");

    try {
      await updateDropdownOptionLabel({
        optionId: option.id,
        label: nextLabel,
      });

      setDropdownFields((currentFields) =>
        currentFields.map((field) => {
          if (field.id !== fieldId) {
            return field;
          }

          return {
            ...field,
            dropdown_options: field.dropdown_options.map((currentOption) =>
              currentOption.id === option.id
                ? { ...currentOption, label: nextLabel }
                : currentOption
            ),
          };
        })
      );

      setDropdownMessage("Dropdown option updated.");
    } catch (error) {
      console.error("Unable to update dropdown option.", error);
      setDropdownMessage("Unable to update dropdown option.");
    } finally {
      setDropdownSavingId(undefined);
    }
  }

  async function handleRemoveDropdownOption(
    fieldId: string,
    option: DropdownOption
  ) {
    setDropdownSavingId(option.id);
    setDropdownMessage("");

    try {
      await deactivateDropdownOption(option.id);

      setDropdownFields((currentFields) =>
        currentFields.map((field) => {
          if (field.id !== fieldId) {
            return field;
          }

          return {
            ...field,
            dropdown_options: field.dropdown_options.map((currentOption) =>
              currentOption.id === option.id
                ? { ...currentOption, active: false }
                : currentOption
            ),
          };
        })
      );

      setDropdownMessage(
        "Dropdown option removed from new selections. Existing saved activities will still keep this value."
      );
    } catch (error) {
      console.error("Unable to remove dropdown option.", error);
      setDropdownMessage("Unable to remove dropdown option.");
    } finally {
      setDropdownSavingId(undefined);
    }
  }

  async function handleRestoreDropdownOption(
    fieldId: string,
    option: DropdownOption
  ) {
    setDropdownSavingId(option.id);
    setDropdownMessage("");

    try {
      await restoreDropdownOption(option.id);

      setDropdownFields((currentFields) =>
        currentFields.map((field) => {
          if (field.id !== fieldId) {
            return field;
          }

          return {
            ...field,
            dropdown_options: field.dropdown_options.map((currentOption) =>
              currentOption.id === option.id
                ? { ...currentOption, active: true }
                : currentOption
            ),
          };
        })
      );

      setDropdownMessage("Dropdown option restored.");
    } catch (error) {
      console.error("Unable to restore dropdown option.", error);
      setDropdownMessage("Unable to restore dropdown option.");
    } finally {
      setDropdownSavingId(undefined);
    }
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreatingUser) {
      return;
    }

    setUserManagementMessage("");

    const trimmedEmail = newUserEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setUserManagementMessage("Email is required.");
      return;
    }

    if (!newUserPassword) {
      setUserManagementMessage("Initial password is required.");
      return;
    }

    if (newUserPassword.length < 6) {
      setUserManagementMessage(
        "Initial password must be at least 6 characters."
      );
      return;
    }

    setIsCreatingUser(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setUserManagementMessage("You must be logged in to create users.");
        setIsCreatingUser(false);
        return;
      }

      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: newUserPassword,
          role: newUserRole,
          mustChangePassword: newUserMustChangePassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setUserManagementMessage(
          result.error || "The user could not be created."
        );
        setIsCreatingUser(false);
        return;
      }

      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("user");
      setNewUserMustChangePassword(true);

      setUserManagementMessage(
        `${trimmedEmail} was created as ${newUserRole}.`
      );

      await loadUserProfiles();
    } catch (error) {
      console.error("Unable to create user.", error);
      setUserManagementMessage("Unexpected error while creating user.");
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function handleRoleChange(userId: string, nextRole: UserRole) {
    setUserManagementMessage("");

    if (userId === currentUserId) {
      setUserManagementMessage(
        "You cannot change your own role here. This prevents accidentally removing your own admin access."
      );
      return;
    }

    setIsUpdatingRoleUserId(userId);

    try {
      const updatedProfile = await updateUserRole(userId, nextRole);

      setUserProfiles((currentProfiles) =>
        currentProfiles.map((userProfile) =>
          userProfile.id === userId ? updatedProfile : userProfile
        )
      );

      setUserManagementMessage(
        `${updatedProfile.email} was updated to ${updatedProfile.role}.`
      );
    } catch (error) {
      console.error("Unable to update role.", error);
      setUserManagementMessage(
        "Unable to update this user role. Confirm your account is an admin."
      );
    } finally {
      setIsUpdatingRoleUserId(undefined);
    }
  }

  function openResetPassword(userId: string) {
    setDeleteUserId(undefined);
    setResetPasswordUserId(userId);
    setResetPasswordValue("");
    setResetMustChangePassword(true);
    setUserManagementMessage("");
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resetPasswordUserId || isResettingPassword) {
      return;
    }

    setUserManagementMessage("");

    if (resetPasswordUserId === currentUserId) {
      setUserManagementMessage("You cannot reset your own password here.");
      return;
    }

    if (!resetPasswordValue) {
      setUserManagementMessage("New password is required.");
      return;
    }

    if (resetPasswordValue.length < 6) {
      setUserManagementMessage("New password must be at least 6 characters.");
      return;
    }

    setIsResettingPassword(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setUserManagementMessage("You must be logged in to reset passwords.");
        setIsResettingPassword(false);
        return;
      }

      const response = await fetch("/api/admin/reset-user-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: resetPasswordUserId,
          password: resetPasswordValue,
          mustChangePassword: resetMustChangePassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setUserManagementMessage(
          result.error || "The password could not be reset."
        );
        setIsResettingPassword(false);
        return;
      }

      setUserProfiles((currentProfiles) =>
        currentProfiles.map((userProfile) =>
          userProfile.id === resetPasswordUserId
            ? result.profile
            : userProfile
        )
      );

      setResetPasswordUserId(undefined);
      setResetPasswordValue("");
      setResetMustChangePassword(true);
      setUserManagementMessage("Password was reset.");
    } catch (error) {
      console.error("Unable to reset password.", error);
      setUserManagementMessage("Unexpected error while resetting password.");
    } finally {
      setIsResettingPassword(false);
    }
  }

  function openDeleteUser(userId: string) {
    setResetPasswordUserId(undefined);
    setDeleteUserId(userId);
    setUserManagementMessage("");
  }

  async function handleConfirmDeleteUser() {
    if (!deleteUserId || isDeletingUser) {
      return;
    }

    setUserManagementMessage("");

    if (deleteUserId === currentUserId) {
      setUserManagementMessage("You cannot delete your own account.");
      return;
    }

    setIsDeletingUser(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setUserManagementMessage("You must be logged in to delete users.");
        setIsDeletingUser(false);
        return;
      }

      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: deleteUserId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setUserManagementMessage(
          result.error || "The user could not be deleted."
        );
        setIsDeletingUser(false);
        return;
      }

      setUserProfiles((currentProfiles) =>
        currentProfiles.filter((userProfile) => userProfile.id !== deleteUserId)
      );

      setDeleteUserId(undefined);
      setUserManagementMessage("User deleted.");
    } catch (error) {
      console.error("Unable to delete user.", error);
      setUserManagementMessage("Unexpected error while deleting user.");
    } finally {
      setIsDeletingUser(false);
    }
  }

  useEffect(() => {
    refreshLocalDataSummary();

    async function loadProfile() {
      try {
        const currentUser = await getCurrentSessionUser();
        const currentProfile = await getCurrentUserProfile();

        setCurrentUserId(currentUser?.id);
        setProfile(currentProfile);

        if (currentProfile?.role === "admin") {
          await loadUserProfiles();
          await loadDropdownFields();
        }
      } catch (error) {
        console.error("Unable to load current user profile.", error);
      }
    }

    loadProfile();
  }, []);

  const resetPasswordUser = userProfiles.find(
    (userProfile) => userProfile.id === resetPasswordUserId
  );

  const deleteUser = userProfiles.find(
    (userProfile) => userProfile.id === deleteUserId
  );

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-6xl px-8 py-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            <p className="mt-2 text-slate-600">
              Manage your account, users, dropdown fields, and temporary browser
              data.
            </p>
          </div>

          <div className="grid gap-6">
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Account</h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-700">
                    Email
                  </div>
                  <div className="mt-2 text-base font-bold">
                    {profile?.email || "Loading..."}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-700">
                    Role
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <RoleBadge role={profile?.role} />
                    {!profile?.role && (
                      <span className="text-sm text-slate-500">Loading...</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">User Management</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Admins can create users, reset passwords, delete users, and
                    assign roles.
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={loadUserProfiles}
                    disabled={isLoadingUsers}
                    className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingUsers ? "Refreshing..." : "Refresh Users"}
                  </button>
                )}
              </div>

              {!profile ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Loading user access...
                </div>
              ) : !isAdmin ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  User management is available to admins only.
                </div>
              ) : (
                <>
                  <form
                    onSubmit={handleCreateUser}
                    className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <h4 className="font-bold">Add User</h4>

                    <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr_0.7fr_auto]">
                      <label className="grid gap-1">
                        <span className="text-sm font-semibold">Email</span>
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(event) =>
                            setNewUserEmail(event.target.value)
                          }
                          disabled={isCreatingUser}
                          className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                          placeholder="coach@example.com"
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-sm font-semibold">
                          Initial Password
                        </span>
                        <input
                          type="text"
                          value={newUserPassword}
                          onChange={(event) =>
                            setNewUserPassword(event.target.value)
                          }
                          disabled={isCreatingUser}
                          className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                          placeholder="Minimum 6 characters"
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-sm font-semibold">Role</span>
                        <select
                          value={newUserRole}
                          onChange={(event) =>
                            setNewUserRole(event.target.value as UserRole)
                          }
                          disabled={isCreatingUser}
                          className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </label>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={isCreatingUser}
                          className="w-full rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isCreatingUser ? "Adding..." : "Add User"}
                        </button>
                      </div>
                    </div>

                    <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={newUserMustChangePassword}
                        onChange={(event) =>
                          setNewUserMustChangePassword(event.target.checked)
                        }
                        disabled={isCreatingUser}
                        className="mt-1"
                      />

                      <span>
                        <span className="font-semibold">
                          Require password reset on next login
                        </span>
                        <span className="block text-slate-500">
                          The user must create a new password before accessing
                          the app.
                        </span>
                      </span>
                    </label>
                  </form>

                  {userManagementMessage && (
                    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                      {userManagementMessage}
                    </div>
                  )}

                  {resetPasswordUser && (
                    <form
                      onSubmit={handleResetPassword}
                      className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-amber-900">
                            Reset Password
                          </h4>
                          <p className="mt-1 text-sm text-amber-800">
                            Reset password for {resetPasswordUser.email}.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setResetPasswordUserId(undefined)}
                          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                        <label className="grid gap-1">
                          <span className="text-sm font-semibold text-amber-900">
                            New Temporary Password
                          </span>
                          <input
                            type="text"
                            value={resetPasswordValue}
                            onChange={(event) =>
                              setResetPasswordValue(event.target.value)
                            }
                            disabled={isResettingPassword}
                            className="rounded-lg border border-amber-300 px-3 py-2 disabled:bg-slate-100"
                            placeholder="Minimum 6 characters"
                          />
                        </label>

                        <div className="flex items-end">
                          <button
                            type="submit"
                            disabled={isResettingPassword}
                            className="w-full rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isResettingPassword
                              ? "Resetting..."
                              : "Reset Password"}
                          </button>
                        </div>
                      </div>

                      <label className="mt-4 flex items-start gap-3 text-sm text-amber-900">
                        <input
                          type="checkbox"
                          checked={resetMustChangePassword}
                          onChange={(event) =>
                            setResetMustChangePassword(event.target.checked)
                          }
                          disabled={isResettingPassword}
                          className="mt-1"
                        />
                        <span>
                          Require this user to reset password on next login
                        </span>
                      </label>
                    </form>
                  )}

                  {deleteUser && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-red-900">
                            Delete User
                          </h4>
                          <p className="mt-1 text-sm text-red-800">
                            Delete {deleteUser.email}? This removes their Auth
                            account and profile row.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDeleteUserId(undefined)}
                          className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleConfirmDeleteUser}
                          disabled={isDeletingUser}
                          className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeletingUser ? "Deleting..." : "Delete User"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
                    <div className="grid grid-cols-[1.25fr_0.45fr_0.65fr_0.7fr_0.85fr_0.8fr] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                      <div>Email</div>
                      <div>Role</div>
                      <div>Change Role</div>
                      <div>Password Reset</div>
                      <div>Actions</div>
                      <div>Updated</div>
                    </div>

                    {isLoadingUsers ? (
                      <div className="px-4 py-6 text-sm text-slate-500">
                        Loading users...
                      </div>
                    ) : userProfiles.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">
                        No users found.
                      </div>
                    ) : (
                      userProfiles.map((userProfile) => {
                        const isCurrentUser = userProfile.id === currentUserId;
                        const isUpdating =
                          isUpdatingRoleUserId === userProfile.id;

                        return (
                          <div
                            key={userProfile.id}
                            className="grid grid-cols-[1.25fr_0.45fr_0.65fr_0.7fr_0.85fr_0.8fr] items-center border-t border-slate-200 px-4 py-4 text-sm"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">
                                {userProfile.email}
                              </div>

                              {isCurrentUser && (
                                <div className="mt-1 text-xs font-semibold text-slate-500">
                                  Current logged-in user
                                </div>
                              )}
                            </div>

                            <div>
                              <RoleBadge role={userProfile.role} />
                            </div>

                            <div>
                              <select
                                value={userProfile.role}
                                disabled={isCurrentUser || isUpdating}
                                onChange={(event) =>
                                  handleRoleChange(
                                    userProfile.id,
                                    event.target.value as UserRole
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                              </select>

                              {isCurrentUser && (
                                <div className="mt-1 text-xs text-slate-500">
                                  Self-change disabled
                                </div>
                              )}
                            </div>

                            <div>
                              {userProfile.must_change_password ? (
                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                                  Required
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                                  Complete
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openResetPassword(userProfile.id)
                                }
                                disabled={isCurrentUser}
                                className="rounded-md border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reset
                              </button>

                              <button
                                type="button"
                                onClick={() => openDeleteUser(userProfile.id)}
                                disabled={isCurrentUser}
                                className="rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>

                            <div className="text-slate-600">
                              {userProfile.updated_at
                                ? new Date(
                                    userProfile.updated_at
                                  ).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "—"}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Dropdown Fields</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Manage the dropdown values used for importing, searching,
                    and organizing activities. Removing an option makes it
                    inactive instead of deleting it, so older saved activities
                    keep their original metadata.
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={loadDropdownFields}
                    disabled={isLoadingDropdowns}
                    className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingDropdowns
                      ? "Refreshing..."
                      : "Refresh Dropdowns"}
                  </button>
                )}
              </div>

              {!profile ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Loading user access...
                </div>
              ) : !isAdmin ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Dropdown field management is available to admins only.
                </div>
              ) : (
                <>
                  {dropdownMessage && (
                    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                      {dropdownMessage}
                    </div>
                  )}

                  {isLoadingDropdowns ? (
                    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Loading dropdown fields...
                    </div>
                  ) : sortedDropdownFields.length === 0 ? (
                    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      No dropdown fields found. Add the starter dropdown fields
                      in Supabase first.
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-5">
                      {sortedDropdownFields.map((field) => {
                        const activeOptions = field.dropdown_options
                          .filter((option) => option.active)
                          .sort((a, b) => a.sort_order - b.sort_order);

                        const inactiveOptions = field.dropdown_options
                          .filter((option) => !option.active)
                          .sort((a, b) => a.sort_order - b.sort_order);

                        return (
                          <div
                            key={field.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="grid flex-1 gap-1">
                                <span className="text-sm font-semibold text-slate-700">
                                  Dropdown Field Label
                                </span>
                                <input
                                  value={
                                    editingDropdownFieldLabels[field.id] ??
                                    field.label
                                  }
                                  onChange={(event) =>
                                    setEditingDropdownFieldLabels((current) => ({
                                      ...current,
                                      [field.id]: event.target.value,
                                    }))
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-bold text-slate-900"
                                />
                                <span className="text-xs text-slate-500">
                                  Field key: {field.field_key}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveDropdownFieldLabel(field)
                                }
                                disabled={dropdownSavingId === field.id}
                                className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {dropdownSavingId === field.id
                                  ? "Saving..."
                                  : "Save Field"}
                              </button>
                            </div>

                            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                              <h4 className="font-bold">Add Option</h4>

                              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                                <input
                                  value={newDropdownOptionLabels[field.id] ?? ""}
                                  onChange={(event) =>
                                    setNewDropdownOptionLabels((current) => ({
                                      ...current,
                                      [field.id]: event.target.value,
                                    }))
                                  }
                                  placeholder={`Add option for ${field.label}`}
                                  className="rounded-lg border border-slate-300 px-3 py-2"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddDropdownOption(field)
                                  }
                                  disabled={dropdownSavingId === field.id}
                                  className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {dropdownSavingId === field.id
                                    ? "Adding..."
                                    : "Add Option"}
                                </button>
                              </div>
                            </div>

                            <div className="mt-5">
                              <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                Active Options
                              </h4>

                              {activeOptions.length === 0 ? (
                                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
                                  No active options.
                                </div>
                              ) : (
                                <div className="mt-3 grid gap-3">
                                  {activeOptions.map((option) => (
                                    <div
                                      key={option.id}
                                      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_auto]"
                                    >
                                      <div>
                                        <input
                                          value={
                                            editingDropdownOptionLabels[
                                              option.id
                                            ] ?? option.label
                                          }
                                          onChange={(event) =>
                                            setEditingDropdownOptionLabels(
                                              (current) => ({
                                                ...current,
                                                [option.id]:
                                                  event.target.value,
                                              })
                                            )
                                          }
                                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                        />
                                        <div className="mt-1 text-xs text-slate-500">
                                          Saved value: {option.value}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-start gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSaveDropdownOptionLabel(
                                              field.id,
                                              option
                                            )
                                          }
                                          disabled={
                                            dropdownSavingId === option.id
                                          }
                                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {dropdownSavingId === option.id
                                            ? "Saving..."
                                            : "Save"}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveDropdownOption(
                                              field.id,
                                              option
                                            )
                                          }
                                          disabled={
                                            dropdownSavingId === option.id
                                          }
                                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="mt-5">
                              <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                Inactive Options
                              </h4>

                              {inactiveOptions.length === 0 ? (
                                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
                                  No inactive options.
                                </div>
                              ) : (
                                <div className="mt-3 grid gap-3">
                                  {inactiveOptions.map((option) => (
                                    <div
                                      key={option.id}
                                      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_auto]"
                                    >
                                      <div>
                                        <div className="font-semibold text-slate-800">
                                          {option.label}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                          Saved value: {option.value}
                                        </div>
                                      </div>

                                      <div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRestoreDropdownOption(
                                              field.id,
                                              option
                                            )
                                          }
                                          disabled={
                                            dropdownSavingId === option.id
                                          }
                                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {dropdownSavingId === option.id
                                            ? "Restoring..."
                                            : "Restore"}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Local Browser Data</h3>

              <p className="mt-2 text-sm text-slate-600">
                Supabase is now the main storage location. Local browser data is
                only kept as a temporary fallback during development.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-700">
                    Local Activities
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {localDataSummary.count}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-700">
                    Approx. Local Storage Size
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {localDataSummary.storageSizeKb} KB
                  </div>
                </div>
              </div>

              {message && (
                <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  {message}
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={refreshLocalDataSummary}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleClearLocalData}
                  className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700"
                >
                  Clear Local Data
                </button>
              </div>
            </section>
          </div>
        </section>
      </main>
    </ProtectedPage>
  );
}