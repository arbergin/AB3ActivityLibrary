"use client";
import { useEffect, useId, useRef } from "react";
import { gamePhases, principleOptions, subprincipleOptions, normalizeSessionDetails, type SessionDetails } from "@/lib/sessionTactics";

export function MultiSelect({label, options, values, onChange, disabled = false}: {label:string; options:string[]; values:string[]; onChange:(values:string[])=>void; disabled?:boolean}) {
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const dropdown = dropdownRef.current;
      if (dropdown?.open && event.target instanceof Node && !dropdown.contains(event.target)) {
        dropdown.open = false;
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      const dropdown = dropdownRef.current;
      if (event.key === "Escape" && dropdown?.open) {
        dropdown.open = false;
        if (dropdown.contains(document.activeElement)) dropdown.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  return <div className="min-w-0">
    <div className="mb-1 text-sm font-semibold text-slate-700">{label}</div>
    {disabled ? <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500">{label === "Principles" ? "Select a game phase to add principles" : "Select principles to add subprinciples"}</div> :
    <details ref={dropdownRef} className="relative rounded-lg border border-slate-300 bg-white">
      <summary className="cursor-pointer px-3 py-2 text-sm">{values.length ? `${values.length} selected` : `Select ${label.toLowerCase()}`}</summary>
      <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 min-w-0 overflow-auto rounded-lg border border-slate-300 bg-white p-2 shadow-lg">
        <button type="button" onClick={()=>onChange([])} className="mb-1 px-2 text-xs font-semibold text-blue-700">Clear selection</button>
        {options.map(option=><label key={option} className="flex cursor-pointer items-start gap-2 rounded p-2 text-sm hover:bg-slate-100"><input type="checkbox" className="mt-1 shrink-0" checked={values.includes(option)} onChange={e=>onChange(e.target.checked ? [...values,option] : values.filter(v=>v!==option))}/><span>{option}</span></label>)}
      </div>
    </details>}
    {!!values.length && <div className="mt-2 flex flex-wrap gap-1">{values.map(v=><button type="button" key={v} onClick={()=>onChange(values.filter(x=>x!==v))} className="rounded bg-slate-100 px-2 py-1 text-left text-xs text-slate-700" aria-label={`Remove ${v}`}>{v} ×</button>)}</div>}
  </div>;
}
export default function SessionDetailsFields({value,onChange,compact=false}: {value:SessionDetails; onChange:(value:SessionDetails)=>void; compact?:boolean}) {
  const id=useId();
  return <div className="grid gap-4">
    <label className="grid gap-1 text-sm font-semibold text-slate-700" htmlFor={`${id}-objective`}>Objective<textarea id={`${id}-objective`} rows={3} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={value.objective} onChange={e=>onChange({...value,objective:e.target.value})} placeholder="Enter the session objective"/></label>
    <div className={compact ? "grid gap-4" : "grid gap-4 md:grid-cols-3"}>
      <label className="grid content-start gap-1 text-sm font-semibold text-slate-700">Game Phase<select className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" value={value.gamePhase} onChange={e=>onChange({...value,gamePhase:e.target.value,principles:[],subprinciples:[]})}><option value="">No game phase selected</option>{gamePhases.map(p=><option key={p}>{p}</option>)}</select></label>
      <MultiSelect label="Principles" options={principleOptions(value.gamePhase)} values={value.principles} disabled={!value.gamePhase} onChange={principles=>onChange(normalizeSessionDetails({...value,principles}))}/>
      <MultiSelect label="Subprinciples" options={subprincipleOptions(value.gamePhase,value.principles)} values={value.subprinciples} disabled={!value.principles.length} onChange={subprinciples=>onChange({...value,subprinciples})}/>
    </div>
  </div>;
}
export function SessionDetailsSummary({value}: {value:SessionDetails}) {
  return <dl className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
    <div className="sm:col-span-2"><dt className="font-semibold">Objective</dt><dd className="whitespace-pre-wrap break-words">{value.objective || 'Not specified'}</dd></div>
    <div><dt className="font-semibold">Game Phase</dt><dd>{value.gamePhase || 'Not specified'}</dd></div>
    <div><dt className="font-semibold">Principles</dt><dd>{value.principles.join(' • ') || 'Not specified'}</dd></div>
    <div className="sm:col-span-2"><dt className="font-semibold">Subprinciples</dt><dd>{value.subprinciples.join(' • ') || 'Not specified'}</dd></div>
  </dl>;
}
