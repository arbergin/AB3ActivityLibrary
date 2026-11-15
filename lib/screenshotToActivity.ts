"use client";

import type { ActivityCreatorColorObject, ActivityCreatorLine, ActivityCreatorObject, ActivityCreatorStateV3 } from "@/types/activity";

/** Screenshot analysis runs in terminable workers to preserve UI responsiveness.
 * Independent OCR has a hard timeout; a failed OCR never blocks activity creation.
 */
type Candidate = { x:number; y:number; r:number; rgb:[number,number,number]; label:string };
type Segment = { x1:number; y1:number; x2:number; y2:number; tone?: "dark" | "light" };
type Detection = { candidates:Candidate[]; segments:Segment[]; balls?:{x:number;y:number;r:number}[] };
export type ScreenshotStage = "preparing" | "opencv" | "detecting" | "detected" | "fallback" | "ocr" | "building" | "complete";
export type ScreenshotProgress = {stage:ScreenshotStage; percent:number; message:string};
export type ScreenshotConversion = {
  json: { name:string; activityDetails:string; numberOfPlayers:number; creatorState:ActivityCreatorStateV3 };
  warnings:string[];
  detected:{players:number; lines:number; numbered:number; balls:number};
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
  pixels:Uint8ClampedArray,width:number,height:number,
  limitMs:number,signal:AbortSignal,report:(stage:ScreenshotStage,percent:number,message:string)=>void,
):Promise<{result:Detection;engine:string;warning:string}>{
  return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(aborted());return;}
    // A different worker is used for each attempt, so blocking Wasm initialization
    // can always be interrupted by terminate() from the responsive UI thread.
    const worker=new Worker("/workers/ab3-screenshot-detect.js");
    let settled=false;
    let lastStage="starting worker";
    const cleanup=()=>{clearTimeout(timer);signal.removeEventListener("abort",onAbort);worker.terminate();};
    const finish=(err?:Error,value?:{result:Detection;engine:string;warning:string})=>{
      if(settled)return; settled=true;cleanup(); if(err)reject(err);else resolve(value!);
    };
    const onAbort=()=>finish(aborted());
    signal.addEventListener("abort",onAbort,{once:true});
    const timer=window.setTimeout(()=>finish(new Error(`Analysis worker exceeded its time limit during: ${lastStage}.`)),limitMs);
    worker.onerror=()=>finish(new Error("Screenshot analysis worker failed to start or execute."));
    worker.onmessage=(event:MessageEvent)=>{
      const data=event.data;
      if(data?.type==="progress"){lastStage=String(data.detail||data.stage);report(data.stage,data.percent,data.detail);}
      else if(data?.type==="done")finish(undefined,data);
      else if(data?.type==="error")finish(new Error(data.message||"Screenshot analysis failed."));
    };
    // Copy once per attempt, transferring ownership to the worker to avoid
    // costly structured clones and keep the retry buffer available.
    const transfer=pixels.slice().buffer;
    worker.postMessage({type:"analyze",width,height,pixels:transfer,},[transfer]);
  });
}

