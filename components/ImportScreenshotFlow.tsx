"use client";

import { useEffect, useRef, useState } from "react";
import ImportJsonFlow from "@/components/ImportJsonFlow";
import { convertScreenshot, type ScreenshotConversion } from "@/lib/screenshotToActivity";

export default function ImportScreenshotFlow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScreenshotConversion | null>(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);

  useEffect(() => () => { if (original) URL.revokeObjectURL(original); }, [original]);

  function chooseFile(next?: File) {
    setError(""); setResult(null); setFile(null);
    if (!next) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(next.type)) { setError("Choose a PNG, JPG, or WebP screenshot."); return; }
    if (next.size > 12 * 1024 * 1024) { setError("Maximum image size is 12 MB."); return; }
    setFile(next);
    setOriginal(URL.createObjectURL(next));
  }

  async function generate() {
    if (!file || working) return;
    setWorking(true); setError(""); setResult(null);
    try {
      const conversion = await convertScreenshot(file, setProgress);
      setResult(conversion);
      setGeneration(x => x + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Screenshot recognition failed.");
    } finally { setWorking(false); setProgress(""); }
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
    <p className="text-sm text-slate-600">Free, browser-based detection using OpenCV.js and Tesseract.js. Your screenshot is processed on your device; the libraries load from public CDNs on first use. Clean, top-down diagrams work best. Always review the generated activity before saving.</p>
    <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-center hover:bg-slate-100">
      <span className="block font-semibold text-slate-700">Choose a soccer activity screenshot</span>
      <span className="mt-1 block text-sm text-slate-500">PNG, JPG or WebP • Maximum 12 MB</span>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={working} onChange={event => chooseFile(event.target.files?.[0])}/>
    </label>
    {file && <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm font-semibold text-slate-700">{file.name}</span>
      <button type="button" disabled={working} onClick={() => void generate()} className="rounded-lg bg-[#0d2140] px-5 py-2 font-semibold text-white disabled:opacity-60">{working ? "Analyzing screenshot..." : result ? "Analyze Again" : "Generate Editable Activity"}</button>
    </div>}
    {working && <p role="status" className="text-sm text-slate-600">{progress || "Processing image..."} This may take a while for large diagrams.</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {original && <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="mb-2 font-semibold text-slate-800">Original screenshot</h3>
      {/* A local preview is intentionally displayed independently from saved activity data. */}
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
