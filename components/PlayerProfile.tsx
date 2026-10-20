"use client";

import Link from "next/link";
import PlayerMentionText from "@/components/PlayerMentionText";
import { useCallback, useEffect, useState } from "react";
import { getPlanningTeamById } from "@/lib/teamPlanning";
import { createPlayerNote, getTeamPlayer, listPlayerNotes, removePlayerNote, savePlayerNote, saveTeamPlayer, type NoteChanges, type PlayerNote, type TeamPlayer } from "@/lib/teamPlayers";

const positions = ["", "GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST", "CF"];
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const emptyNote = (): NoteChanges => ({ noteDate: todayLocal(), title: "", content: "" });
const sortNotes = (notes: PlayerNote[]) => [...notes].sort((a, b) => b.noteDate.localeCompare(a.noteDate) || b.createdAt.localeCompare(a.createdAt));

export default function PlayerProfile({ teamId, playerId }: { teamId: string; playerId: string }) {
  const [teamName, setTeamName] = useState("");
  const [player, setPlayer] = useState<TeamPlayer | null>(null);
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<NoteChanges>(emptyNote);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const team = await getPlanningTeamById(teamId);
      const found = team ? await getTeamPlayer(teamId, playerId) : null;
      setTeamName(team?.name ?? ""); setPlayer(found);
      setNotes(found ? await listPlayerNotes(playerId) : []);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load profile."); }
    finally { setLoading(false); }
  }, [teamId, playerId]);
  useEffect(() => { void load(); }, [load]);

  const update = <K extends keyof TeamPlayer>(key: K, value: TeamPlayer[K]) => setPlayer(prev => prev ? { ...prev, [key]: value } : prev);
  const saveProfile = async () => {
    if (!player || saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const updated = await saveTeamPlayer(teamId, playerId, player);
      setPlayer(updated); setMessage("Player profile saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save profile."); }
    finally { setSaving(false); }
  };
  const startNewNote = () => { setEditingNoteId(null); setNoteForm(emptyNote()); setShowNoteForm(true); setError(""); };
  const startEdit = (note: PlayerNote) => { setEditingNoteId(note.id); setNoteForm({ noteDate: note.noteDate, title: note.title, content: note.content }); setShowNoteForm(true); setError(""); };
  const persistNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteForm.title.trim() || !noteForm.noteDate || saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = editingNoteId ? await savePlayerNote(playerId, editingNoteId, noteForm) : await createPlayerNote(playerId, noteForm);
      setNotes(old => sortNotes(editingNoteId ? old.map(n => n.id === saved.id ? saved : n) : [...old, saved]));
      setShowNoteForm(false); setEditingNoteId(null); setMessage("Note saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save note."); }
    finally { setSaving(false); }
  };
  const deleteNote = async (note: PlayerNote) => {
    if (!window.confirm(`Delete note "${note.title}"?`)) return;
    setSaving(true); setError("");
    try { await removePlayerNote(playerId, note.id); setNotes(old => old.filter(n => n.id !== note.id)); if (editingNoteId === note.id) setShowNoteForm(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete note."); }
    finally { setSaving(false); }
  };
  const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0d2140]";
  return <div className="space-y-6">
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{teamName || "Team"} · Player Profile</p><h1 className="mt-1 text-3xl font-bold">{player?.name || "Player"}</h1></div>
        <Link href={`/team-planning/${teamId}/players`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Back to Players</Link>
      </div>
    </section>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
    {loading ? <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading profile...</p> : !player ?
      <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Player not found or access denied.</p> : <>
      <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Player Information</h2>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
          <label className="space-y-1 text-sm font-semibold">Player Name<input className={fieldClass} value={player.name} onChange={e => update("name", e.target.value)} /></label>
          <label className="space-y-1 text-sm font-semibold">Jersey Number<input type="number" min={0} max={99} className={fieldClass} value={player.jerseyNumber ?? ""} onChange={e => update("jerseyNumber", e.target.value === "" ? null : Number(e.target.value))} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["primaryPosition", "secondaryPosition"] as const).map(key => <label key={key} className="space-y-1 text-sm font-semibold">{key === "primaryPosition" ? "Primary Position" : "Secondary Position"}
            <select className={fieldClass} value={player[key]} onChange={e => update(key, e.target.value)}>
              {!positions.includes(player[key]) && <option value={player[key]}>{player[key]}</option>}
              {positions.map(pos => <option key={pos} value={pos}>{pos || "Select position"}</option>)}
            </select></label>)}
        </div>
        <label className="block space-y-1 text-sm font-semibold">Strengths<textarea rows={4} className={fieldClass} value={player.strengths} onChange={e => update("strengths", e.target.value)} /></label>
        <label className="block space-y-1 text-sm font-semibold">Opportunities for Improvement<textarea rows={4} className={fieldClass} value={player.opportunities} onChange={e => update("opportunities", e.target.value)} /></label>
        <div className="flex justify-end"><button disabled={saving || !player.name.trim()} type="button" onClick={() => void saveProfile()} className="rounded-lg bg-[#0d2140] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">Save Profile</button></div>
      </section>
      <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Player Notes</h2><p className="mt-1 text-sm text-slate-500">{notes.length} notes · newest first</p></div>
          <button type="button" onClick={startNewNote} className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white">+ Add Note</button></div>
        {showNoteForm && <form onSubmit={persistNote} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold">{editingNoteId ? "Edit Note" : "New Note"}</h3>
          <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <label className="space-y-1 text-sm font-semibold">Date<input required type="date" className={fieldClass} value={noteForm.noteDate} onChange={e => setNoteForm(p => ({...p, noteDate: e.target.value}))} /></label>
            <label className="space-y-1 text-sm font-semibold">Title<input required className={fieldClass} value={noteForm.title} onChange={e => setNoteForm(p => ({...p, title: e.target.value}))} /></label>
          </div>
          <label className="block space-y-1 text-sm font-semibold">Notes<textarea rows={8} className={fieldClass} value={noteForm.content} onChange={e => setNoteForm(p => ({...p, content: e.target.value}))} placeholder="Write observations and feedback..." /></label>
          <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowNoteForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={saving || !noteForm.title.trim() || !noteForm.noteDate} className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save Note</button></div>
        </form>}
        {notes.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">No notes yet. Click Add Note to begin.</p>}
        {notes.map(note => <article key={note.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{note.title}</h3><p className="mt-1 text-xs text-slate-500">{note.noteDate}{note.sourceType ? ` · Copied from ${note.sourceType}` : ""}</p></div>
            <div className="flex gap-2"><button type="button" onClick={() => startEdit(note)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Edit</button>
              <button type="button" disabled={saving} onClick={() => void deleteNote(note)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Delete</button></div></div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700"><PlayerMentionText teamId={teamId} text={note.content || "No details entered."} /></p>
        </article>)}
      </section>
    </>}
  </div>;
}
