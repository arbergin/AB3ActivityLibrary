"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseActivity } from "@/lib/supabaseActivities";
import { saveStoredActivity } from "@/lib/activityStorage";
import { parseActivityJson, type ParsedActivityJson } from "@/lib/importActivityJson";
import { getCurrentUserProfile } from "@/lib/userProfile";
import { fieldLocationOptions, gamePhaseOptions, categoryOptions } from "@/lib/activityOptions";
import type { Activity, ActivityVisibility } from "@/types/activity";

const MAX_BYTES = 5 * 1024 * 1024;

export default function ImportJsonFlow() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedActivityJson | null>(null);
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [fieldLocation, setFieldLocation] = useState("");
  const [gamePhase, setGamePhase] = useState("");
  const [category, setCategory] = useState("");
  const [positionsInvolved, setPositionsInvolved] = useState("");
  const [numberOfPlayers, setNumberOfPlayers] = useState("");
  const [visibility, setVisibility] = useState<ActivityVisibility>("private");
  const [hasClub, setHasClub] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  function clear() {
    setParsed(null);
    setFileName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function selectFile(file?: File) {
    clear();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Select a .json file."); return;
    }
    if (file.size > MAX_BYTES) {
      setError("JSON files must be 5 MB or smaller."); return;
    }
    setLoading(true);
    try {
      const value: unknown = JSON.parse(await file.text());
      const result = parseActivityJson(value, file.name.replace(/\.json$/i, ""));
      const profile = await getCurrentUserProfile();
      const club = Boolean(profile?.club_id);
      setHasClub(club);
      setVisibility(club ? "club" : "private");
      setParsed(result);
      setFileName(file.name);
      setName(result.name);
      setDetails(result.activityDetails);
      setFieldLocation(result.fieldLocation);
      setGamePhase(result.gamePhase);
      setCategory(result.category);
      setPositionsInvolved(result.positionsInvolved);
      setNumberOfPlayers(String(result.numberOfPlayers));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read this JSON file.");
    } finally {
      setLoading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed || saving) return;
    if (!name.trim()) { setError("Activity Name is required."); return; }
    if (numberOfPlayers && (!Number.isInteger(Number(numberOfPlayers)) || Number(numberOfPlayers) < 1)) {
      setError("Number of Players must be a positive whole number."); return;
    }
    setSaving(true);
    setError("");
    try {
      const activity: Activity = {
        id: crypto.randomUUID(),
        activityName: name.trim(),
        activityDetails: details.trim(),
        fieldLocation,
        gamePhase,
        category,
        positionsInvolved: positionsInvolved.trim(),
        numberOfPlayers: numberOfPlayers ? Number(numberOfPlayers) : "",
        createdBy: "Coach User",
        hidden: false,
        visibility,
        activitySource: "create",
        creatorState: parsed.creatorState,
        // No PNG/PDF is needed: the viewer renders the editable creator state.
      };
      const saved = await createSupabaseActivity(activity);
      saveStoredActivity(saved);
      router.push(`/activity/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? `Unable to save activity: ${err.message}` : "Unable to save activity.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-center hover:bg-slate-100">
        <span className="block font-semibold text-slate-700">Choose a JSON activity file</span>
        <span className="mt-1 block text-sm text-slate-500">.json format • maximum 5 MB • schema v2 or v3</span>
        <input ref={inputRef} type="file" accept=".json,application/json" className="sr-only"
          onChange={(event) => void selectFile(event.target.files?.[0])} disabled={saving || loading} />
      </label>
      {loading && <p className="text-sm text-slate-600">Reading activity JSON...</p>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {parsed && (
        <form onSubmit={(event) => void save(event)} className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">{fileName}</p>
              <p className="text-sm text-slate-600">{parsed.frameCount} {parsed.frameCount === 1 ? "frame" : "frames"} • {parsed.playerCount} player markers in first frame • editable in Activity Creator</p>
            </div>
            <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={clear}>Remove file</button>
          </div>
          <div>
            <label htmlFor="json-name" className="mb-1 block text-sm font-semibold">Activity Name *</label>
            <input id="json-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={200}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="json-visibility" className="mb-1 block text-sm font-semibold">Visibility</label>
              <select id="json-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as ActivityVisibility)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="private">Private</option>
                {hasClub && <option value="club">My Club</option>}
                <option value="everyone">Everyone</option>
              </select>
            </div>
            <div>
              <label htmlFor="json-players" className="mb-1 block text-sm font-semibold">Number of Players</label>
              <input id="json-players" type="number" min="1" step="1" value={numberOfPlayers}
                onChange={(event) => setNumberOfPlayers(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </div>
            {([
              ["Field Location", fieldLocation, setFieldLocation, fieldLocationOptions],
              ["Game Phase", gamePhase, setGamePhase, gamePhaseOptions],
              ["Category", category, setCategory, categoryOptions],
            ] as const).map(([label, current, setter, options]) => (
              <div key={label}>
                <label className="mb-1 block text-sm font-semibold">{label}</label>
                <select value={current} onChange={(event) => setter(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <option value="">Select...</option>
                  {current && !options.some((option) => option === current) && <option value={current}>{current}</option>}
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label htmlFor="json-positions" className="mb-1 block text-sm font-semibold">Positions Involved</label>
              <input id="json-positions" value={positionsInvolved} onChange={(event) => setPositionsInvolved(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </div>
          </div>
          <div>
            <label htmlFor="json-details" className="mb-1 block text-sm font-semibold">Activity Details / Coaching Instructions</label>
            <textarea id="json-details" value={details} onChange={(event) => setDetails(event.target.value)} rows={5}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={clear} disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-[#0d2140] px-5 py-2 font-semibold text-white disabled:opacity-60">
              {saving ? "Importing..." : "Import JSON Activity"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
