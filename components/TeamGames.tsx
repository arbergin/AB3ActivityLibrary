"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import PlayerMentionTextarea from "@/components/PlayerMentionTextarea";
import PlayerMentionText from "@/components/PlayerMentionText";
import { createMentionNoteCopies, type MentionPlayer } from "@/lib/playerMentions";
import { listTeamPlayers } from "@/lib/teamPlayers";
import { getPlanningTeamById, type PlanningTeam } from "@/lib/teamPlanning";
import {
  archiveTeamGame, createTeamGame, gameResult, listTeamGames,
  permanentlyDeleteTeamGame, renameTeamGame, restoreTeamGame, updateTeamGame,
  type GameChanges, type TeamGame,
} from "@/lib/teamGames";

type FormState = { gameDate: string; opponentName: string; yourGoals: string; opponentGoals: string; notes: string };
const blankForm = (): FormState => ({ gameDate: new Date().toLocaleDateString("en-CA"), opponentName: "", yourGoals: "", opponentGoals: "", notes: "" });
const gameToForm = (g: TeamGame): FormState => ({ gameDate: g.gameDate, opponentName: g.opponentName, yourGoals: g.yourGoals?.toString() ?? "", opponentGoals: g.opponentGoals?.toString() ?? "", notes: g.notes });
const parseScore = (v: string) => v.trim() === "" ? null : Number(v);
const sortGames = (games: TeamGame[]) => [...games].sort((a,b) => b.gameDate.localeCompare(a.gameDate) || b.createdAt.localeCompare(a.createdAt));
const displayDate = (iso: string) => {
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const primary = "rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17345f] disabled:opacity-50";
const secondary = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const danger = "rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50";
const overlay = "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4";
const dialog = "max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl";

export default function TeamGames({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<PlanningTeam | null>(null);
  const [games, setGames] = useState<TeamGame[]>([]);
  const [mentionPlayers, setMentionPlayers] = useState<MentionPlayer[]>([]);
  const [inactive, setInactive] = useState<TeamGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [editing, setEditing] = useState<TeamGame | "new" | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [renaming, setRenaming] = useState<TeamGame | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [archiving, setArchiving] = useState<TeamGame | null>(null);
  const [permanent, setPermanent] = useState<TeamGame | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = games.find(g => g.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const found = await getPlanningTeamById(teamId);
      setTeam(found);
      setMentionPlayers(found ? (await listTeamPlayers(teamId)).map(p => ({ id: p.id, name: p.name })) : []);
      setGames(found ? await listTeamGames(teamId) : []);
      setSelectedId(null);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load games."); }
    finally { setLoading(false); }
  }, [teamId]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    const outside = (e: globalThis.PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", esc); };
  }, [menuOpen]);

  useEffect(() => {
    if (!editing && !renaming && !archiving && !permanent && !inactiveOpen) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      if (permanent) setPermanent(null);
      else if (archiving) setArchiving(null);
      else if (renaming) setRenaming(null);
      else if (editing) setEditing(null);
      else setInactiveOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [editing, renaming, archiving, permanent, inactiveOpen, saving]);

  function openEditor(game?: TeamGame) {
    setError("");
    setForm(game ? gameToForm(game) : blankForm());
    setEditing(game ?? "new");
  }
  const computedResult = gameResult({ yourGoals: parseScore(form.yourGoals), opponentGoals: parseScore(form.opponentGoals) });
  function changes(): GameChanges {
    return {
      gameDate: form.gameDate, opponentName: form.opponentName.trim(),
      yourGoals: parseScore(form.yourGoals), opponentGoals: parseScore(form.opponentGoals), notes: form.notes,
    };
  }
  async function saveGame(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing || saving) return;
    setSaving(true); setError("");
    try {
      const updated = editing === "new"
        ? await createTeamGame(teamId, changes())
        : await updateTeamGame(teamId, editing.id, changes());
      await createMentionNoteCopies("game", updated.id, updated.notes);
      setGames(current => sortGames([...current.filter(g => g.id !== updated.id), updated]));
      setEditing(null);
      setSelectedId(updated.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save game."); }
    finally { setSaving(false); }
  }
  async function doRename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!renaming || !renameValue.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const updated = await renameTeamGame(teamId, renaming.id, renameValue);
      setGames(current => current.map(g => g.id === updated.id ? updated : g));
      setRenaming(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not rename game."); }
    finally { setSaving(false); }
  }
  async function doArchive() {
    if (!archiving || saving) return;
    setSaving(true); setError("");
    try {
      await archiveTeamGame(teamId, archiving.id);
      setGames(current => current.filter(g => g.id !== archiving.id));
      setSelectedId(null); setArchiving(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not archive game."); }
    finally { setSaving(false); }
  }
  async function openInactive() {
    setMenuOpen(false); setInactiveOpen(true); setInactiveLoading(true); setError("");
    try { setInactive(await listTeamGames(teamId, true)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load inactive games."); }
    finally { setInactiveLoading(false); }
  }
  async function doRestore(game: TeamGame) {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const restored = await restoreTeamGame(teamId, game.id);
      setInactive(current => current.filter(g => g.id !== game.id));
      setGames(current => sortGames([...current, restored]));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not restore game."); }
    finally { setSaving(false); }
  }
  async function doPermanent() {
    if (!permanent || saving) return;
    setSaving(true); setError("");
    try {
      await permanentlyDeleteTeamGame(teamId, permanent.id);
      setInactive(current => current.filter(g => g.id !== permanent.id));
      setPermanent(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not permanently delete game."); }
    finally { setSaving(false); }
  }
  const fieldClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return <div className="space-y-6">
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Team Games</p>
          <h1 className="mt-1 text-3xl font-bold">{team?.name ?? "Games"}</h1></div>
        <Link href="/team-planning" className={secondary}>Back to Teams</Link>
      </div>
    </section>
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">Games</h2><p className="mt-1 text-sm text-slate-500">Game results and coaching notes are private to this team.</p></div>
        {team && <button type="button" className={primary} disabled={saving} onClick={() => openEditor()}>+ Game</button>}
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading games...</p> : !team ?
        <p className="mt-6 text-sm text-slate-500">Team not found or access denied.</p> :
        <div className="mt-6 rounded-lg border border-slate-200">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-t-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <span>Game</span>
            <div className="relative flex items-center justify-end gap-2" ref={menuRef}>
              <span>Actions</span>
              <button type="button" aria-label="Game actions" aria-haspopup="menu" aria-expanded={menuOpen}
                onClick={() => setMenuOpen(open => !open)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-base leading-none hover:bg-slate-50">•••</button>
              {menuOpen && <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <p className="px-3 py-2 text-xs font-normal text-slate-500">{selected ? `Selected: ${selected.opponentName}` : "Select a game first"}</p>
                <button type="button" role="menuitem" disabled={!selected || saving} onClick={() => { if (!selected) return; setRenaming(selected); setRenameValue(selected.opponentName); setMenuOpen(false); }} className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-40">Rename</button>
                <button type="button" role="menuitem" disabled={!selected || saving} onClick={() => { if (!selected) return; setArchiving(selected); setMenuOpen(false); }} className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-40">Delete</button>
                <div className="my-1 border-t border-slate-200" />
                <button type="button" role="menuitem" onClick={() => void openInactive()} className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100">Inactive Games</button>
              </div>}
            </div>
          </div>
          {games.length === 0 ? <p className="border-t border-slate-200 p-6 text-sm text-slate-500">No active games yet. Click + Game or restore an inactive game from Actions.</p> :
            games.map(game => {
              const chosen = selectedId === game.id;
              const result = gameResult(game);
              return <div key={game.id} role="button" tabIndex={0} aria-pressed={chosen}
                onClick={() => { setSelectedId(id => id === game.id ? null : game.id); setMenuOpen(false); }}
                onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); setSelectedId(id => id === game.id ? null : game.id); } }}
                className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-slate-200 px-4 py-4 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${chosen ? "bg-blue-50 hover:bg-blue-50" : ""}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-[#0d2140]">
                    <span>{displayDate(game.gameDate)} · vs. {game.opponentName}</span>
                    {chosen && <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Selected</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>{game.yourGoals === null ? "Score not entered" : `${game.yourGoals}–${game.opponentGoals}`}</span>
                    {result !== "—" && <span className={`rounded px-2 py-0.5 text-xs font-semibold ${result === "Win" ? "bg-green-100 text-green-800" : result === "Loss" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-700"}`}>{result}</span>}
                    {game.notes.trim() && <span>· Notes saved</span>}
                  </div>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); openEditor(game); }} onKeyDown={e => e.stopPropagation()} className={primary}>View / Edit</button>
              </div>;
            })}
        </div>}
    </section>

    {editing && <div className={overlay} onMouseDown={e => { if (e.target === e.currentTarget && !saving) setEditing(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="game-editor-title" className={dialog}>
        <h3 id="game-editor-title" className="text-xl font-bold">{editing === "new" ? "Add Game" : "Game Details"}</h3>
        <form onSubmit={e => void saveGame(e)} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Date
              <input className={`${fieldClass} mt-1`} type="date" required value={form.gameDate} onChange={e => setForm(f => ({ ...f, gameDate: e.target.value }))} />
            </label>
            <label className="block text-sm font-semibold">Opponent Name
              <input className={`${fieldClass} mt-1`} required value={form.opponentName} onChange={e => setForm(f => ({ ...f, opponentName: e.target.value }))} placeholder="Opponent" />
            </label>
            <label className="block text-sm font-semibold">Your Goals
              <input className={`${fieldClass} mt-1`} type="number" min="0" step="1" value={form.yourGoals} onChange={e => setForm(f => ({ ...f, yourGoals: e.target.value }))} placeholder="Optional" />
            </label>
            <label className="block text-sm font-semibold">Opponent&apos;s Goals
              <input className={`${fieldClass} mt-1`} type="number" min="0" step="1" value={form.opponentGoals} onChange={e => setForm(f => ({ ...f, opponentGoals: e.target.value }))} placeholder="Optional" />
            </label>
          </div>
          <p className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Result: {computedResult === "—" ? "Enter both scores to calculate" : computedResult}</p>
          <div className="block text-sm font-semibold"><span>Game Notes</span>
            <PlayerMentionTextarea rows={9} players={mentionPlayers} className={`${fieldClass} mt-1 resize-y`} value={form.notes} onChange={notes => setForm(f => ({ ...f, notes }))} placeholder="Observations, highlights, areas to improve; type @ to mention players..." />
          </div>
          {form.notes.includes("(player:") && <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Linked note preview</p>
            <PlayerMentionText teamId={teamId} text={form.notes} />
          </div>}
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={secondary} disabled={saving} onClick={() => { setEditing(null); setError(""); }}>Cancel</button>
            <button type="submit" className={primary} disabled={saving || !form.gameDate || !form.opponentName.trim() || (form.yourGoals === "") !== (form.opponentGoals === "")}>{saving ? "Saving..." : "Save Game"}</button>
          </div>
        </form>
      </section>
    </div>}

    {inactiveOpen && <div className={overlay} onMouseDown={e => { if (e.target === e.currentTarget && !saving && !permanent) setInactiveOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="inactive-games-title" className={dialog}>
        <div className="flex items-center justify-between gap-3"><h3 id="inactive-games-title" className="text-xl font-bold">Inactive Games</h3><button type="button" className={secondary} disabled={saving} onClick={() => setInactiveOpen(false)}>Close</button></div>
        <p className="mt-2 text-sm text-slate-600">Restore a game or permanently delete it.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {inactiveLoading ? <p className="mt-5 text-sm text-slate-500">Loading inactive games...</p> : inactive.length === 0 ? <p className="mt-5 text-sm text-slate-500">No inactive games for this team.</p> :
          <div className="mt-4 divide-y divide-slate-200 border-t border-slate-200">{inactive.map(game => <div key={game.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <span className="font-semibold">{displayDate(game.gameDate)} · {game.opponentName}</span>
            <div className="flex flex-wrap gap-2"><button type="button" className={secondary} disabled={saving} onClick={() => void doRestore(game)}>Restore</button><button type="button" className={danger} disabled={saving} onClick={() => setPermanent(game)}>Permanently Delete</button></div>
          </div>)}</div>}
      </section>
    </div>}

    {renaming && <div className={overlay}><section role="dialog" aria-modal="true" aria-labelledby="rename-game-title" className={dialog}>
      <h3 id="rename-game-title" className="text-xl font-bold">Rename Game</h3><p className="mt-2 text-sm text-slate-600">Update the opponent name for the selected game.</p>
      <form onSubmit={e => void doRename(e)} className="mt-4 space-y-4"><input autoFocus aria-label="Opponent name" value={renameValue} onChange={e => setRenameValue(e.target.value)} className={fieldClass} />
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className={secondary} disabled={saving} onClick={() => setRenaming(null)}>Cancel</button><button type="submit" className={primary} disabled={saving || !renameValue.trim()}>Save</button></div>
      </form>
    </section></div>}
    {archiving && <div className={overlay}><section role="alertdialog" aria-modal="true" aria-labelledby="archive-game-title" className={dialog}>
      <h3 id="archive-game-title" className="text-xl font-bold">Are you sure you want to delete this game?</h3>
      <p className="mt-3 text-sm text-slate-600"><strong>{displayDate(archiving.gameDate)} vs. {archiving.opponentName}</strong> will be hidden from the Games page. Its score and notes will be preserved and you can restore it later.</p>
      {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" className={secondary} disabled={saving} onClick={() => setArchiving(null)}>Cancel</button><button type="button" className={danger} disabled={saving} onClick={() => void doArchive()}>Yes, Delete</button></div>
    </section></div>}
    {permanent && <div className={`${overlay} z-[110]`}><section role="alertdialog" aria-modal="true" aria-labelledby="permanent-game-title" className={dialog}>
      <h3 id="permanent-game-title" className="text-xl font-bold text-red-800">Permanently delete this game?</h3>
      <p className="mt-3 text-sm text-slate-600">Are you sure you want to permanently delete <strong>{displayDate(permanent.gameDate)} vs. {permanent.opponentName}</strong>? The result and all game notes will be permanently deleted. This cannot be undone.</p>
      {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" className={secondary} disabled={saving} onClick={() => setPermanent(null)}>Cancel</button><button type="button" className={danger} disabled={saving} onClick={() => void doPermanent()}>Yes, Permanently Delete</button></div>
    </section></div>}
  </div>;
}
