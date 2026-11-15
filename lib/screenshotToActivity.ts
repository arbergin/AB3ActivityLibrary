"use client";

import type { ActivityCreatorColorObject, ActivityCreatorLine, ActivityCreatorObject, ActivityCreatorStateV3 } from "@/types/activity";

/**
 * Entirely client-side screenshot converter. OpenCV.js supplies Hough circle/line
 * detection; Tesseract.js reads digits in candidate player markers. It does not
 * infer tactical meaning and must always be followed by an editable review.
 */
type CvMat = {
  rows: number; cols: number; data: Uint8Array; data32S: Int32Array;
  delete(): void; ucharPtr(row: number, col: number): Uint8Array;
};
type CvApi = {
  Mat: new () => CvMat;
  MatVector: new () => { size(): number; get(index: number): CvMat; delete(): void };
  Size: new (w: number, h: number) => object;
  Scalar: new (...args: number[]) => object;
  imread(source: HTMLCanvasElement): CvMat;
  cvtColor(src: CvMat, dst: CvMat, code: number): void;
  GaussianBlur(src: CvMat, dst: CvMat, size: object, sigma: number): void;
  HoughCircles(src: CvMat, circles: CvMat, method: number, dp: number, minDist: number, p1: number, p2: number, minR: number, maxR: number): void;
  Canny(src: CvMat, dst: CvMat, low: number, high: number): void;
  HoughLinesP(src: CvMat, lines: CvMat, rho: number, theta: number, threshold: number, minLen: number, maxGap: number): void;
  circle(src: CvMat, center: object, radius: number, color: object, thickness: number): void;
  Point: new (x: number, y: number) => object;
  COLOR_RGBA2GRAY: number;
  HOUGH_GRADIENT: number;
};
type OcrWorker = {
  recognize(input: HTMLCanvasElement): Promise<{ data: { text: string; confidence?: number } }>;
  terminate(): Promise<void>;
};
type OcrApi = { createWorker(lang: string): Promise<OcrWorker> };

declare global {
  interface Window {
    cv?: CvApi & { onRuntimeInitialized?: () => void; Mat?: CvApi["Mat"] };
    Tesseract?: OcrApi;
  }
}

const OPENCV_URL = "https://docs.opencv.org/4.x/opencv.js";
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const MAX_SIDE = 1100;

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const prior = document.getElementById(id) as HTMLScriptElement | null;
    if (prior?.dataset.loaded === "true") { resolve(); return; }
    if (prior) {
      prior.addEventListener("load", () => resolve(), { once: true });
      prior.addEventListener("error", () => reject(new Error(`Could not download ${id}. Check your internet connection or CSP.`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error(`Could not download ${id}. Check your internet connection or CSP.`));
    document.head.appendChild(script);
  });
}

