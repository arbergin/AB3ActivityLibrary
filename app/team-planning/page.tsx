"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import {
  createPlanningTeam,
  deletePlanningTeam,
  getPlanningTeams,
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

  const loadTeams = useCallback(async () => {
    setIsLoading(true);

    try {
      setTeams(await getPlanningTeams());
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
    const confirmed = window.confirm(
      `Delete "${team.name}" and all of its weeks, practices, and planning entries?`
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await deletePlanningTeam(team.id);
      setTeams((current) => current.filter((item) => item.id !== team.id));
      setMessage("Team deleted.");
    } catch (error) {
      console.error("Unable to delete planning team.", error);
      setMessage("The team could not be deleted.");
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

            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
              <div className="hidden grid-cols-[minmax(0,1fr)_auto] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 sm:grid">
                <div>Team</div>
                <div>Actions</div>
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
                    className="border-t border-slate-200 px-4 py-4 first:border-t-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
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
                        <div className="truncate text-base font-semibold text-slate-900">
                          {team.name}
                        </div>
                      )}
                    </div>

                    {editingTeamId !== team.id && (
                      <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
                        <Link
                          href={`/team-planning/${team.id}`}
                          className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17345f]"
                        >
                          Planning
                        </Link>
                        <button
                          type="button"
                          onClick={() => beginRename(team)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(team)}
                          disabled={isSaving}
                          className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </main>
    </ProtectedPage>
  );
}