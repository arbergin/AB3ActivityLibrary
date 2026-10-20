"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPlanningTeamById, type PlanningTeam } from "@/lib/teamPlanning";
import {
  createTeamPlayer, listTeamPlayers, listInactiveTeamPlayers,
  removeTeamPlayer, restoreTeamPlayer, renameTeamPlayer,
  permanentlyDeleteTeamPlayer, type TeamPlayer,
} from "@/lib/teamPlayers";

export default function TeamPlayers({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<PlanningTeam | null>(null);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [inactivePlayers, setInactivePlayers] = useState<TeamPlayer[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [renamePlayer, setRenamePlayer] = useState<TeamPlayer | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [archivePlayer, setArchivePlayer] = useState<TeamPlayer | null>(null);
  const [permanentPlayer, setPermanentPlayer] = useState<TeamPlayer | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const foundTeam = await getPlanningTeamById(teamId);
      setTeam(foundTeam);
      setPlayers(foundTeam ? await listTeamPlayers(teamId) : []);
      setSelectedId(null);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load players."); }
    finally { setLoading(false); }
  }, [teamId]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (event: globalThis.PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => { document.removeEventListener("pointerdown", onOutside); document.removeEventListener("keydown", onEscape); };
  }, [menuOpen]);

  useEffect(() => {
    if (!inactiveOpen && !renamePlayer && !archivePlayer && !permanentPlayer) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving) return;
      if (permanentPlayer) setPermanentPlayer(null);
      else if (archivePlayer) setArchivePlayer(null);
      else if (renamePlayer) setRenamePlayer(null);
      else setInactiveOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [inactiveOpen, renamePlayer, archivePlayer, permanentPlayer, saving]);

  const selectedPlayer = players.find((p) => p.id === selectedId) ?? null;
  const sortPlayers = (items: TeamPlayer[]) => [...items].sort((a, b) => a.name.localeCompare(b.name));

  const add = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const created = await createTeamPlayer(teamId, newName);
      setPlayers(current => sortPlayers([...current, created]));
      setNewName("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add player."); }
    finally { setSaving(false); }
  };

  const openInactive = async () => {
    setMenuOpen(false);
    setInactiveOpen(true);
    setInactiveLoading(true);
    setError("");
    try { setInactivePlayers(await listInactiveTeamPlayers(teamId)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load inactive players."); }
    finally { setInactiveLoading(false); }
  };

  const doArchive = async () => {
    if (!archivePlayer || saving) return;
    setSaving(true); setError("");
    try {
      await removeTeamPlayer(teamId, archivePlayer.id);
      setPlayers(current => current.filter(p => p.id !== archivePlayer.id));
      setSelectedId(null);
      setArchivePlayer(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not make player inactive."); }
    finally { setSaving(false); }
  };

  const doRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renamePlayer || !renameValue.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const renamed = await renameTeamPlayer(teamId, renamePlayer.id, renameValue);
      setPlayers(current => sortPlayers(current.map(p => p.id === renamed.id ? renamed : p)));
      setRenamePlayer(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not rename player."); }
    finally { setSaving(false); }
  };

  const doRestore = async (player: TeamPlayer) => {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const restored = await restoreTeamPlayer(teamId, player.id);
      setInactivePlayers(current => current.filter(p => p.id !== player.id));
      setPlayers(current => sortPlayers([...current, restored]));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not restore player."); }
    finally { setSaving(false); }
  };

  const doPermanentDelete = async () => {
    if (!permanentPlayer || saving) return;
    setSaving(true); setError("");
    try {
      await permanentlyDeleteTeamPlayer(teamId, permanentPlayer.id);
      setInactivePlayers(current => current.filter(p => p.id !== permanentPlayer.id));
      setPermanentPlayer(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not permanently delete player. Check the database foreign-key rules."); }
    finally { setSaving(false); }
  };

  const modalShade = "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4";
  const modalBox = "w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl";
  const secondary = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
  const primary = "rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17345f] disabled:opacity-50";
  const danger = "rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50";

  return <div className="space-y-6">
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Team Players</p>
          <h1 className="mt-1 text-3xl font-bold">{team?.name ?? "Players"}</h1></div>
        <Link href="/team-planning" className={secondary}>Back to Teams</Link>
      </div>
    </section>
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">Roster</h2><p className="mt-1 text-sm text-slate-500">Players are private to this team.</p></div>
        {team && <form onSubmit={add} className="flex w-full flex-wrap gap-2 sm:w-auto">
          <input aria-label="Player name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Player name" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-64" />
          <button disabled={saving || !newName.trim()} className={primary}>+ Add Player</button>
        </form>}
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading roster...</p> : !team ? <p className="mt-6 text-sm text-slate-500">Team not found or access denied.</p> :
        <div className="mt-6 rounded-lg border border-slate-200">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-t-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <span>Player</span>
            <div className="relative flex items-center justify-end gap-2" ref={menuRef}>
              <span>Actions</span>
              <button type="button" aria-label="Player actions" aria-expanded={menuOpen} aria-haspopup="menu"
                onClick={() => setMenuOpen(open => !open)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-base leading-none hover:bg-slate-50">•••</button>
              {menuOpen && <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <button role="menuitem" type="button" disabled={!selectedPlayer || saving} onClick={() => { if (!selectedPlayer) return; setRenameValue(selectedPlayer.name); setRenamePlayer(selectedPlayer); setMenuOpen(false); }} className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">Rename</button>
                <button role="menuitem" type="button" disabled={!selectedPlayer || saving} onClick={() => { if (!selectedPlayer) return; setArchivePlayer(selectedPlayer); setMenuOpen(false); }} className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Delete</button>
                <div className="my-1 border-t border-slate-200" />
                <button role="menuitem" type="button" onClick={() => void openInactive()} className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100">Inactive Players</button>
              </div>}
            </div>
          </div>
          {players.length === 0 ? <p className="border-t border-slate-200 p-6 text-sm text-slate-500">No active players yet. Add your first player above or restore an inactive player from Actions.</p> :
            players.map(player => {
              const selected = player.id === selectedId;
              return <div key={player.id} role="button" tabIndex={0} aria-pressed={selected}
                onClick={() => setSelectedId(id => id === player.id ? null : player.id)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(id => id === player.id ? null : player.id); } }}
                className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-slate-200 px-4 py-4 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${selected ? "bg-blue-50 hover:bg-blue-50" : ""}`}>
                <div className="min-w-0 flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-[#0d2140]">{player.jerseyNumber !== null ? `#${player.jerseyNumber} · ` : ""}{player.name}</span>
                  {selected && <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Selected</span>}
                </div>
                <Link href={`/team-planning/${teamId}/players/${player.id}`} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} className={primary}>Profile</Link>
              </div>;
            })}
        </div>}
    </section>
    {inactiveOpen && <div className={modalShade} onMouseDown={e => { if (e.target === e.currentTarget && !saving) setInactiveOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="inactive-title" className={`${modalBox} max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between gap-3"><h3 id="inactive-title" className="text-xl font-bold">Inactive Players</h3><button type="button" className={secondary} onClick={() => setInactiveOpen(false)} disabled={saving}>Close</button></div>
        <p className="mt-2 text-sm text-slate-600">Restore a player to the roster or permanently remove the player.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {inactiveLoading ? <p className="mt-5 text-sm text-slate-500">Loading inactive players...</p> : inactivePlayers.length === 0 ? <p className="mt-5 text-sm text-slate-500">No inactive players for this team.</p> :
          <div className="mt-4 divide-y divide-slate-200 border-t border-slate-200">{inactivePlayers.map(player => <div key={player.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <span className="font-semibold">{player.name}</span>
            <div className="flex flex-wrap gap-2"><button type="button" className={secondary} disabled={saving} onClick={() => void doRestore(player)}>Restore</button>
              <button type="button" className={danger} disabled={saving} onClick={() => setPermanentPlayer(player)}>Permanently Delete</button></div>
          </div>)}</div>}
      </section>
    </div>}
    {renamePlayer && <div className={modalShade}><section role="dialog" aria-modal="true" aria-labelledby="rename-title" className={modalBox}>
      <h3 id="rename-title" className="text-lg font-bold">Rename Player</h3>
      <form onSubmit={doRename} className="mt-4 space-y-4"><input autoFocus aria-label="New player name" value={renameValue} onChange={e => setRenameValue(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        <div className="flex justify-end gap-2"><button type="button" className={secondary} disabled={saving} onClick={() => setRenamePlayer(null)}>Cancel</button><button type="submit" className={primary} disabled={saving || !renameValue.trim()}>Save</button></div>
      </form>
    </section></div>}
    {archivePlayer && <div className={modalShade}><section role="alertdialog" aria-modal="true" aria-labelledby="archive-title" className={modalBox}>
      <h3 id="archive-title" className="text-lg font-bold">Are you sure you want to delete this player?</h3>
      <p className="mt-3 text-sm text-slate-600"><strong>{archivePlayer.name}</strong> will be hidden from the roster. Their profile and notes will be preserved, and you can restore them later.</p>
      <div className="mt-5 flex justify-end gap-2"><button type="button" className={secondary} disabled={saving} onClick={() => setArchivePlayer(null)}>Cancel</button><button type="button" className={danger} disabled={saving} onClick={() => void doArchive()}>Yes, Delete</button></div>
    </section></div>}
    {permanentPlayer && <div className={modalShade}><section role="alertdialog" aria-modal="true" aria-labelledby="permanent-title" className={modalBox}>
      <h3 id="permanent-title" className="text-lg font-bold">Permanently delete this player?</h3>
      <p className="mt-3 text-sm text-slate-600">Are you sure you want to permanently delete <strong>{permanentPlayer.name}</strong>? This cannot be undone. Related notes may be deleted depending on the database foreign-key rules.</p>
      <div className="mt-5 flex justify-end gap-2"><button type="button" className={secondary} disabled={saving} onClick={() => setPermanentPlayer(null)}>Cancel</button><button type="button" className={danger} disabled={saving} onClick={() => void doPermanentDelete()}>Yes, Permanently Delete</button></div>
    </section></div>}
  </div>;
}
