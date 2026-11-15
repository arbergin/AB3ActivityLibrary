/* AB3 screenshot detector — runs entirely off the UI thread. No dependencies for fallback. */
/* global importScripts, OffscreenCanvas, ImageData, self */
// Dependency-free Canvas pixel analysis. OpenCV removed to avoid Wasm startup stalls.
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
// Scan bright, low-chroma lines in horizontal/vertical directions. This is
// deliberately conservative: it recovers field and zone boundaries, not tactical intent.
function fallbackLines(pixels,w,h,candidates) {
  const isLine=(x,y)=>{
    const i=(y*w+x)*4, r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    if(r<175||g<175||b<175||Math.max(r,g,b)-Math.min(r,g,b)>48)return false;
    for(const c of candidates)if(Math.hypot(x-c.x,y-c.y)<c.r+4)return false;
    return true;
  };
  const segments=[], horizontal=[], vertical=[];
  // Long white line fragments, tolerating dashed boundaries and tiny antialiasing gaps.
  function runs(axis,pos){
    const length=axis==='h'?w:h, hits=[];
    for(let i=0;i<length;i++)if(isLine(axis==='h'?i:pos,axis==='h'?pos:i))hits.push(i);
    if(hits.length<12)return [];
    const out=[];let start=hits[0],end=start,solid=1;
    for(let j=1;j<hits.length;j++){
      const v=hits[j];
      if(v-end<=Math.max(11,Math.floor(length*.022))){solid++;end=v;}
      else {if(end-start>=Math.max(26,length*.065)&&solid/(end-start+1)>.26)out.push({a:start,b:end});start=end=v;solid=1;}
    }
    if(end-start>=Math.max(26,length*.065)&&solid/(end-start+1)>.26)out.push({a:start,b:end});
    return out;
  }
  // Scan spaced rows/columns and aggregate identical neighboring detections.
  for(let y=3;y<h-3;y+=3)for(const run of runs('h',y))horizontal.push({x1:run.a,y1:y,x2:run.b,y2:y});
  for(let x=3;x<w-3;x+=3)for(const run of runs('v',x))vertical.push({x1:x,y1:run.a,x2:x,y2:run.b});
  for(const dir of [horizontal,vertical]){
    dir.sort((a,b)=>Math.hypot(b.x2-b.x1,b.y2-b.y1)-Math.hypot(a.x2-a.x1,a.y2-a.y1));
    for(const v of dir){
      const exists=segments.some(s=>Math.abs(s.x1-v.x1)<8&&Math.abs(s.y1-v.y1)<8&&Math.abs(s.x2-v.x2)<8&&Math.abs(s.y2-v.y2)<8);
      if(!exists){segments.push(v);if(segments.length>=45)return segments;}
    }
  }
  return segments;
}
// Detect prominent black horizontal and vertical training-area boundaries.
// These are separate from the bright pitch-line pass. Adjacent scan rows/columns
// are consolidated so a thick 7px border becomes ONE editable AB3 line.
function darkBoundaries(pixels, w, h, candidates) {
  const dark = (x, y) => {
    const i = (y * w + x) * 4;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (Math.max(r, g, b) > 90) return false;
    // Don't treat the thin black ring surrounding a player as a boundary.
    for (const c of candidates) if (Math.hypot(x-c.x,y-c.y) < c.r+3) return false;
    return true;
  };
  const threshold = Math.max(35, Math.round(Math.min(w,h) * 0.075));
  const horizontal = [], vertical = [];
  function scan(axis, pos) {
    const length = axis === 'h' ? w : h;
    let start = -1, hits = 0, last = -1;
    const out = [];
    function finish() {
      if (start < 0) return;
      if (last-start+1 >= threshold && hits/(last-start+1) >= .8)
        out.push({start,end:last,pos});
    }
    for (let j=0;j<length;j++) {
      const x = axis==='h'?j:pos, y = axis==='h'?pos:j;
      if (dark(x,y)) {
        if (start<0) start=j;
        else if (last>=0 && j-last>3) {finish(); start=j; hits=0;}
        hits++; last=j;
      } else if (start>=0 && j-last>2) { finish(); start=-1; hits=0; last=-1; }
    }
    finish();
    return out;
  }
  for (let y=2;y<h-2;y+=2) horizontal.push(...scan('h',y));
  for (let x=2;x<w-2;x+=2) vertical.push(...scan('v',x));
  function consolidate(runs, axis) {
    const groups=[];
    for(const run of runs){
      const group=groups.find(g=>Math.abs(g.pos-run.pos)<=9 &&
        Math.min(g.end,run.end)-Math.max(g.start,run.start) >= Math.min(g.end-g.start,run.end-run.start)*.67);
      if(group){
        group.start=Math.min(group.start,run.start);
        group.end=Math.max(group.end,run.end);
        group.totalPos+=run.pos;
        group.count++;
        group.pos=group.totalPos/group.count;
      } else groups.push({...run,totalPos:run.pos,count:1});
    }
    return groups.filter(g=>g.count>=2 && g.end-g.start>=threshold).map(g=>{
      const pos=Math.round(g.pos);
      return axis==='h' ? {x1:g.start,y1:pos,x2:g.end,y2:pos,tone:'dark'}:
        {x1:pos,y1:g.start,x2:pos,y2:g.end,tone:'dark'};
    });
  }
  return [...consolidate(horizontal,'h'),...consolidate(vertical,'v')].slice(0,24);
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
  return { candidates, segments:[...fallbackLines(pixels,w,h,candidates), ...darkBoundaries(pixels,w,h,candidates)] };
}
// Small, approximately circular bright objects with dark patches, close to a
// player, are soccer-ball candidates. Conservative to avoid field-line noise.
function findBalls(pixels,w,h,candidates) {
  const balls=[]; const mask=new Uint8Array(w*h), seen=new Uint8Array(w*h);
  for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
    const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    if(r>167&&g>167&&b>167&&Math.max(r,g,b)-Math.min(r,g,b)<48)mask[y*w+x]=1;
  }
  for(let y=3;y<h-3;y++)for(let x=3;x<w-3;x++){
    const root=y*w+x;if(!mask[root]||seen[root])continue;
    const queue=[root];seen[root]=1;let head=0,minX=x,maxX=x,minY=y,maxY=y,sumX=0,sumY=0;
    while(head<queue.length&&queue.length<220){
      const v=queue[head++],cx=v%w,cy=(v/w)|0;sumX+=cx;sumY+=cy;
      minX=Math.min(minX,cx);maxX=Math.max(maxX,cx);minY=Math.min(minY,cy);maxY=Math.max(maxY,cy);
      for(const n of [v-1,v+1,v-w,v+w]){
        if(n>=0&&n<w*h&&Math.abs(n%w-cx)+Math.abs((n/w|0)-cy)===1&&mask[n]&&!seen[n]){seen[n]=1;queue.push(n);}
      }
    }
    const bw=maxX-minX+1,bh=maxY-minY+1,area=queue.length;
    if(area<5||area>120||bw<2||bh<2||bw>16||bh>16||bw/bh<.6||bw/bh>1.55)continue;
    const cx=sumX/area,cy=sumY/area,r=Math.max(bw,bh)/2;
    if(candidates.some(c=>Math.hypot(cx-c.x,cy-c.y)<c.r+r+1))continue;
    const nearest=Math.min(...candidates.map(c=>Math.hypot(cx-c.x,cy-c.y)/(c.r||1)),Infinity);
    if(nearest<1.6||nearest>6)continue;
    // Require multiple dark non-green pixels in a narrow ring around the white center.
    let dark=0;
    for(let yy=Math.max(0,Math.floor(cy-r-2));yy<Math.min(h,Math.ceil(cy+r+3));yy++)
      for(let xx=Math.max(0,Math.floor(cx-r-2));xx<Math.min(w,Math.ceil(cx+r+3));xx++){
        if(Math.hypot(xx-cx,yy-cy)>r+2)continue;
        const k=(yy*w+xx)*4,rr=pixels[k],gg=pixels[k+1],bb=pixels[k+2];
        if(rr<120&&gg<120&&bb<120)dark++;
      }
    if(dark>=2&&!balls.some(b=>Math.hypot(b.x-cx,b.y-cy)<12))balls.push({x:cx,y:cy,r});
  }
  return balls.slice(0,8);
}
self.onmessage=({data})=>{
  if(data?.type!=='analyze')return;
  const {width:w,height:h,pixels:buffer}=data;
  try{
    emit('detecting',35,'Scanning player circles and field markings…');
    const pixels=new Uint8ClampedArray(buffer);
    const result=fallbackDetect(pixels,w,h);
    emit('detecting',58,'Checking for small soccer balls…');
    result.balls=findBalls(pixels,w,h,result.candidates);
    emit('detected',76,`Found ${result.candidates.length} players, ${result.segments.length} line segments and ${result.balls.length} possible balls.`);
    self.postMessage({type:'done',result,engine:'canvas',warning:''});
  }catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:String(error)});}
};