function runOCR(pixels:Uint8ClampedArray,width:number,height:number,candidates:Candidate[],signal:AbortSignal,report:(stage:ScreenshotStage,percent:number,message:string)=>void):Promise<{labels:{index:number;label:string}[];warning:string}>{
  return new Promise(resolve=>{
    if(!candidates.length||signal.aborted){resolve({labels:[],warning:""});return;}
    const worker=new Worker("/workers/ab3-screenshot-ocr.js");
    let settled=false;
    const finish=(labels:{index:number;label:string}[],warning:string)=>{
      if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener("abort",onAbort);worker.terminate();resolve({labels,warning});
    };
    const onAbort=()=>finish([],"OCR canceled.");
    signal.addEventListener("abort",onAbort,{once:true});
    const timer=window.setTimeout(()=>finish([],"Jersey-number recognition exceeded 14 seconds. Players remain editable without numbers."),14000);
    worker.onerror=()=>finish([],"OCR worker could not start. Add player numbers in Activity Creator.");
    worker.onmessage=(event:MessageEvent)=>{
      const data=event.data;
      if(data?.type==="progress")report("ocr",Math.min(95,data.percent??80),data.detail);
      else if(data?.type==="done")finish(Array.isArray(data.labels)?data.labels:[],"");
      else if(data?.type==="error")finish([],`OCR unavailable: ${data.message??"unknown error"}.`);
    };
    worker.postMessage({type:"recognize",width,height,candidates,pixels:pixels.slice().buffer});
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
  // Canvas processing runs off the main thread. No OpenCV download or Wasm setup.
  const detection=await runDetector(pixels,canvas.width,canvas.height,8000,controller,report);
  if(controller.aborted)throw aborted();
  if(detection.warning)warnings.push(detection.warning);
  const found=detection.result;
  report("ocr",80,"Attempting jersey-number recognition in a separate worker…");
  const ocr=await runOCR(pixels,canvas.width,canvas.height,found.candidates,controller,report);
  if(controller.aborted)throw aborted();
  if(ocr.warning)warnings.push(ocr.warning);
  for(const entry of ocr.labels){
    if(entry.index>=0&&entry.index<found.candidates.length&&/^\d{1,2}$/.test(entry.label))found.candidates[entry.index].label=entry.label;
  }
  report("building",96,"Building your editable activity…");
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
  let greenCount=0, sampled=0;
  for(let y=0;y<canvas.height;y+=15)for(let x=0;x<canvas.width;x+=15){
    const k=(y*canvas.width+x)*4,rr=pixels[k],gg=pixels[k+1],bb=pixels[k+2];
    if(gg>rr*1.25&&gg>bb*1.25&&gg>65)greenCount++;
    sampled++;
  }
  const isGreenPitch=greenCount/sampled>.3;
  const objects: ActivityCreatorObject[]=found.candidates.map(c=>{
    const isFirst=colorDistance(c.rgb,first)<=colorDistance(c.rgb,second);
    return { id:crypto.randomUUID(),type:isFirst?"team1":"team2", x:clamp(c.x/canvas.width,0,1),y:clamp(c.y/canvas.height,0,1),rotation:0,
      label:c.label || undefined,number:c.label || undefined,playerShape:"circle",size:clamp((c.r*2/canvas.width)*1000,25,64),fillColor:hex(...c.rgb),
      playerDisplayModeOverride:c.label?"number":"none",textColor:c.rgb[0]>160&&c.rgb[1]>160&&c.rgb[2]>160?rgba(0,0,0):rgba(255,255,255) };
  });
  // White markings are drawn on a blank green pitch to avoid duplicating
  // the built-in standard field. Decide dashed vs solid by sampling brightness.
  const lineWhite=(x:number,y:number)=>{
    const px=Math.round(clamp(x,0,canvas.width-1)),py=Math.round(clamp(y,0,canvas.height-1));
    const k=(py*canvas.width+px)*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2];
    return r>175&&g>175&&b>175&&Math.max(r,g,b)-Math.min(r,g,b)<48;
  };
  const lines: ActivityCreatorLine[]=found.segments.map(s=>{
    const length=Math.hypot(s.x2-s.x1,s.y2-s.y1),count=Math.max(8,Math.floor(length/3));
    let white=0;
    for(let i=0;i<=count;i++){const t=i/count;if(lineWhite(s.x1+(s.x2-s.x1)*t,s.y1+(s.y2-s.y1)*t))white++;}
    const isDark=s.tone==="dark";
    const dashed=!isDark && white/(count+1)<.72;
    return {id:crypto.randomUUID(),points:toPoints(s,canvas.width,canvas.height),color:isDark?"#0b0b0b":isGreenPitch?"#ffffff":"#555555",lineWidth:isDark?8:4,dashed,arrow:false,lineStyle:"standard"};
  });
  for(const ball of found.balls||[]){objects.push({id:crypto.randomUUID(),type:"ball",x:clamp(ball.x/canvas.width,0,1),y:clamp(ball.y/canvas.height,0,1),rotation:0,size:24});}
  if(!objects.length)warnings.push("No player markers were detected. Try a cleaner, higher-contrast screenshot or add players manually in Activity Creator.");
  warnings.push("Review field boundaries, arrows, goals and player numbers. White pitch lines and thick black horizontal/vertical boundaries are approximated; diagonal arrows and tactical meaning still require manual review.");
  const frameId=crypto.randomUUID();
  const creatorState:ActivityCreatorStateV3={schemaVersion:3,sourcePlatform:"web",clientActivityId:crypto.randomUUID(),
    pitch:{background:isGreenPitch?"greenBlank":"whiteBlank",zoom:1,offsetX:0,offsetY:0,rotationDegrees:0,pitchAssetVersion:2,coordinateSystem:"canonicalPitchV1"},
    settings:{playerDisplayMode:"number",team1DefaultColor:rgba(first[0], first[1], first[2]),team2DefaultColor:rgba(second[0], second[1], second[2]),team1DefaultShape:"circle",team2DefaultShape:"circle",playerTextDefaultColor:rgba(255,255,255),coneDefaultColor:rgba(249,115,22),playerDefaultSize:38,coneDefaultSize:14,logoSize:74,lineDefaultWidth:2,defaultFrameDurationMs:1000},
    activeFrameId:frameId,frames:[{id:frameId,name:"Tab 1",durationMs:1000,objects,lines}],objects,lines};
  report("complete", 100, "Activity ready for review.");
  return { json:{name:file.name.replace(/\.[^.]+$/,""),activityDetails:"Generated from a screenshot using browser-based Canvas detection and optional OCR. Review player numbers, lines, and object positions before use.",numberOfPlayers:found.candidates.length,creatorState},warnings,detected:{players:found.candidates.length,lines:lines.length,numbered:found.candidates.filter(c=>c.label).length,balls:(found.balls||[]).length}};
}
