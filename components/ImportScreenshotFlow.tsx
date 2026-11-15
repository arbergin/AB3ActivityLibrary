"use client";

import { useEffect, useRef, useState } from "react";
import ImportJsonFlow from "@/components/ImportJsonFlow";
import { convertScreenshot, type ScreenshotConversion, type ScreenshotProgress } from "@/lib/screenshotToActivity";

export default function ImportScreenshotFlow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScreenshotConversion | null>(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<ScreenshotProgress | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);

  useEffect(() => () => { if (original) URL.revokeObjectURL(original); }, [original]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!working) return;
    const start = Date.now();
    const ticker = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 500);
    return () => window.clearInterval(ticker);
  }, [working]);

  function chooseFile(next?: File) {
    setError(""); setResult(null); setFile(null); setProgress(null);
    if (!next) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(next.type)) { setError("Choose a PNG, JPG, or WebP screenshot."); return; }
    if (next.size > 12 * 1024 * 1024) { setError("Maximum image size is 12 MB."); return; }
    setFile(next);
    setOriginal(URL.createObjectURL(next));
  }

  async function generate() {
    if (!file || working) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true); setError(""); setResult(null); setSeconds(0);
    setProgress({stage:"preparing",percent:0,message:"Starting screenshot analysis…"});
    try {
      const conversion = await convertScreenshot(file, setProgress, controller.signal);
      if (!controller.signal.aborted) { setResult(conversion); setGeneration(x => x + 1); }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Screenshot recognition failed. Please try another image.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setWorking(false);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setWorking(false);
    setProgress(null);
    setError("Analysis canceled. You can choose another screenshot or try again.");
  }

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(result.json.name || "AB3 Activity").replace(/[^a-z0-9 _-]/gi,"_")}.json`;
    document.body.appendChild(anchor);
    anchor.click();anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="space-y-5">
    <p className="text-sm text-slate-600">Free, browser-based detection. OpenCV runs in a separate worker so a stalled analysis can be canceled; Canvas detection is used if OpenCV is unavailable. Jersey-number OCR runs separately with a time limit and is optional if recognition is unavailable. Always review the generated activity before saving.</p>
    <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-center hover:bg-slate-100">
      <span className="block font-semibold text-slate-700">Choose a soccer activity screenshot</span>
      <span className="mt-1 block text-sm text-slate-500">PNG, JPG or WebP • Maximum 12 MB</span>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={working} onChange={event => chooseFile(event.target.files?.[0])}/>
    </label>
    {file && <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm font-semibold text-slate-700">{file.name}</span>
      <div className="flex items-center gap-2">
        {working && <button type="button" onClick={cancel} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700">Cancel</button>}
        <button type="button" disabled={working} onClick={() => void generate()} className="rounded-lg bg-[#0d2140] px-5 py-2 font-semibold text-white disabled:opacity-60">{working ? "Analyzing screenshot..." : result ? "Analyze Again" : "Generate Editable Activity"}</button>
      </div>
    </div>}
    {/* Progress is placed ABOVE the original image and represents completed stages,
        not a fictional estimate of how long Wasm download/compilation will take. */}
    {working && <div className="rounded-lg border border-blue-200 bg-blue-50 p-4" role="status" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-800">{progress?.message || "Analyzing screenshot…"}</span>
        <span className="shrink-0 font-semibold text-slate-700">{progress?.percent ?? 0}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-label="Screenshot analysis stage progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress?.percent ?? 0}>
        <div className="h-full rounded-full bg-blue-700 transition-all duration-300" style={{width:`${progress?.percent ?? 0}%`}}/>
      </div>
      <p className="mt-2 text-xs text-slate-600">{seconds}s elapsed • Progress indicates processing stages, not exact time remaining. OpenCV has a 6s limit, Canvas fallback 7s, and optional OCR 14s. You can cancel at any time.</p>
    </div>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {original && <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="mb-2 font-semibold text-slate-800">Original screenshot</h3>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={original} alt="Original uploaded soccer diagram" className="mx-auto max-h-96 max-w-full object-contain" />
    </div>}
    {result && <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Detected {result.detected.players} player markers, {result.detected.numbered} numbers, and {result.detected.lines} line segments.</p>
          <button type="button" onClick={downloadJson} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Download JSON</button>
        </div>
        {result.warnings.map((message, index) => <p key={index} className="mt-2 text-sm text-amber-800">{message}</p>)}
      </div>
      <h3 className="text-xl font-bold">Review editable activity and import</h3>
      <ImportJsonFlow key={generation} initialJson={result.json} initialName={result.json.name}/>
    </div>}
  </div>;
}
