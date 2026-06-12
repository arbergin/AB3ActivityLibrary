"use client";

import { useEffect, useState } from "react";
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

  const isAdmin = isAdminProfile(profile);

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
        setUserManagementMessage(result.error || "The user could not be deleted.");
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
          const profiles = await getAllUserProfiles();
          setUserProfiles(profiles);
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
              Manage your account, users, temporary browser data, and app setup
              options.
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
                                onClick={() => openResetPassword(userProfile.id)}
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

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Current Storage Setup</h3>

              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="font-semibold text-slate-800">
                    Supabase Database
                  </div>
                  <div className="mt-1">
                    Activity metadata is saved in the Supabase{" "}
                    <span className="font-semibold">activities</span> table.
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="font-semibold text-slate-800">
                    Supabase Storage
                  </div>
                  <div className="mt-1">
                    PNG and PDF files are saved in the{" "}
                    <span className="font-semibold">activity-files</span>{" "}
                    bucket.
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="font-semibold text-slate-800">
                    Authentication / Roles
                  </div>
                  <div className="mt-1">
                    Admins create users, reset passwords, delete users, assign
                    roles, and can require password resets on next login.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </ProtectedPage>
  );
}