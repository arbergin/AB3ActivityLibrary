"use client";

import type { ActivityCreatorColorObject, ActivityCreatorLine, ActivityCreatorObject, ActivityCreatorStateV3 } from "@/types/activity";

/** Browser image analysis with OpenCV isolated in a terminable worker.
 * If it fails or stalls, restart in Canvas-only mode. OCR is deliberately
 * disabled while validating safe worker execution; numbers remain editable.
 */
type Candidate = { x:number; y:number; r:number; rgb:[number,number,number]; label:string };
type Segment = { x1:number; y1:number; x2:number; y2:number };
type Detection = { candidates:Candidate[]; segments:Segment[] };
export type ScreenshotStage = "preparing" | "opencv" | "detecting" | "detected" | "fallback" | "building" | "complete";
export type ScreenshotProgress = {stage:ScreenshotStage; percent:number; message:string};
export type ScreenshotConversion = {
  json: { name:string; activityDetails:string; numberOfPlayers:number; creatorState:ActivityCreatorStateV3 };
  warnings:string[];
  detected:{players:number; lines:number; numbered:number};
};
function clamp(v:number,lo:number,hi:number){return Math.max(lo,Math.min(hi,v));}
function rgba(red:number,green:number,blue:number):ActivityCreatorColorObject{
  return {red:red/255,green:green/255,blue:blue/255,opacity:1};
}
function hex(r:number,g:number,b:number){return `#${[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,"0")).join("")}`;}
function colorDistance(a:number[],b:number[]){return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);}
function toPoints(s:Segment,w:number,h:number){return [{x:clamp(s.x1/w,0,1),y:clamp(s.y1/h,0,1)},{x:clamp(s.x2/w,0,1),y:clamp(s.y2/h,0,1)}];}
function aborted(){return new DOMException("Screenshot analysis was canceled.","AbortError");}

function runDetector(
  pixels:Uint8ClampedArray,width:number,height:number,fallbackOnly:boolean,
  limitMs:number,signal:AbortSignal,report:(stage:ScreenshotStage,percent:number,message:string)=>void,
):Promise<{result:Detection;engine:string;warning:string}>{
  return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(aborted());return;}
    // A different worker is used for each attempt, so blocking Wasm initialization
    // can always be interrupted by terminate() from the responsive UI thread.
    const worker=new Worker("/workers/ab3-screenshot-detect.js");
    let settled=false;
    const cleanup=()=>{clearTimeout(timer);signal.removeEventListener("abort",onAbort);worker.terminate();};
    const finish=(err?:Error,value?:{result:Detection;engine:string;warning:string})=>{
      if(settled)return; settled=true;cleanup(); if(err)reject(err);else resolve(value!);
    };
    const onAbort=()=>finish(aborted());
    signal.addEventListener("abort",onAbort,{once:true});
    const timer=window.setTimeout(()=>finish(new Error("Analysis worker exceeded its time limit.")),limitMs);
    worker.onerror=()=>finish(new Error("Screenshot analysis worker failed to start or execute."));
    worker.onmessage=(event:MessageEvent)=>{
      const data=event.data;
      if(data?.type==="progress")report(data.stage,data.percent,data.detail);
      else if(data?.type==="done")finish(undefined,data);
      else if(data?.type==="error")finish(new Error(data.message||"Screenshot analysis failed."));
    };
    // Copy once per attempt, transferring ownership to the worker to avoid
    // costly structured clones and keep the retry buffer available.
    const transfer=pixels.slice().buffer;
    worker.postMessage({type:"analyze",width,height,pixels:transfer,fallbackOnly},[transfer]);
  });
}

