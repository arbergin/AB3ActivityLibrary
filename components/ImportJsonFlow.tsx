"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseActivity } from "@/lib/supabaseActivities";
import { saveStoredActivity } from "@/lib/activityStorage";
import { SCREENSHOT_DRAFT_KEY, TRACE_REFERENCE_KEY } from "@/lib/screenshotDraft";
import { parseActivityJson, type ParsedActivityJson } from "@/lib/importActivityJson";
import { renderActivityFramePreview } from "@/lib/activityAnimationExport";
import { getCurrentUserProfile } from "@/lib/userProfile";
import { fieldLocationOptions, gamePhaseOptions, categoryOptions } from "@/lib/activityOptions";
import type { Activity, ActivityVisibility } from "@/types/activity";

const MAX_BYTES = 5 * 1024 * 1024;

export default function ImportJsonFlow({ initialJson, initialName, comparisonImage }: { initialJson?: unknown; initialName?: string; comparisonImage?: string }) {
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
  const [frameIndex, setFrameIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [playing, setPlaying] = useState(false);

  const frames = parsed?.creatorState.schemaVersion === 3 ? parsed.creatorState.frames : [];
  const activeFrame = frames[frameIndex];

  useEffect(() => {
    if (!parsed || !activeFrame) return;
    let cancelled = false;
    const activity: Activity = {
      id: "preview", activityName: parsed.name, activityDetails: parsed.activityDetails,
      fieldLocation: parsed.fieldLocation, gamePhase: parsed.gamePhase,
      category: parsed.category, positionsInvolved: parsed.positionsInvolved,
      numberOfPlayers: parsed.numberOfPlayers, createdBy: "Preview",
      hidden: false, visibility: "private", activitySource: "create",
      creatorState: parsed.creatorState,
    };
    void (async () => {
      setPreviewLoading(true);
      setPreviewError("");
      try {
        const url = await renderActivityFramePreview(activity, activeFrame);
        if (!cancelled) setPreviewUrl(url);
      } catch (err) {
        if (!cancelled) {
          setPreviewUrl(null);
          setPreviewError(err instanceof Error ? err.message : "Could not render this activity frame.");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [parsed, activeFrame]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const duration = Math.max(250, Math.min(10000, activeFrame?.durationMs ?? 1000));
    const timer = window.setTimeout(() => setFrameIndex((index) => (index + 1) % frames.length), duration);
    return () => window.clearTimeout(timer);
  }, [playing, frameIndex, frames.length, activeFrame?.durationMs]);

  useEffect(() => {
    if (!enlarged) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEnlarged(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [enlarged]);

  function clear() {
    setParsed(null);
    setFrameIndex(0);
    setPlaying(false);
    setEnlarged(false);
    setPreviewUrl(null);
    setPreviewError("");
    setFileName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  useEffect(() => {
    if (initialJson === undefined) return;
    try {
      const result = parseActivityJson(initialJson, initialName || "Screenshot Activity");
      setParsed(result);
      setFileName(initialName || "Generated from screenshot");
      setName(result.name);
      setDetails(result.activityDetails);
      setFieldLocation(result.fieldLocation);
      setGamePhase(result.gamePhase);
      setCategory(result.category);
      setPositionsInvolved(result.positionsInvolved);
      setNumberOfPlayers(String(result.numberOfPlayers || ""));
      setError("");
      setFrameIndex(0);
      void getCurrentUserProfile().then((profile) => {
        const club = Boolean(profile?.club_id);
        setHasClub(club);
        setVisibility(club ? "club" : "private");
      }).catch(() => {
        setHasClub(false);
        setVisibility("private");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to interpret generated activity.");
    }
  }, [initialJson, initialName]);

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
      if (initialJson !== undefined) {
        // Screenshot-derived activities are drafts until Save is pressed in Activity Creator.
        // sessionStorage is scoped to this browser tab; nothing is written to Supabase
        // or My Activities here. Both Create & Edit buttons submit this same form.
        window.sessionStorage.removeItem(TRACE_REFERENCE_KEY);
        window.sessionStorage.setItem(SCREENSHOT_DRAFT_KEY, JSON.stringify(activity));
        router.push("/create/screenshot-draft");
        return;
      }
      // Preserve the existing direct-save behavior for manually uploaded JSON files.
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
      {initialJson === undefined && <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-center hover:bg-slate-100">
        <span className="block font-semibold text-slate-700">Choose a JSON activity file</span>
        <span className="mt-1 block text-sm text-slate-500">.json format • maximum 5 MB • schema v2 or v3</span>
        <input ref={inputRef} type="file" accept=".json,application/json" className="sr-only"
          onChange={(event) => void selectFile(event.target.files?.[0])} disabled={saving || loading} />
      </label>}
      {loading && <p className="text-sm text-slate-600">Reading activity JSON...</p>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {parsed && (
        <form onSubmit={(event) => void save(event)} className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">{fileName}</p>
              <p className="text-sm text-slate-600">{parsed.frameCount} {parsed.frameCount === 1 ? "frame" : "frames"} • {parsed.playerCount} player markers in first frame • editable in Activity Creator</p>
            </div>
            {initialJson === undefined && <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={clear}>Remove file</button>}
          </div>
          <section aria-label="Activity diagram preview" className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-800">{comparisonImage ? "Compare Original & Generated Activity" : "Activity Preview"}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setEnlarged(true)} disabled={!previewUrl}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
                  Enlarge Preview
                </button>
                {initialJson !== undefined && <button type="submit" disabled={saving}
                  className="rounded-lg bg-[#0d2140] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Opening editor..." : "Create & Edit Activity"}
                </button>}
              </div>
            </div>
            <div className={comparisonImage ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : ""}>
              {comparisonImage && <div className="flex min-w-0 flex-col rounded-lg bg-slate-100 p-3">
                <p className="mb-2 text-center text-xs font-semibold text-slate-700">Original Screenshot</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={comparisonImage} alt="Original soccer activity screenshot" className="mx-auto h-[420px] w-full object-contain sm:h-[520px]" />
              </div>}
            <div className="flex min-w-0 flex-col items-center overflow-hidden rounded-lg bg-slate-100 p-3">
              {comparisonImage && <p className="mb-2 text-xs font-semibold text-slate-700">Generated Editable Activity</p>}
              {previewLoading && !previewUrl && <p className="text-sm text-slate-500">Rendering activity...</p>}
              {previewUrl && <img src={previewUrl} alt={`Activity diagram, frame ${frameIndex + 1}`} className={`h-[420px] w-full object-contain sm:h-[520px] ${previewLoading ? "opacity-50" : ""}`} />}
              {previewError && <p role="alert" className="p-3 text-sm text-red-700">Preview unavailable: {previewError}</p>}
            </div></div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-600">Frame {frameIndex + 1} of {frames.length}{activeFrame?.name ? ` · ${activeFrame.name}` : ""}</span>
              {frames.length > 1 && <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => { setPlaying(false); setFrameIndex((i) => (i - 1 + frames.length) % frames.length); }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">Previous</button>
                <button type="button" onClick={() => setPlaying((value) => !value)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">{playing ? "Pause" : "Play"}</button>
                <button type="button" onClick={() => { setPlaying(false); setFrameIndex((i) => (i + 1) % frames.length); }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">Next</button>
              </div>}
            </div>
            <p className="mt-2 text-xs text-slate-500">Read-only comparison. Create the activity to open it directly in Activity Creator and correct any objects or lines.</p>
          </section>
          {enlarged && <div role="dialog" aria-modal="true" aria-label="Enlarged activity diagram" onClick={() => setEnlarged(false)}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/80 p-4">
            <button type="button" onClick={() => setEnlarged(false)} className="self-end rounded-lg bg-white px-4 py-2 font-semibold text-slate-900">Close</button>
            {previewUrl && <img src={previewUrl} alt={`Enlarged activity diagram, frame ${frameIndex + 1}`} onClick={(event) => event.stopPropagation()}
              className="max-h-[83vh] max-w-full object-contain" />}
            <span className="text-sm text-white">Frame {frameIndex + 1} of {frames.length}</span>
          </div>}
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
            {initialJson === undefined && <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={clear} disabled={saving}>Cancel</button>}
            <button type="submit" disabled={saving} className="rounded-lg bg-[#0d2140] px-5 py-2 font-semibold text-white disabled:opacity-60">
              {saving ? "Opening editor..." : initialJson === undefined ? "Import JSON Activity" : "Create & Edit Activity"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