async function getCv(): Promise<CvApi> {
  await loadScript("ab3-opencv", OPENCV_URL);
  const cv = window.cv;
  if (!cv) throw new Error("OpenCV did not initialize.");
  // Some OpenCV.js builds expose a promise-like factory.
  if (typeof (cv as unknown as { then?: unknown }).then === "function") {
    return await (cv as unknown as Promise<CvApi>);
  }
  if (typeof cv.imread === "function") return cv;
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("OpenCV initialization timed out.")), 20000);
    cv.onRuntimeInitialized = () => { window.clearTimeout(timer); resolve(); };
  });
  return cv;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rgba(red: number, green: number, blue: number): ActivityCreatorColorObject {
  return { red: red / 255, green: green / 255, blue: blue / 255, opacity: 1 };
}
function hex(r: number, g: number, b: number) {
  return `#${[r,g,b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}
function colorDistance(a: number[], b: number[]) { return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]); }
function isGreen(r: number, g: number, b: number) { return g > r * 1.16 && g > b * 1.10 && g > 65; }

type Candidate = { x: number; y: number; r: number; rgb: [number, number, number]; label: string };
type Segment = { x1: number; y1: number; x2: number; y2: number };
export type ScreenshotConversion = {
  json: { name: string; activityDetails: string; numberOfPlayers: number; creatorState: ActivityCreatorStateV3 };
  warnings: string[];
  detected: { players: number; lines: number; numbered: number };
};

function sampleMarker(pixels: Uint8ClampedArray, w: number, h: number, x: number, y: number, radius: number): [number,number,number] {
  const samples: number[][] = [];
  for (let dy = -0.55; dy <= 0.55; dy += 0.275) for (let dx = -0.55; dx <= 0.55; dx += 0.275) {
    if (dx * dx + dy * dy > 0.42) continue;
    const xx = clamp(Math.round(x + dx * radius),0,w-1);
    const yy = clamp(Math.round(y + dy * radius),0,h-1);
    const i = (yy * w + xx) * 4;
    const rgb = [pixels[i], pixels[i+1], pixels[i+2]];
    if (Math.max(...rgb)-Math.min(...rgb)>30 && !isGreen(...(rgb as [number,number,number]))) samples.push(rgb);
  }
  if (!samples.length) {
    const i = (clamp(Math.round(y),0,h-1)*w+clamp(Math.round(x),0,w-1))*4;
    return [pixels[i],pixels[i+1],pixels[i+2]];
  }
  return [0,1,2].map(k => Math.round(samples.reduce((s,c)=>s+c[k],0)/samples.length)) as [number,number,number];
}

function detect(cv: CvApi, canvas: HTMLCanvasElement): { candidates: Candidate[]; segments: Segment[] } {
  const mats: CvMat[] = [];
  const mat = () => { const m = new cv.Mat(); mats.push(m); return m; };
  const src = cv.imread(canvas); mats.push(src);
  const gray = mat(), blurred = mat(), circles = mat(), edges = mat(), lines = mat();
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5,5), 1.5);
    cv.HoughCircles(blurred, circles, cv.HOUGH_GRADIENT, 1.2, 16, 110, 22, 7, Math.min(65, Math.floor(Math.min(canvas.width,canvas.height)/9)));
    const pixels = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0,0,canvas.width,canvas.height).data;
    const candidates: Candidate[] = [];
    const values = new Float32Array(circles.data.buffer, circles.data.byteOffset, Math.floor(circles.data.byteLength/4));
    for (let i=0; i+2<values.length; i+=3) {
      const [x,y,r] = [values[i],values[i+1],values[i+2]];
      if (!Number.isFinite(r) || r<6 || candidates.some(c=>Math.hypot(c.x-x,c.y-y)<Math.max(c.r,r)*0.9)) continue;
      const rgb=sampleMarker(pixels,canvas.width,canvas.height,x,y,r);
      const spread=Math.max(...rgb)-Math.min(...rgb);
      // Ignore pitch-green circles and low-contrast gray/background markings.
      if (isGreen(...rgb) || (spread<24 && rgb.every(v=>v>190))) continue;
      candidates.push({x,y,r,rgb,label:""});
      if (candidates.length>=45) break;
    }
    // Remove marker edges before line detection.
    cv.Canny(blurred, edges, 65, 155);
    for (const c of candidates) cv.circle(edges,new cv.Point(Math.round(c.x),Math.round(c.y)),Math.ceil(c.r+5),new cv.Scalar(0),-1);
    cv.HoughLinesP(edges, lines, 1, Math.PI/180, 38, 30, 8);
    const segments: Segment[]=[];
    for(let i=0;i<lines.rows;i++) {
      const ptr=lines.data32S.subarray(i*4,i*4+4);
      if(ptr.length<4)continue;
      const [x1,y1,x2,y2]=Array.from(ptr);
      const len=Math.hypot(x2-x1,y2-y1);
      if(len<33 || len>Math.max(canvas.width,canvas.height)*0.76)continue;
      if (segments.some(s=> Math.hypot(s.x1-x1,s.y1-y1)<15 && Math.hypot(s.x2-x2,s.y2-y2)<15))continue;
      segments.push({x1,y1,x2,y2});
      if(segments.length>=70)break;
    }
    return {candidates,segments};
  } finally { mats.forEach(m=>m.delete()); }
}

async function readNumbers(canvas: HTMLCanvasElement, candidates: Candidate[], onProgress?: (message: string)=>void) {
  if (!candidates.length) return;
  await loadScript("ab3-tesseract", TESSERACT_URL);
  if (!window.Tesseract) throw new Error("Tesseract did not initialize.");
  const worker = await window.Tesseract.createWorker("eng");
  try {
    for(let i=0;i<Math.min(candidates.length,30);i++) {
      const c=candidates[i];
      onProgress?.(`Reading player numbers (${i+1}/${Math.min(candidates.length,30)})...`);
      const crop=document.createElement("canvas");crop.width=120;crop.height=120;
      const ctx=crop.getContext("2d")!;
      ctx.fillStyle="#ffffff";ctx.fillRect(0,0,120,120);
      const radius=c.r*0.85;
      ctx.imageSmoothingEnabled=true;
      ctx.drawImage(canvas,c.x-radius,c.y-radius,radius*2,radius*2,0,0,120,120);
      const result=await worker.recognize(crop);
      const value=result.data.text.replace(/\D/g, "").slice(0,2);
      if(value && (result.data.confidence ?? 0)>=35)c.label=value;
    }
  } finally { await worker.terminate(); }
}

function toPoints(s: Segment, w: number, h: number) {
  return [{x:clamp(s.x1/w,0,1),y:clamp(s.y1/h,0,1)}, {x:clamp(s.x2/w,0,1),y:clamp(s.y2/h,0,1)}];
}

export async function convertScreenshot(file: File, onProgress?: (message: string)=>void): Promise<ScreenshotConversion> {
  if (!file.type.startsWith("image/"))throw new Error("Choose a PNG, JPG, or WebP image.");
  if(file.size>12*1024*1024)throw new Error("Images must be 12 MB or smaller.");
  onProgress?.("Loading image and computer vision...");
  const url=URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image=new Image();image.src=url;
    await image.decode();
  } finally { URL.revokeObjectURL(url); }
  const scale=Math.min(1,MAX_SIDE/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement("canvas");
  canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  if(!ctx)throw new Error("Canvas is unavailable in this browser.");
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const cv=await getCv();
  onProgress?.("Detecting player markers and diagram lines...");
  const found=detect(cv,canvas);
  const warnings: string[]=[];
  try { await readNumbers(canvas,found.candidates,onProgress); }
  catch(err) { warnings.push(`Numbers could not be read (${err instanceof Error?err.message:"OCR unavailable"}). Player markers remain editable.`); }

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
  return { json:{name:file.name.replace(/\.[^.]+$/,""),activityDetails:"Generated from a screenshot using browser-based OpenCV.js and Tesseract.js. Review detected shapes, labels, and movement lines before use.",numberOfPlayers:objects.length,creatorState},warnings,detected:{players:objects.length,lines:lines.length,numbered:found.candidates.filter(c=>c.label).length}};
}
