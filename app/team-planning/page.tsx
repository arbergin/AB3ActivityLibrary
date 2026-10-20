"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import {
  createPlanningTeam,
  deletePlanningTeam,
  getPlanningTeams,
  getInactivePlanningTeams,
  restorePlanningTeam,
  permanentlyDeletePlanningTeam,
  renamePlanningTeam,
  type PlanningTeam,
} from "@/lib/teamPlanning";

export default function TeamPlanningPage() {
  const [teams, setTeams] = useState<PlanningTeam[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [teamPendingDeletion, setTeamPendingDeletion] = useState<PlanningTeam | null>(null);
  const [isInactiveTeamsOpen, setIsInactiveTeamsOpen] = useState(false);
  const [inactiveTeams, setInactiveTeams] = useState<PlanningTeam[]>([]);
  const [isLoadingInactive, setIsLoadingInactive] = useState(false);
  const [inactiveError, setInactiveError] = useState("");
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<PlanningTeam | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

  useEffect(() => {
    if (!isActionsMenuOpen) return;

    function handleOutsideClick(event: globalThis.PointerEvent) {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target as Node)
      ) {
        setIsActionsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsActionsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isActionsMenuOpen]);

  const loadTeams = useCallback(async () => {
    setIsLoading(true);

    try {
      const loadedTeams = await getPlanningTeams();
      setTeams(loadedTeams);
      setSelectedTeamId((current) =>
        current && loadedTeams.some((team) => team.id === current) ? current : null
      );
      setMessage("");
    } catch (error) {
      console.error("Unable to load planning teams.", error);
      setMessage("Teams could not be loaded. Refresh the page and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  async function handleCreateTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newTeamName.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const createdTeam = await createPlanningTeam(newTeamName);
      setTeams((current) =>
        [...current, createdTeam].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewTeamName("");
      setMessage("Team created.");
    } catch (error) {
      console.error("Unable to create planning team.", error);
      setMessage(
        error instanceof Error ? error.message : "The team could not be created."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function beginRename(team: PlanningTeam) {
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
    setMessage("");
  }

  async function handleRename(teamId: string) {
    if (!editingTeamName.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const renamedTeam = await renamePlanningTeam(teamId, editingTeamName);
      setTeams((current) =>
        current
          .map((team) => (team.id === teamId ? renamedTeam : team))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingTeamId(null);
      setEditingTeamName("");
      setMessage("Team renamed.");
    } catch (error) {
      console.error("Unable to rename planning team.", error);
      setMessage(
        error instanceof Error ? error.message : "The team could not be renamed."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(team: PlanningTeam) {
    if (isSaving) return;
    setIsSaving(true);
    setMessage("");

    try {
      await deletePlanningTeam(team.id);
      setTeams((current) => current.filter((item) => item.id !== team.id));
      setSelectedTeamId((current) => current === team.id ? null : current);
      setEditingTeamId((current) => current === team.id ? null : current);
      setTeamPendingDeletion(null);
      setMessage("Team removed from the website. All associated data has been preserved.");
    } catch (error) {
      console.error("Unable to archive planning team.", error);
      setMessage(error instanceof Error ? error.message : "The team could not be removed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function openInactiveTeams() {
    setIsActionsMenuOpen(false);
    setIsInactiveTeamsOpen(true);
    setInactiveError("");
    setIsLoadingInactive(true);
    try {
      setInactiveTeams(await getInactivePlanningTeams());
    } catch (error) {
      console.error("Unable to load inactive teams.", error);
      setInactiveError("Inactive teams could not be loaded. Please try again.");
    } finally {
      setIsLoadingInactive(false);
    }
  }

  async function handleRestoreTeam(team: PlanningTeam) {
    if (isSaving) return;
    setIsSaving(true);
    setInactiveError("");
    try {
      const restored = await restorePlanningTeam(team.id);
      setInactiveTeams((current) => current.filter((item) => item.id !== team.id));
      setTeams((current) => [...current, restored].sort((a, b) => a.name.localeCompare(b.name)));
      setMessage(`Team "${restored.name}" restored.`);
    } catch (error) {
      console.error("Unable to restore team.", error);
      setInactiveError(error instanceof Error ? error.message : "The team could not be restored.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePermanentlyDeleteTeam(team: PlanningTeam) {
    if (isSaving) return;
    setIsSaving(true);
    setInactiveError("");
    try {
      await permanentlyDeletePlanningTeam(team.id);
      setInactiveTeams((current) => current.filter((item) => item.id !== team.id));
      setPendingPermanentDelete(null);
      setMessage(`Inactive team "${team.name}" permanently deleted.`);
    } catch (error) {
      console.error("Unable to permanently delete inactive team.", error);
      setPendingPermanentDelete(null);
      setInactiveError(error instanceof Error ? error.message : "Permanent deletion failed. Check database foreign-key constraints.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Team Planning</h1>
            <p className="mt-2 text-slate-600">
              Create your teams, then open Planning to build weeks, practices,
              and activities.
            </p>
          </div>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">My Teams</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Teams are private to your account.
                </p>
              </div>

              <form
                onSubmit={handleCreateTeam}
                className="flex w-full max-w-xl gap-2 sm:w-auto"
              >
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                  placeholder="Team name"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0d2140] sm:w-72"
                />
                <button
                  type="submit"
                  disabled={isSaving || !newTeamName.trim()}
                  className="whitespace-nowrap rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Create Team
                </button>
              </form>
            </div>

            {message && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            )}

            {/* Keep overflow visible so the header Actions menu is never clipped. */}
            <div className="mt-6 overflow-visible rounded-lg border border-slate-200">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-t-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 sm:grid-cols-[minmax(0,1fr)_max-content]">
                <div>Team</div>
                <div ref={actionsMenuRef} className="relative flex items-center justify-end gap-2">
                  <span>Actions</span>
                  <button
                    type="button"
                    aria-label="Team actions menu"
                    aria-haspopup="menu"
                    aria-expanded={isActionsMenuOpen}
                    onClick={() => setIsActionsMenuOpen((open) => !open)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-lg font-bold leading-none text-slate-700 hover:bg-slate-50"
                    title="Rename or delete selected team"
                  >
                    …
                  </button>
                  {isActionsMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Selected team actions"
                      className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                    >
                      <div className="px-3 py-2 text-xs font-normal text-slate-500">
                        {selectedTeam ? `Selected: ${selectedTeam.name}` : "Select a team first"}
                      </div>
                      <button
                        role="menuitem"
                        type="button"
                        disabled={!selectedTeam || isSaving}
                        onClick={() => {
                          if (!selectedTeam) return;
                          setIsActionsMenuOpen(false);
                          beginRename(selectedTeam);
                        }}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Rename
                      </button>
                      <button
                        role="menuitem"
                        type="button"
                        disabled={!selectedTeam || isSaving}
                        onClick={() => {
                          if (!selectedTeam) return;
                          setIsActionsMenuOpen(false);
                          setTeamPendingDeletion(selectedTeam);
                        }}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
                      </button>
                      <div className="my-1 border-t border-slate-200" />
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => void openInactiveTeams()}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100"
                      >
                        Inactive Teams
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="px-4 py-8 text-sm text-slate-500">
                  Loading teams...
                </div>
              ) : teams.length === 0 ? (
                <div className="px-4 py-8 text-sm text-slate-500">
                  No teams yet. Create your first team above.
                </div>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    onClick={() => {
                      if (editingTeamId === team.id) return;
                      setSelectedTeamId((current) => current === team.id ? null : team.id);
                      setIsActionsMenuOpen(false);
                    }}
                    className={`border-t border-slate-200 px-4 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_max-content] sm:items-center sm:gap-4 ${
                      selectedTeamId === team.id ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                    } ${editingTeamId === team.id ? "" : "cursor-pointer"}`}
                  >
                    <div className="min-w-0">
                      {editingTeamId === team.id ? (
                        <div className="flex max-w-xl gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={editingTeamName}
                            onChange={(event) =>
                              setEditingTeamName(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleRename(team.id);
                              }

                              if (event.key === "Escape") {
                                setEditingTeamId(null);
                                setEditingTeamName("");
                              }
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRename(team.id)}
                            disabled={isSaving || !editingTeamName.trim()}
                            className="rounded-lg bg-[#0d2140] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeamId(null);
                              setEditingTeamName("");
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTeamId((current) => current === team.id ? null : team.id);
                            setIsActionsMenuOpen(false);
                          }}
                          aria-pressed={selectedTeamId === team.id}
                          className="flex max-w-full items-center gap-2 rounded-md text-left text-base font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          title={selectedTeamId === team.id ? "Deselect this team" : "Select this team for Rename or Delete"}
                        >
                          <span className="truncate">{team.name}</span>
                          {selectedTeamId === team.id && (
                            <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Selected</span>
                          )}
                        </button>
                      )}
                    </div>

                    {editingTeamId !== team.id && (
                      <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
                        <Link
                          href={`/team-planning/${team.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17345f]"
                        >
                          Planning
                        </Link>
                        <Link
                          href={`/team-planning/${team.id}/players`}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17345f]"
                        >
                          Players
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </section>

        {isInactiveTeamsOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isSaving && !pendingPermanentDelete) {
                setIsInactiveTeamsOpen(false);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="inactive-teams-title"
              className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl"
              onKeyDown={(event) => {
                if (event.key === "Escape" && !isSaving && !pendingPermanentDelete) {
                  setIsInactiveTeamsOpen(false);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="inactive-teams-title" className="text-xl font-bold text-slate-900">Inactive Teams</h2>
                  <p className="mt-1 text-sm text-slate-600">Restore a team to your Teams page or permanently delete an inactive team.</p>
                </div>
                <button type="button" aria-label="Close inactive teams" disabled={isSaving} onClick={() => setIsInactiveTeamsOpen(false)} className="rounded-md px-2 py-1 text-xl text-slate-600 hover:bg-slate-100 disabled:opacity-50">×</button>
              </div>
              {inactiveError && <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{inactiveError}</div>}
              <div className="mt-5 max-h-[55vh] overflow-y-auto rounded-lg border border-slate-200">
                {isLoadingInactive ? (
                  <p className="p-4 text-sm text-slate-600">Loading inactive teams...</p>
                ) : inactiveTeams.length === 0 ? (
                  <p className="p-4 text-sm text-slate-600">No inactive teams.</p>
                ) : inactiveTeams.map((team) => (
                  <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3 last:border-b-0">
                    <span className="min-w-0 flex-1 font-semibold text-slate-900">{team.name}</span>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={isSaving} onClick={() => void handleRestoreTeam(team)} className="rounded-lg border border-[#0d2140] bg-white px-3 py-2 text-sm font-semibold text-[#0d2140] hover:bg-slate-50 disabled:opacity-50">Restore</button>
                      <button type="button" disabled={isSaving} onClick={() => setPendingPermanentDelete(team)} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Permanently Delete</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button type="button" disabled={isSaving} onClick={() => setIsInactiveTeamsOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Close</button>
              </div>
            </div>
          </div>
        )}

        {pendingPermanentDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4" role="presentation">
            <div role="alertdialog" aria-modal="true" aria-labelledby="permanent-delete-title" aria-describedby="permanent-delete-description" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onKeyDown={(event) => { if (event.key === "Escape" && !isSaving) setPendingPermanentDelete(null); }}>
              <h2 id="permanent-delete-title" className="text-xl font-bold text-red-800">Permanently delete this team?</h2>
              <p id="permanent-delete-description" className="mt-3 text-sm text-slate-700">
                Are you sure you want to permanently delete <strong>{pendingPermanentDelete.name}</strong>? This action cannot be undone. Associated planning records may also be deleted, depending on database relationships. Library activities are not intentionally deleted by this action.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" autoFocus disabled={isSaving} onClick={() => setPendingPermanentDelete(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
                <button type="button" disabled={isSaving} onClick={() => void handlePermanentlyDeleteTeam(pendingPermanentDelete)} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">{isSaving ? "Deleting..." : "Yes, Permanently Delete"}</button>
              </div>
            </div>
          </div>
        )}

        {teamPendingDeletion && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isSaving) setTeamPendingDeletion(null);
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-team-title"
              aria-describedby="delete-team-description"
              className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
              onKeyDown={(event) => {
                if (event.key === "Escape" && !isSaving) setTeamPendingDeletion(null);
              }}
            >
              <h2 id="delete-team-title" className="text-xl font-bold text-slate-900">
                Are you sure you want to delete this team?
              </h2>
              <p id="delete-team-description" className="mt-3 text-sm text-slate-600">
                <strong>{teamPendingDeletion.name}</strong> will be hidden from the website.
                Its players, weeks, practices, activities, notes, and other associated
                database records will be preserved. You can restore the team later.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  autoFocus
                  disabled={isSaving}
                  onClick={() => setTeamPendingDeletion(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleDelete(teamPendingDeletion)}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {isSaving ? "Removing..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedPage>
  );
}