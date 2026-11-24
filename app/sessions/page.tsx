"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import SessionDetailsFields, { SessionVisibilityIndicator } from "@/components/SessionDetailsFields";
import { archiveStandaloneSession, createStandaloneSession, getStandaloneSessions, restoreStandaloneSession, permanentlyDeleteStandaloneSession, type PlanningTeam } from "@/lib/teamPlanning";
import { emptySessionDetails, gamePhases, principleOptions, subprincipleOptions, type SessionDetails } from "@/lib/sessionTactics";

const inputClass = "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const primary = "rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
const secondary = "rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40";
function errorMessage(error:unknown,fallback:string){return error instanceof Error?error.message:typeof error==="object"&&error!==null&&"message" in error?String(error.message):fallback;}
function CompactSessionSummary({value}: {value:SessionDetails}) {
  const fields = [
    {label:"Game Phase", text:value.gamePhase},
    {label:"Principles", text:value.principles.join(" • ")},
    {label:"Subprinciples", text:value.subprinciples.join(" • ")},
  ];
  const hasTactics = fields.some(field=>field.text.trim());
  const objective = value.objective.trim();
  if (!objective && !hasTactics) return <p className="text-xs text-slate-500">No session details added.</p>;
  return <div className="grid gap-2 text-sm leading-snug text-slate-700">
    {objective && <p className="whitespace-pre-wrap break-words"><span className="font-semibold">Objective: </span>{objective}</p>}
    {hasTactics && <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,2fr)]">
      {fields.map(field=>field.text.trim() ? <div key={field.label} className="min-w-0"><dt className="text-xs font-semibold text-slate-600">{field.label}</dt><dd className="break-words">{field.text}</dd></div> : null)}
    </dl>}
  </div>;
}
export default function SessionsPage() {
  const [sessions,setSessions] = useState<PlanningTeam[]>([]);
  const [name,setName] = useState("");
  const [details,setDetails] = useState(emptySessionDetails);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [tab,setTab] = useState<"mine"|"club"|"everyone">("mine");
  const [showArchived,setShowArchived] = useState(false);
  const [search,setSearch] = useState("");
  const [phase,setPhase] = useState("");
  const [principle,setPrinciple] = useState("");
  const [subprinciple,setSubprinciple] = useState("");
  const [revision,setRevision] = useState(0);
  const [loadedKey,setLoadedKey] = useState("");
  const query=search.trim();
  const requestKey=JSON.stringify([query,revision]);
  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    const timer=window.setTimeout(async()=>{
      try {
        const rows=await getStandaloneSessions(true,query);
        if(!cancelled){setSessions(rows);setError("");setLoadedKey(requestKey);}
      } catch(e){if(!cancelled){setSessions([]);setError(errorMessage(e,"Unable to load sessions."));setLoadedKey(requestKey);}}
      finally{if(!cancelled)setLoading(false);}
    },query?250:0);
    return ()=>{cancelled=true;window.clearTimeout(timer);};
  },[query,requestKey]);
  const refresh=()=>setRevision(v=>v+1);
  function reset(){setName("");setDetails(emptySessionDetails());}
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); if(saving||!name.trim())return; setSaving(true);
    try {await createStandaloneSession(name,details);refresh();reset();setTab("mine");setError("");}
    catch(e){setError(errorMessage(e,"Unable to save session."));} finally{setSaving(false);}
  }
  async function archive(session:PlanningTeam){if(saving||!window.confirm(`Archive "${session.name}"? Its planning data will be preserved.`))return;setSaving(true);try{await archiveStandaloneSession(session.id);refresh();setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to archive session.");}finally{setSaving(false);}}
  async function restore(session:PlanningTeam){if(saving)return;setSaving(true);try{await restoreStandaloneSession(session.id);refresh();setError("");}catch(e){setError(errorMessage(e,"Unable to restore session."));}finally{setSaving(false);}}
  async function remove(session:PlanningTeam){if(saving||session.isActive||!window.confirm(`Permanently delete "${session.name}" and its planning records? This cannot be undone. Original library activities will not be deleted.`))return;setSaving(true);try{await permanentlyDeleteStandaloneSession(session.id);refresh();setError("");}catch(e){setError(errorMessage(e,"Unable to delete session."));}finally{setSaving(false);}}
  const visible=sessions.filter(s=>{const d=s.sessionDetails??emptySessionDetails();return (tab==="mine"?s.isOwner&&(s.isActive||showArchived):!s.isOwner&&s.isActive&&d.visibility===tab)&&(!phase||d.gamePhase===phase)&&(!principle||d.principles.includes(principle))&&(!subprinciple||d.subprinciples.includes(subprinciple));});
  const filterPrinciples=phase?principleOptions(phase):[...new Set(gamePhases.flatMap(principleOptions))];
  const filterSubs=[...new Set((phase?[phase]:gamePhases).flatMap(p=>subprincipleOptions(p,principle?[principle]:principleOptions(p))))];
  return <ProtectedPage><main className="min-h-screen bg-slate-100 text-slate-900"><AppHeader/><section className="mx-auto max-w-7xl grid grid-cols-1 items-start gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    <div className="min-w-0 scroll-mt-24 rounded-xl bg-white p-6 shadow-sm" id="session-editor"><h1 className="text-3xl font-bold">Create Session</h1><p className="mt-2 text-slate-600">Create training sessions with objectives, tactical principles, activities and notes, independently of your teams.</p>
      <form onSubmit={save} className="mt-5 grid gap-4"><label className="grid gap-1 text-sm font-semibold text-slate-700">Session Name (required) <input required maxLength={150} value={name} onChange={e=>setName(e.target.value)} placeholder="New session name" className={inputClass}/></label><p className="text-sm text-slate-600">Only Session Name is required. You can add or edit the objective and tactical details later.</p><SessionDetailsFields value={details} onChange={setDetails} compact/><div className="flex gap-2"><button className={primary} disabled={saving} type="submit">+ Create Session</button></div></form>

    </div>
    <div className="min-w-0 rounded-xl bg-white p-6 shadow-sm"><div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200" role="tablist" aria-label="Session library">{([{id:"mine",label:"My Sessions"},{id:"club",label:"Club Sessions"},{id:"everyone",label:"All Sessions"}] as const).map(item=><button type="button" role="tab" aria-selected={tab===item.id} key={item.id} onClick={()=>setTab(item.id)} className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab===item.id?"border-[#0d2140] text-[#0d2140]":"border-transparent text-slate-500 hover:text-[#0d2140]"}`}>{item.label}</button>)}</div>
      {tab!=="mine"&&<p className="mb-4 text-sm text-slate-600">{tab==="club"?"Sessions shared by other coaches in your club.":"Sessions shared with everyone by other coaches."} Open a session to view or copy it.</p>}
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><input aria-label="Search sessions" className={inputClass} placeholder="Search sessions" title="Search names, objectives, tactics, activities, notes and session creators" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter game phase" className={inputClass} value={phase} onChange={e=>{setPhase(e.target.value);setPrinciple("");setSubprinciple("");}}><option value="">All game phases</option>{gamePhases.map(p=><option key={p}>{p}</option>)}</select><select aria-label="Filter principle" className={inputClass} value={principle} onChange={e=>{setPrinciple(e.target.value);setSubprinciple("");}}><option value="">All principles</option>{filterPrinciples.map(p=><option key={p}>{p}</option>)}</select><select aria-label="Filter subprinciple" className={inputClass} value={subprinciple} onChange={e=>setSubprinciple(e.target.value)}><option value="">All subprinciples</option>{filterSubs.map(p=><option key={p}>{p}</option>)}</select></div>
      {tab==="mine"&&<label className="mb-4 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Show Archived Sessions</label>}
      {error&&<p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      {(loading||loadedKey!==requestKey)?<p>{query?"Searching sessions...":"Loading sessions..."}</p>:!visible.length?<p className="text-slate-500">{tab==="mine"?"No sessions match your filters. Use Create Session to get started or show archived sessions.":"No shared sessions match your filters."}</p>:<div className="divide-y divide-slate-200 rounded-lg border border-slate-200">{visible.map(session=><div key={session.id} className="grid gap-2 p-3"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"><div className="flex min-w-0 flex-1 basis-40 flex-wrap items-center gap-x-2 gap-y-1"><Link href={`/sessions/${session.id}`} className="min-w-0 break-words text-base font-semibold text-[#0d2140] hover:underline">{session.name}</Link><SessionVisibilityIndicator value={(session.sessionDetails??emptySessionDetails()).visibility}/>{!session.isActive&&<span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Archived</span>}</div><div className="flex flex-wrap gap-2"><Link href={`/sessions/${session.id}`} className={`${primary} inline-flex w-24 items-center justify-center`}>Open</Link>{session.isOwner&&(session.isActive?<button type="button" disabled={saving} className={`${secondary} inline-flex w-24 items-center justify-center border-red-300 text-red-700`} onClick={()=>void archive(session)}>Archive</button>:<><button type="button" disabled={saving} className={`${secondary} inline-flex w-24 items-center justify-center text-emerald-700`} onClick={()=>void restore(session)}>Restore</button><button type="button" disabled={saving} className={`${secondary} inline-flex w-24 items-center justify-center border-red-300 text-red-700`} onClick={()=>void remove(session)}>Delete</button></>)}</div></div><CompactSessionSummary value={session.sessionDetails??emptySessionDetails()}/></div>)}</div>}
    </div></section></main></ProtectedPage>;
}
