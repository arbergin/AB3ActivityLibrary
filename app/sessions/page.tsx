"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import SessionDetailsFields, { SessionDetailsSummary } from "@/components/SessionDetailsFields";
import { archiveStandaloneSession, createStandaloneSession, getStandaloneSessions, restoreStandaloneSession, permanentlyDeleteStandaloneSession, type PlanningTeam } from "@/lib/teamPlanning";
import { emptySessionDetails, gamePhases, principleOptions, subprincipleOptions } from "@/lib/sessionTactics";

const inputClass = "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const primary = "rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
const secondary = "rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40";
function errorMessage(error:unknown,fallback:string){return error instanceof Error?error.message:typeof error==="object"&&error!==null&&"message" in error?String(error.message):fallback;}
export default function SessionsPage() {
  const [sessions,setSessions] = useState<PlanningTeam[]>([]);
  const [name,setName] = useState("");
  const [details,setDetails] = useState(emptySessionDetails);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [showArchived,setShowArchived] = useState(false);
  const [search,setSearch] = useState("");
  const [phase,setPhase] = useState("");
  const [principle,setPrinciple] = useState("");
  const [subprinciple,setSubprinciple] = useState("");
  const load = useCallback(async()=>{setLoading(true); try {setSessions(await getStandaloneSessions(true)); setError("");} catch(e){setError(e instanceof Error?e.message:"Unable to load sessions.");} finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  function reset(){setName("");setDetails(emptySessionDetails());}
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); if(saving||!name.trim())return; setSaving(true);
    try {const saved=await createStandaloneSession(name,details);setSessions(current=>[saved,...current.filter(s=>s.id!==saved.id)]);reset();setError("");}
    catch(e){setError(e instanceof Error?e.message:"Unable to save session.");} finally{setSaving(false);}
  }
  async function archive(session:PlanningTeam){if(saving||!window.confirm(`Archive "${session.name}"? Its planning data will be preserved.`))return;setSaving(true);try{await archiveStandaloneSession(session.id);setSessions(current=>current.map(s=>s.id===session.id?{...s,isActive:false}:s));setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to archive session.");}finally{setSaving(false);}}
  async function restore(session:PlanningTeam){if(saving)return;setSaving(true);try{const restored=await restoreStandaloneSession(session.id);setSessions(current=>current.map(s=>s.id===session.id?restored:s));setError("");}catch(e){setError(errorMessage(e,"Unable to restore session."));}finally{setSaving(false);}}
  async function remove(session:PlanningTeam){if(saving||session.isActive||!window.confirm(`Permanently delete "${session.name}" and its planning records? This cannot be undone. Original library activities will not be deleted.`))return;setSaving(true);try{await permanentlyDeleteStandaloneSession(session.id);setSessions(current=>current.filter(s=>s.id!==session.id));setError("");}catch(e){setError(errorMessage(e,"Unable to delete session."));}finally{setSaving(false);}}
  const visible=sessions.filter(s=>{const d=s.sessionDetails??emptySessionDetails();return (s.isActive||showArchived)&&(!search.trim()||[s.name,d.objective,d.gamePhase,...d.principles,...d.subprinciples].join(' ').toLowerCase().includes(search.trim().toLowerCase()))&&(!phase||d.gamePhase===phase)&&(!principle||d.principles.includes(principle))&&(!subprinciple||d.subprinciples.includes(subprinciple));});
  const filterPrinciples=phase?principleOptions(phase):[...new Set(gamePhases.flatMap(principleOptions))];
  const filterSubs=[...new Set((phase?[phase]:gamePhases).flatMap(p=>subprincipleOptions(p,principle?[principle]:principleOptions(p))))];
  return <ProtectedPage><main className="min-h-screen bg-slate-100 text-slate-900"><AppHeader/><section className="mx-auto max-w-7xl grid grid-cols-1 items-start gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    <div className="min-w-0 scroll-mt-24 rounded-xl bg-white p-6 shadow-sm" id="session-editor"><h1 className="text-3xl font-bold">Create Session</h1><p className="mt-2 text-slate-600">Create training sessions with objectives, tactical principles, activities and notes, independently of your teams.</p>
      <form onSubmit={save} className="mt-5 grid gap-4"><label className="grid gap-1 text-sm font-semibold text-slate-700">Session Name (required) <input required maxLength={150} value={name} onChange={e=>setName(e.target.value)} placeholder="New session name" className={inputClass}/></label><p className="text-sm text-slate-600">Only Session Name is required. You can add or edit the objective and tactical details later.</p><SessionDetailsFields value={details} onChange={setDetails} compact/><div className="flex gap-2"><button className={primary} disabled={saving} type="submit">+ Create Session</button></div></form>

    </div>
    <div className="min-w-0 rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold">My Sessions</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><input aria-label="Search sessions" className={inputClass} placeholder="Search sessions" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter game phase" className={inputClass} value={phase} onChange={e=>{setPhase(e.target.value);setPrinciple("");setSubprinciple("");}}><option value="">All game phases</option>{gamePhases.map(p=><option key={p}>{p}</option>)}</select><select aria-label="Filter principle" className={inputClass} value={principle} onChange={e=>{setPrinciple(e.target.value);setSubprinciple("");}}><option value="">All principles</option>{filterPrinciples.map(p=><option key={p}>{p}</option>)}</select><select aria-label="Filter subprinciple" className={inputClass} value={subprinciple} onChange={e=>setSubprinciple(e.target.value)}><option value="">All subprinciples</option>{filterSubs.map(p=><option key={p}>{p}</option>)}</select></div>
      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Show Archived Sessions</label>
      {error&&<p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      {loading?<p>Loading sessions...</p>:!visible.length?<p className="text-slate-500">{sessions.length?"No sessions match your filters. Archived sessions can be shown using the checkbox above.":"No sessions yet. Use Create Session to get started."}</p>:<div className="divide-y divide-slate-200 rounded-lg border border-slate-200">{visible.map(session=><div key={session.id} className="flex flex-wrap items-start gap-4 p-4"><div className="min-w-0 flex-1 basis-80"><Link href={`/sessions/${session.id}`} className="mb-2 block text-lg font-semibold text-[#0d2140] hover:underline">{session.name}</Link>{!session.isActive&&<span className="mb-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Archived</span>}<SessionDetailsSummary value={session.sessionDetails??emptySessionDetails()}/></div><div className="flex flex-wrap gap-2"><Link href={`/sessions/${session.id}`} className={`${primary} inline-flex w-24 items-center justify-center`}>Open</Link>{session.isActive?<button type="button" disabled={saving} className={`${secondary} inline-flex w-24 items-center justify-center border-red-300 text-red-700`} onClick={()=>void archive(session)}>Archive</button>:<><button type="button" disabled={saving} className={`${secondary} inline-flex w-24 items-center justify-center text-emerald-700`} onClick={()=>void restore(session)}>Restore</button><button type="button" disabled={saving} className={`${secondary} inline-flex w-24 items-center justify-center border-red-300 text-red-700`} onClick={()=>void remove(session)}>Delete</button></>}</div></div>)}</div>}
    </div></section></main></ProtectedPage>;
}
