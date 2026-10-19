"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getPlanningTeamById, type PlanningTeam } from "@/lib/teamPlanning";
import { createTeamPlayer, listTeamPlayers, removeTeamPlayer, type TeamPlayer } from "@/lib/teamPlayers";

export default function TeamPlayers({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<PlanningTeam | null>(null);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const foundTeam = await getPlanningTeamById(teamId);
      setTeam(foundTeam);
      setPlayers(foundTeam ? await listTeamPlayers(teamId) : []);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load players."); }
    finally { setLoading(false); }
  }, [teamId]);
  useEffect(() => { void load(); }, [load]);
  const add = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const created = await createTeamPlayer(teamId, newName);
      setPlayers(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add player."); }
    finally { setSaving(false); }
  };
  const remove = async (player: TeamPlayer) => {
    if (!window.confirm(`Delete ${player.name} and all their notes? This cannot be undone.`)) return;
    setSaving(true); setError("");
    try { await removeTeamPlayer(teamId, player.id); setPlayers(current => current.filter(p => p.id !== player.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete player."); }
    finally { setSaving(false); }
  };
  return <div className="space-y-6">
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Team Players</p>
          <h1 className="mt-1 text-3xl font-bold">{team?.name ?? "Players"}</h1></div>
        <Link href="/team-planning" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Back to Teams</Link>
      </div>
    </section>
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">Roster</h2><p className="mt-1 text-sm text-slate-500">Players are private to this team.</p></div>
        {team && <form onSubmit={add} className="flex w-full flex-wrap gap-2 sm:w-auto">
          <input aria-label="Player name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Player name" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-64" />
          <button disabled={saving || !newName.trim()} className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">+ Add Player</button>
        </form>}
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading roster...</p> : !team ? <p className="mt-6 text-sm text-slate-500">Team not found or access denied.</p> : players.length === 0 ?
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">No players yet. Add your first player above.</p> :
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="flex justify-between bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"><span>Player</span><span>Actions</span></div>
          {players.map(player => <div key={player.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4">
            <Link className="font-semibold text-[#0d2140] hover:underline" href={`/team-planning/${teamId}/players/${player.id}`}>{player.jerseyNumber !== null ? `#${player.jerseyNumber} · ` : ""}{player.name}</Link>
            <div className="flex gap-2"><Link href={`/team-planning/${teamId}/players/${player.id}`} className="rounded-lg bg-[#0d2140] px-3 py-2 text-sm font-semibold text-white">Profile</Link>
              <button type="button" disabled={saving} onClick={() => void remove(player)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Delete</button></div>
          </div>)}
        </div>}
    </section>
  </div>;
}
