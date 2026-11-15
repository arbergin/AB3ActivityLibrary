/* AB3 screenshot detector — runs entirely off the UI thread. No dependencies for fallback. */
/* global importScripts, OffscreenCanvas, ImageData, self */
const OPENCV_URL = 'https://docs.opencv.org/4.x/opencv.js';
function emit(stage, percent, detail) { self.postMessage({ type: 'progress', stage, percent, detail }); }
function markerClass(r,g,b) {
  if (g > r * 1.16 && g > b * 1.10 && g > 65) return 0;
  if (b > r * 1.24 && b > g * 1.07 && b > 80) return 1;
  if (r > g * 1.4 && r > b * 1.3 && r > 95) return 2;
  if (r > 150 && g > 80 && g < r * .94 && b < g * .84) return 3;
  if (r > 175 && g > 175 && b > 175 && Math.max(r,g,b)-Math.min(r,g,b) < 48) return 4;
  if (r > 55 && r < 185 && Math.abs(r-g)<21 && Math.abs(g-b)<21) return 5;
  return 0;
}
function fallbackDetect(pixels,w,h) {
  const n=w*h, classes=new Uint8Array(n), visited=new Uint8Array(n), queue=new Int32Array(n);
  for(let p=0;p<n;p++){ const k=p*4; classes[p]=markerClass(pixels[k],pixels[k+1],pixels[k+2]); }
  const candidates=[];
  const minArea=Math.max(17,Math.floor(n/30000));
  for(let i=0;i<n;i++) {
    const type=classes[i]; if (!type||visited[i]) continue;
    let head=0,tail=1,area=0,minX=w,minY=h,maxX=0,maxY=0,sumX=0,sumY=0,sumR=0,sumG=0,sumB=0;
    queue[0]=i;visited[i]=1;
    while(head<tail){
      const p=queue[head++],x=p%w,y=(p/w)|0,k=p*4;
      area++;sumX+=x;sumY+=y;sumR+=pixels[k];sumG+=pixels[k+1];sumB+=pixels[k+2];
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
      const up=p-w,down=p+w,left=p-1,right=p+1;
      if(y>0&&!visited[up]&&classes[up]===type){visited[up]=1;queue[tail++]=up;}
      if(y<h-1&&!visited[down]&&classes[down]===type){visited[down]=1;queue[tail++]=down;}
      if(x>0&&!visited[left]&&classes[left]===type){visited[left]=1;queue[tail++]=left;}
      if(x<w-1&&!visited[right]&&classes[right]===type){visited[right]=1;queue[tail++]=right;}
    }
    if(area<minArea)continue;
    const bw=maxX-minX+1,bh=maxY-minY+1,aspect=bw/bh,ratio=area/(bw*bh);
    if(bw<7||bh<7||bw>Math.min(w,h)*.14||bh>Math.min(w,h)*.14||aspect<.66||aspect>1.48||ratio<.34||ratio>.96)continue;
    const radius=(bw+bh)/4,cx=sumX/area,cy=sumY/area;
    // On green pitch screenshots, pure-white line junctions can resemble circles.
    // Prefer near-neutral blue-tinted white shirt markers over green-tinted paint.
    if(type===4 && sumG/area > sumB/area + 3 && sumR/area > 240)continue;
    if(candidates.some(c=>Math.hypot(c.x-cx,c.y-cy)<Math.max(c.r,radius)*.8))continue;
    candidates.push({x:cx,y:cy,r:radius,rgb:[Math.round(sumR/area),Math.round(sumG/area),Math.round(sumB/area)],label:''});
    if(candidates.length>=60)break;
  }
  return { candidates, segments:[] };
}
function cvReady(cv){return cv && typeof cv.imread==='function' && typeof cv.Mat==='function';}
async function getCv() {
  // Loading and Wasm compilation happen in this worker, never on the page thread.
  importScripts(OPENCV_URL);
  let api=self.cv;
  if(api && typeof api.then==='function')api=await api;
  if(cvReady(api))return api;
  return await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('OpenCV initialization timed out')),8500);
    if(!api){clearTimeout(timeout);reject(new Error('OpenCV was not loaded'));return;}
    const previous=api.onRuntimeInitialized;
    api.onRuntimeInitialized=()=>{if(typeof previous==='function')previous();clearTimeout(timeout);resolve(api);};
  });
}
function cvDetect(cv,pixels,w,h) {
  const canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d');
  ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels),w,h),0,0);
  const mats=[],mat=()=>{const m=new cv.Mat();mats.push(m);return m;};
  const src=cv.imread(canvas);mats.push(src);
  const gray=mat(),blurred=mat(),circles=mat(),edges=mat(),lines=mat();
  try{
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray,blurred,new cv.Size(5,5),1.5);
    cv.HoughCircles(blurred,circles,cv.HOUGH_GRADIENT,1.2,14,110,22,5,Math.min(50,Math.floor(Math.min(w,h)/9)));
    const values=new Float32Array(circles.data.buffer,circles.data.byteOffset,Math.floor(circles.data.byteLength/4));
    const candidates=[];
    for(let i=0;i+2<values.length;i+=3){
      const [x,y,r]=[values[i],values[i+1],values[i+2]];
      if(!Number.isFinite(r)||r<5||candidates.some(c=>Math.hypot(c.x-x,c.y-y)<Math.max(c.r,r)*.9))continue;
      const center=(Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x))))*4;
      const rgb=[pixels[center],pixels[center+1],pixels[center+2]];
      if(markerClass(...rgb)===0)continue;
      candidates.push({x,y,r,rgb,label:''});if(candidates.length>=60)break;
    }
    cv.Canny(blurred,edges,65,155);
    for(const c of candidates)cv.circle(edges,new cv.Point(Math.round(c.x),Math.round(c.y)),Math.ceil(c.r+5),new cv.Scalar(0),-1);
    cv.HoughLinesP(edges,lines,1,Math.PI/180,38,30,8);
    const segments=[];
    for(let i=0;i<lines.rows;i++){
      const p=lines.data32S.subarray(i*4,i*4+4),[x1,y1,x2,y2]=Array.from(p),len=Math.hypot(x2-x1,y2-y1);
      if(len<33||len>Math.max(w,h)*.76)continue;
      if(segments.some(s=>Math.hypot(s.x1-x1,s.y1-y1)<15&&Math.hypot(s.x2-x2,s.y2-y2)<15))continue;
      segments.push({x1,y1,x2,y2});if(segments.length>=70)break;
    }
    return { candidates, segments };
  } finally {for(const mat of mats)mat.delete();}
}
self.onmessage=async({data})=>{
  if(data?.type!=='analyze')return;
  const {width:w,height:h,pixels:buffer,fallbackOnly}=data;
  try{
    const pixels=new Uint8ClampedArray(buffer);
    let result=null,engine='canvas',warning='';
    if(!fallbackOnly){
      emit('opencv',20,'Loading OpenCV in an isolated worker…');
      try{
        const cv=await getCv();
        emit('detecting',48,'Detecting shapes with OpenCV…');
        result=cvDetect(cv,pixels,w,h); engine='opencv';
        if(!result.candidates.length){warning='OpenCV found no player markers. Canvas fallback used.';result=null;engine='canvas';}
      }catch(error){warning=`OpenCV unavailable (${error instanceof Error?error.message:'initialization failed'}). Using browser Canvas detection.`;}
    }
    if(!result){emit('detecting',55,'Detecting player circles using browser pixels…');result=fallbackDetect(pixels,w,h);}
    emit('detected',76,`Detected ${result.candidates.length} possible player markers.`);
    self.postMessage({type:'done',result,engine,warning});
  }catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:String(error)});}
};
