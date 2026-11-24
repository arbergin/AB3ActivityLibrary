"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import {
  archiveStandaloneSession,
  createStandaloneSession,
  getStandaloneSessions,
  renameStandaloneSession,
  type PlanningTeam,
} from "@/lib/teamPlanning";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<PlanningTeam[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await getStandaloneSessions());
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);
    try {
      const created = await createStandaloneSession(name);
      setSessions(current => [created, ...current]);
      setName("");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create session.");
    } finally {
      setSaving(false);
    }
  }

  async function rename(id: string) {
    if (saving || !editingName.trim()) return;
    setSaving(true);
    try {
      const updated = await renameStandaloneSession(id, editingName);
      setSessions(current => current.map(item => item.id === id ? updated : item));
      setEditingId(null);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to rename session.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(session: PlanningTeam) {
    if (saving || !window.confirm(`Archive "${session.name}"? Its planning data will be preserved.`)) return;
    setSaving(true);
    try {
      await archiveStandaloneSession(session.id);
      setSessions(current => current.filter(item => item.id !== session.id));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to archive session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />
        <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold">Sessions</h1>
            <p className="mt-2 text-slate-600">Create and organize training sessions independently of your teams. Add weeks, practices, notes, and activities from your library.</p>
            <form onSubmit={create} className="mt-6 flex flex-wrap items-center gap-3">
              <label htmlFor="session-name" className="sr-only">Session name</label>
              <input id="session-name" value={name} onChange={event => setName(event.target.value)} placeholder="New session name" maxLength={150} className="min-w-52 flex-1 rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-[#0d2140]" />
              <button type="submit" disabled={saving || !name.trim()} className="rounded-lg bg-[#0d2140] px-5 py-2.5 font-semibold text-white disabled:opacity-40">+ Create Session</button>
            </form>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">My Sessions</h2>
            {loading ? <p className="text-slate-500">Loading sessions...</p> : sessions.length === 0 ? <p className="text-slate-500">No sessions yet. Create one above to get started.</p> : (
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {sessions.map(session => (
                  <div key={session.id} className="flex flex-wrap items-center gap-3 p-4">
                    {editingId === session.id ? (
                      <form className="flex min-w-0 flex-1 flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void rename(session.id); }}>
                        <input aria-label="Rename session" autoFocus value={editingName} onChange={event => setEditingName(event.target.value)} maxLength={150} className="min-w-40 flex-1 rounded-md border border-slate-300 px-3 py-2" />
                        <button type="submit" disabled={saving || !editingName.trim()} className="rounded-md bg-[#0d2140] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Cancel</button>
                      </form>
                    ) : (
                      <Link className="min-w-0 flex-1 text-lg font-semibold text-[#0d2140] hover:underline" href={`/sessions/${session.id}`}>{session.name}</Link>
                    )}
                    {editingId !== session.id && <>
                      <Link href={`/sessions/${session.id}`} className="rounded-md bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white">Open</Link>
                      <button type="button" onClick={() => { setEditingId(session.id); setEditingName(session.name); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Rename</button>
                      <button type="button" disabled={saving} onClick={() => void archive(session)} className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-40">Archive</button>
                    </>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </ProtectedPage>
  );
}
