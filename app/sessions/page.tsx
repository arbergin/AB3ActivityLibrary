"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import SessionDetailsFields, { SessionDetailsSummary } from "@/components/SessionDetailsFields";
import { archiveStandaloneSession, createStandaloneSession, getStandaloneSessions, updateStandaloneSession, type PlanningTeam } from "@/lib/teamPlanning";
import { emptySessionDetails, gamePhases, principleOptions, subprincipleOptions } from "@/lib/sessionTactics";

const inputClass = "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const primary = "rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
const secondary = "rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40";
export default function SessionsPage() {
  const [sessions,setSessions] = useState<PlanningTeam[]>([]);
  const [name,setName] = useState("");
  const [details,setDetails] = useState(emptySessionDetails);
  const [editingId,setEditingId] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [phase,setPhase] = useState("");
  const [principle,setPrinciple] = useState("");
  const [subprinciple,setSubprinciple] = useState("");
  const load = useCallback(async()=>{setLoading(true); try {setSessions(await getStandaloneSessions()); setError("");} catch(e){setError(e instanceof Error?e.message:"Unable to load sessions.");} finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  function reset(){setName("");setDetails(emptySessionDetails());setEditingId(null);}
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); if(saving||!name.trim())return; setSaving(true);
    try {const saved=editingId?await updateStandaloneSession(editingId,name,details):await createStandaloneSession(name,details);setSessions(current=>[saved,...current.filter(s=>s.id!==saved.id)]);reset();setError("");}
    catch(e){setError(e instanceof Error?e.message:"Unable to save session.");} finally{setSaving(false);}
  }
  async function archive(session:PlanningTeam){if(saving||!window.confirm(`Archive "${session.name}"? Its planning data will be preserved.`))return;setSaving(true);try{await archiveStandaloneSession(session.id);setSessions(current=>current.filter(s=>s.id!==session.id));if(editingId===session.id)reset();setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to archive session.");}finally{setSaving(false);}}
  const visible=sessions.filter(s=>{const d=s.sessionDetails??emptySessionDetails();return (!search.trim()||[s.name,d.objective,d.gamePhase,...d.principles,...d.subprinciples].join(' ').toLowerCase().includes(search.trim().toLowerCase()))&&(!phase||d.gamePhase===phase)&&(!principle||d.principles.includes(principle))&&(!subprinciple||d.subprinciples.includes(subprinciple));});
  const filterPrinciples=phase?principleOptions(phase):[...new Set(gamePhases.flatMap(principleOptions))];
  const filterSubs=[...new Set((phase?[phase]:gamePhases).flatMap(p=>subprincipleOptions(p,principle?[principle]:principleOptions(p))))];
  return <ProtectedPage><main className="min-h-screen bg-slate-100 text-slate-900"><AppHeader/><section className="mx-auto max-w-7xl grid grid-cols-1 items-start gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    <div className="min-w-0 scroll-mt-24 rounded-xl bg-white p-6 shadow-sm" id="session-editor"><h1 className="text-3xl font-bold">{editingId?"Edit Session":"Create Session"}</h1><p className="mt-2 text-slate-600">Create training sessions with objectives, tactical principles, activities and notes, independently of your teams.</p>
      <form onSubmit={save} className="mt-5 grid gap-4"><label className="grid gap-1 text-sm font-semibold text-slate-700">Session Name <input required maxLength={150} value={name} onChange={e=>setName(e.target.value)} placeholder="New session name" className={inputClass}/></label><SessionDetailsFields value={details} onChange={setDetails} compact/><div className="flex gap-2"><button className={primary} disabled={saving||!name.trim()} type="submit">{editingId?"Save Changes":"+ Create Session"}</button>{editingId&&<button className={secondary} type="button" onClick={reset} disabled={saving}>Cancel</button>}</div></form>
      {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
    <div className="min-w-0 rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold">My Sessions</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><input aria-label="Search sessions" className={inputClass} placeholder="Search sessions" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter game phase" className={inputClass} value={phase} onChange={e=>{setPhase(e.target.value);setPrinciple("");setSubprinciple("");}}><option value="">All game phases</option>{gamePhases.map(p=><option key={p}>{p}</option>)}</select><select aria-label="Filter principle" className={inputClass} value={principle} onChange={e=>{setPrinciple(e.target.value);setSubprinciple("");}}><option value="">All principles</option>{filterPrinciples.map(p=><option key={p}>{p}</option>)}</select><select aria-label="Filter subprinciple" className={inputClass} value={subprinciple} onChange={e=>setSubprinciple(e.target.value)}><option value="">All subprinciples</option>{filterSubs.map(p=><option key={p}>{p}</option>)}</select></div>
      {loading?<p>Loading sessions...</p>:!visible.length?<p className="text-slate-500">{sessions.length?"No sessions match your filters.":"No sessions yet. Use Create Session to get started."}</p>:<div className="divide-y divide-slate-200 rounded-lg border border-slate-200">{visible.map(session=><div key={session.id} className="flex flex-wrap items-start gap-4 p-4"><div className="min-w-0 flex-1 basis-80"><Link href={`/sessions/${session.id}`} className="mb-2 block text-lg font-semibold text-[#0d2140] hover:underline">{session.name}</Link><SessionDetailsSummary value={session.sessionDetails??emptySessionDetails()}/></div><div className="flex flex-wrap gap-2"><Link href={`/sessions/${session.id}`} className={primary}>Open</Link><button type="button" className={secondary} disabled={saving} onClick={()=>{setEditingId(session.id);setName(session.name);setDetails(session.sessionDetails??emptySessionDetails());document.getElementById('session-editor')?.scrollIntoView({behavior:'smooth',block:'start'});}}>Edit</button><button type="button" disabled={saving} className={`${secondary} border-red-300 text-red-700`} onClick={()=>void archive(session)}>Archive</button></div></div>)}</div>}
    </div></section></main></ProtectedPage>;
}