export async function convertScreenshot(
  file:File, onProgress?:(progress:ScreenshotProgress)=>void, signal?:AbortSignal,
):Promise<ScreenshotConversion>{
  if(!/^image\/(png|jpeg|webp)$/i.test(file.type))throw new Error("Choose a PNG, JPG, or WebP image.");
  if(file.size>12*1024*1024)throw new Error("Images must be 12 MB or smaller.");
  const controller=signal??new AbortController().signal;
  const report=(stage:ScreenshotStage,percent:number,message:string)=>onProgress?.({stage,percent,message});
  if(controller.aborted)throw aborted();
  report("preparing",8,"Preparing image for analysis…");
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,780/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));
  canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  if(!ctx){bitmap.close();throw new Error("Canvas is unavailable in this browser.");}
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  if(controller.aborted)throw aborted();
  const warnings:string[]=[];
  let detection:{result:Detection;engine:string;warning:string};
  try {
    detection=await runDetector(pixels,canvas.width,canvas.height,false,11000,controller,report);
  }catch(error){
    if(controller.aborted)throw aborted();
    report("fallback",50,"OpenCV could not finish. Switching to safer Canvas detection…");
    warnings.push(`OpenCV did not complete (${error instanceof Error?error.message:"unknown issue"}). Canvas fallback used.`);
    detection=await runDetector(pixels,canvas.width,canvas.height,true,7000,controller,report);
  }
  if(controller.aborted)throw aborted();
  if(detection.warning)warnings.push(detection.warning);
  if(detection.engine!=="opencv")warnings.push("Canvas fallback recognizes candidate player markers but does not reconstruct diagram lines. Add or adjust lines in Activity Creator.");
  warnings.push("Jersey-number OCR is temporarily disabled to prevent browser freezes. Numbered players can be edited after importing.");
  const found=detection.result;
  report("building", 90, "Building your editable activity…");
  // The two most frequent non-green marker colors become AB3's two teams.
  const clusters: {rgb:[number,number,number];count:number}[]=[];
  for(const c of found.candidates){
    const cluster=clusters.find(g=>colorDistance(g.rgb,c.rgb)<85);
    if(cluster)cluster.count++;
    else clusters.push({rgb:c.rgb,count:1});
  }
  clusters.sort((a,b)=>b.count-a.count);
  const first=clusters[0]?.rgb??[37,99,235];
  const second=clusters.find(g=>colorDistance(g.rgb,first)>85)?.rgb??[239,68,68];
  const objects: ActivityCreatorObject[]=found.candidates.map(c=>{
    const isFirst=colorDistance(c.rgb,first)<=colorDistance(c.rgb,second);
    return { id:crypto.randomUUID(),type:isFirst?"team1":"team2", x:clamp(c.x/canvas.width,0,1),y:clamp(c.y/canvas.height,0,1),rotation:0,
      label:c.label || undefined,number:c.label || undefined,playerShape:"circle",size:clamp(c.r*2/scale,12,52),fillColor:hex(...c.rgb),
      playerDisplayModeOverride:c.label?"number":"none",textColor:rgba(255,255,255) };
  });
  const lines: ActivityCreatorLine[]=found.segments.map(s=>({id:crypto.randomUUID(),points:toPoints(s,canvas.width,canvas.height),color:"#555555",lineWidth:2,dashed:false,arrow:false,lineStyle:"standard"}));
  if(!objects.length)warnings.push("No player markers were detected. Try a cleaner, higher-contrast screenshot or add players manually in Activity Creator.");
  warnings.push("Review lines, arrows, goals, and player numbers. This free detector recognizes shapes rather than tactical meaning; perspective diagrams and complex backgrounds may need substantial manual corrections.");
  const frameId=crypto.randomUUID();
  const creatorState:ActivityCreatorStateV3={schemaVersion:3,sourcePlatform:"web",clientActivityId:crypto.randomUUID(),
    pitch:{background:"whiteBlank",zoom:1,offsetX:0,offsetY:0,rotationDegrees:0,pitchAssetVersion:2,coordinateSystem:"canonicalPitchV1"},
    settings:{playerDisplayMode:"number",team1DefaultColor:rgba(first[0], first[1], first[2]),team2DefaultColor:rgba(second[0], second[1], second[2]),team1DefaultShape:"circle",team2DefaultShape:"circle",playerTextDefaultColor:rgba(255,255,255),coneDefaultColor:rgba(249,115,22),playerDefaultSize:26,coneDefaultSize:14,logoSize:74,lineDefaultWidth:2,defaultFrameDurationMs:1000},
    activeFrameId:frameId,frames:[{id:frameId,name:"Tab 1",durationMs:1000,objects,lines}],objects,lines};
  report("complete", 100, "Activity ready for review.");
  return { json:{name:file.name.replace(/\.[^.]+$/,""),activityDetails:"Generated from a screenshot using browser-based OpenCV.js with a Canvas fallback. OCR is temporarily disabled; review detected players, labels, and movement lines before use.",numberOfPlayers:objects.length,creatorState},warnings,detected:{players:objects.length,lines:lines.length,numbered:found.candidates.filter(c=>c.label).length}};
}
