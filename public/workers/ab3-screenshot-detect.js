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
// Estimate a strong trapezoidal pitch outline from the visible grass boundaries.
// This is intentionally conservative: ordinary flat top-down diagrams must
// keep their original coordinates. The estimate cannot recover real-world depth.
function estimatePerspective(pixels,w,h) {
  const rows=[];
  for(let y=2;y<Math.round(h*.65);y+=Math.max(4,Math.round(h/35))) {
    let left=-1,right=-1;
    for(let x=0;x<w;x++) {
      const k=(y*w+x)*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2];
      if(g>r*1.18&&g>b*1.18&&g>48){if(left<0)left=x;right=x;}
    }
    if(left>=0&&right-left>w*.30)rows.push({y,left,right,width:right-left});
  }
  if(rows.length<8)return {active:false,reason:'No reliable trapezoid detected'};
  const top=rows.filter(r=>r.y<h*.10);
  const bottom=rows.filter(r=>r.y>h*.28&&r.y<h*.46);
  if(top.length<2||bottom.length<2)return {active:false,reason:'Insufficient view of converging edges'};
  const mean=(v,key)=>v.reduce((t,r)=>t+r[key],0)/v.length;
  const tw=mean(top,'width'),bw=mean(bottom,'width');
  const tl=mean(top,'left'),bl=mean(bottom,'left');
  const tr=mean(top,'right'),br=mean(bottom,'right');
  const widening=bw/Math.max(1,tw);
  // Require both sides of the pitch to converge toward the top. Crop-induced
  // asymmetry can otherwise give a false perspective classification.
  const sidesConverge=bl<tl-w*.025 && br>tr+w*.025;
  if(widening<1.13||!sidesConverge||tw>w*.94)return {active:false,reason:'Top-down or ambiguous pitch outline'};
  return {active:true,top:{y:mean(top,'y'),left:tl,right:tr},bottom:{y:mean(bottom,'y'),left:bl,right:br},widening};
}
function warpTrapezoid(pixels,w,h,estimate) {
  // Row-by-row horizontal rectification. This is a partial perspective
  // correction (not a calibrated 3D homography): vertical depth stays put.
  const targetLeft=w*.08,targetRight=w*.92,span=targetRight-targetLeft;
  const dst=new Uint8ClampedArray(pixels.length);
  for(let y=0;y<h;y++) {
    const t=Math.max(0,Math.min(1,(y-estimate.top.y)/Math.max(1,estimate.bottom.y-estimate.top.y)));
    const srcLeft=estimate.top.left+(estimate.bottom.left-estimate.top.left)*t;
    const srcRight=estimate.top.right+(estimate.bottom.right-estimate.top.right)*t;
    for(let x=0;x<w;x++) {
      const k=(y*w+x)*4;
      const sourceX=srcLeft+(x-targetLeft)*(srcRight-srcLeft)/span;
      const sx=Math.round(sourceX);
      if(sx<0||sx>=w){dst[k]=22;dst[k+1]=115;dst[k+2]=20;dst[k+3]=255;continue;}
      const z=(y*w+sx)*4;
      dst[k]=pixels[z];dst[k+1]=pixels[z+1];dst[k+2]=pixels[z+2];dst[k+3]=pixels[z+3];
    }
  }
  return dst;
}
// Dense nets and mesh contain many alternating dark/bright edges in BOTH axes;
// a field boundary or dashed arrow normally does not. Mask these regions
// before LINE detection, never before detecting player markers.
function suppressMeshTexture(pixels,w,h) {
  const tile=20, nx=Math.ceil(w/tile),ny=Math.ceil(h/tile);
  const mesh=new Uint8Array(nx*ny);
  const isDark=(x,y)=>{
    const k=(y*w+x)*4;
    const r=pixels[k],g=pixels[k+1],b=pixels[k+2];
    return Math.max(r,g,b)<122 || (r>55&&r<175&&Math.abs(r-g)<30&&Math.abs(g-b)<30);
  };
  for(let ty=0;ty<ny;ty++)for(let tx=0;tx<nx;tx++) {
    const x0=tx*tile,y0=ty*tile,x1=Math.min(w,x0+tile),y1=Math.min(h,y0+tile);
    let hchanges=0,vchanges=0;
    for(let yy=y0+2;yy<y1-1;yy+=3)
      for(let xx=x0+2;xx<x1-1;xx++)if(isDark(xx,yy)!==isDark(xx-1,yy))hchanges++;
    for(let xx=x0+2;xx<x1-1;xx+=3)
      for(let yy=y0+2;yy<y1-1;yy++)if(isDark(xx,yy)!==isDark(xx,yy-1))vchanges++;
    // Mesh has repeated horizontal AND vertical edges; single dark rectangles
    // and dashed lines usually score strongly on only one axis.
    if(hchanges>=13&&vchanges>=13)mesh[ty*nx+tx]=1;
  }
  const removed=new Uint8Array(mesh.length);
  // Include immediate mesh-adjacent tiles to erase the net's outer grid, but
  // do not expand onto unrelated rectangles further away.
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(mesh[y*nx+x])
    for(let yy=Math.max(0,y-1);yy<=Math.min(ny-1,y+1);yy++)
      for(let xx=Math.max(0,x-1);xx<=Math.min(nx-1,x+1);xx++)removed[yy*nx+xx]=1;
  const output=pixels.slice();let tiles=0;
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(removed[y*nx+x]) {
    tiles++;
    for(let yy=y*tile;yy<Math.min(h,(y+1)*tile);yy++)
      for(let xx=x*tile;xx<Math.min(w,(x+1)*tile);xx++){
        const k=(yy*w+xx)*4;
        // Grass substitute prevents the removed net from turning into a
        // bright white field line. Keep its horizontal stripe variation.
        output[k]=38;output[k+1]=132;output[k+2]=30;output[k+3]=255;
      }
  }
  return {pixels:output,tiles};
}
// Detect high-contrast gray rectangles on a white background BEFORE detecting
// individual strokes. On an all-white screenshot, the white background must
// never be mistaken for thousands of separate bright line segments.
function detectGrayRectangles(pixels,w,h,candidates) {
  let pale=0, samples=0;
  for(let y=4;y<h;y+=11)for(let x=4;x<w;x+=11){
    const k=(y*w+x)*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2];
    if(Math.min(r,g,b)>220 && Math.max(r,g,b)-Math.min(r,g,b)<24)pale++;
    samples++;
  }
  const whiteBackground=pale/Math.max(1,samples)>.48;
  if(!whiteBackground)return {shapes:[],whiteBackground:false};
  const gray=(x,y)=>{
    const k=(y*w+x)*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2];
    const high=Math.max(r,g,b),low=Math.min(r,g,b);
    if(high>220||low<48||high-low>26)return false;
    for(const c of candidates)if(Math.hypot(x-c.x,y-c.y)<c.r+3)return false;
    return true;
  };
  const horizontals=[],verticals=[];
  const minH=Math.max(42,Math.round(w*.15)),minV=Math.max(35,Math.round(h*.15));
  const scan=(axis)=>{
    const rows=axis==='h'?h:w, len=axis==='h'?w:h;
    const minLen=axis==='h'?minH:minV;
    const runs=[];
    for(let pos=2;pos<rows-2;pos+=2){
      let start=-1,last=-1,hits=0;
      function finish(){
        if(start>=0&&last-start+1>=minLen&&hits/(last-start+1)>.66)
          runs.push({pos,a:start,b:last});
      }
      for(let i=2;i<len-2;i++){
        const yes=gray(axis==='h'?i:pos,axis==='h'?pos:i);
        if(yes){if(start<0)start=i;last=i;hits++;}
        else if(start>=0){if(i-last>14){finish();start=-1;hits=0;last=-1;}}
      }
      finish();
    }
    // Merge parallel scanlines that belong to the same physical stroke.
    const groups=[];
    for(const run of runs){
      const match=groups.find(g=>Math.abs(g.pos-run.pos)<8&&
        Math.min(g.b,run.b)-Math.max(g.a,run.a)>Math.min(g.b-g.a,run.b-run.a)*.78);
      if(match){match.a=Math.min(match.a,run.a);match.b=Math.max(match.b,run.b);
        match.pos=(match.pos*match.count+run.pos)/(match.count+1);match.count++;}
      else groups.push({...run,count:1});
    }
    return groups.filter(g=>g.count>=2);
  };
  horizontals.push(...scan('h'));verticals.push(...scan('v'));
  const shapes=[],usedH=new Set(),usedV=new Set();
  const tolerance=Math.max(8,Math.round(Math.min(w,h)*.018));
  for(let i=0;i<horizontals.length;i++){
    const top=horizontals[i];if(usedH.has(i))continue;
    for(let j=0;j<horizontals.length;j++){
      const bottom=horizontals[j];
      if(bottom.pos-top.pos<minV||usedH.has(j))continue;
      if(Math.abs(top.a-bottom.a)>tolerance||Math.abs(top.b-bottom.b)>tolerance)continue;
      const leftIndex=verticals.findIndex((v,k)=>!usedV.has(k)&&Math.abs(v.pos-top.a)<tolerance&&
        Math.abs(v.a-top.pos)<tolerance&&Math.abs(v.b-bottom.pos)<tolerance);
      const rightIndex=verticals.findIndex((v,k)=>!usedV.has(k)&&k!==leftIndex&&Math.abs(v.pos-top.b)<tolerance&&
        Math.abs(v.a-top.pos)<tolerance&&Math.abs(v.b-bottom.pos)<tolerance);
      if(leftIndex<0||rightIndex<0)continue;
      usedH.add(i);usedH.add(j);usedV.add(leftIndex);usedV.add(rightIndex);
      shapes.push({x1:top.a,y1:top.pos,x2:top.b,y2:bottom.pos,tone:'dark',
        color:'#777777',width:Math.max(2,Math.min(7,Math.round((top.count+bottom.count)/2)*2)),lineStyle:'rectangle'});
      break;
    }
  }
  return {shapes,whiteBackground};
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

// Reconstruct dashed horizontal and vertical strokes by collecting separated
// dark/bright runs on the SAME scan line. This recovers intentional dashed zone
// dividers which a solid connected-component detector misses.
function dashedBoundaries(pixels,w,h,candidates,tone) {
  const dark=tone==='dark';
  const hit=(x,y)=>{
    const k=(y*w+x)*4, r=pixels[k],g=pixels[k+1],b=pixels[k+2];
    if(candidates.some(c=>Math.abs(c.x-x)<c.r+3&&Math.abs(c.y-y)<c.r+3))return false;
    if(dark)return Math.max(r,g,b)<105;
    return Math.min(r,g,b)>180&&Math.max(r,g,b)-Math.min(r,g,b)<52;
  };
  const findings=[];
  for(const axis of ['h','v']) {
    const count=axis==='h'?h:w, length=axis==='h'?w:h;
    const minLength=Math.max(65,length*.22);
    for(let pos=3;pos<count-3;pos+=3) {
      const runs=[];let start=-1;
      for(let i=2;i<length-1;i++) {
        const yes=hit(axis==='h'?i:pos,axis==='h'?pos:i);
        if(yes&&start<0)start=i;
        if(!yes&&start>=0){if(i-start>=2)runs.push([start,i-1]);start=-1;}
      }
      if(start>=0)runs.push([start,length-2]);
      let group=[];
      const add=()=>{
        if(group.length<4)return;
        const a=group[0][0], b=group[group.length-1][1], extent=b-a;
        if(extent<minLength)return;
        const occupied=group.reduce((sum,r)=>sum+r[1]-r[0]+1,0);
        const ratio=occupied/(extent+1);
        if(ratio<.22||ratio>.96)return;
        const gaps=group.slice(1).map((r,i)=>r[0]-group[i][1]-1);
        if(gaps.filter(v=>v>=2&&v<24).length<3)return;
        const widths=group.map(r=>r[1]-r[0]+1).sort((a,b)=>a-b);
        const median=widths[Math.floor(widths.length/2)];
        if(median>Math.max(28,length*.055))return;
        findings.push(axis==='h'?{x1:a,y1:pos,x2:b,y2:pos,tone,dashed:true,width:dark?4:3}:
          {x1:pos,y1:a,x2:pos,y2:b,tone,dashed:true,width:dark?4:3});
      };
      for(const run of runs){
        const gap=group.length?run[0]-group[group.length-1][1]:0;
        if(group.length&&gap>Math.max(24,length*.045)){add();group=[];}
        group.push(run);
      }
      add();
    }
  }
  const final=[];
  for(const s of findings.sort((a,b)=>Math.hypot(b.x2-b.x1,b.y2-b.y1)-Math.hypot(a.x2-a.x1,a.y2-a.y1))){
    const horizontal=s.y1===s.y2;
    if(final.some(v=>v.tone===s.tone&&(v.y1===v.y2)===horizontal &&
      Math.abs((horizontal?v.y1:s.x1)-(horizontal?s.y1:v.x1))<9 &&
      Math.min(horizontal?v.x2:v.y2,horizontal?s.x2:s.y2)-Math.max(horizontal?v.x1:v.y1,horizontal?s.x1:s.y1)>
      Math.min(Math.abs(v.x2-v.x1)+Math.abs(v.y2-v.y1),Math.abs(s.x2-s.x1)+Math.abs(s.y2-s.y1))*.65))continue;
    final.push(s);
    if(final.length>=24)break;
  }
  return final;
}

// Look for thin diagonal dark strokes on a green or pale background. Each
// diagonal is retained as a line object; short branches at its endpoints are
// evaluated as potential arrowheads. No tactical interpretation is attempted.
function diagonalStrokes(pixels,w,h,candidates,major) {
  const dark=(x,y)=>{
    x=Math.round(x);y=Math.round(y);
    if(x<2||x>=w-2||y<2||y>=h-2)return false;
    const k=(y*w+x)*4;
    if(Math.max(pixels[k],pixels[k+1],pixels[k+2])>110)return false;
    if(candidates.some(c=>Math.abs(x-c.x)<c.r+4&&Math.abs(y-c.y)<c.r+4))return false;
    // Existing thick boundaries are deliberately handled separately.
    if(major.some(v=>{
      const x1=v.x1,y1=v.y1,x2=v.x2,y2=v.y2;
      if(Math.abs(x2-x1)<4)return Math.abs(x-x1)<8&&y>=Math.min(y1,y2)-6&&y<=Math.max(y1,y2)+6;
      if(Math.abs(y2-y1)<4)return Math.abs(y-y1)<8&&x>=Math.min(x1,x2)-6&&x<=Math.max(x1,x2)+6;
      return false;
    }))return false;
    return true;
  };
  const segments=[];
  const angles=[25,35,45,55,65,115,125,135,145,155];
  for(let y=6;y<h-6;y+=5)for(let x=6;x<w-6;x+=5) {
    if(!dark(x,y))continue;
    for(const deg of angles) {
      const a=deg*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a);
      let hits=0;
      for(let k=-14;k<=14;k+=2)if(dark(x+dx*k,y+dy*k))hits++;
      if(hits<10)continue;
      let start=0,end=0;
      for(const sign of [-1,1]){
        let last=0,miss=0;
        for(let step=2;step<=Math.min(w,h)*.42;step+=2){
          let found=false;
          for(const side of [-1,0,1])if(dark(x+sign*dx*step-side*dy,y+sign*dy*step+side*dx)){found=true;break;}
          if(found){miss=0;last=step;}else if(++miss>=5)break;
        }
        if(sign===-1)start=-last;else end=last;
      }
      if(end-start<Math.max(25,Math.min(w,h)*.055))continue;
      const x1=x+dx*start,y1=y+dy*start,x2=x+dx*end,y2=y+dy*end;
      if(segments.some(s=>{
        const a=Math.hypot(s.x1-x1,s.y1-y1)+Math.hypot(s.x2-x2,s.y2-y2);
        const b=Math.hypot(s.x1-x2,s.y1-y2)+Math.hypot(s.x2-x1,s.y2-y1);
        return Math.min(a,b)<Math.max(28,(end-start)*.27);
      }))continue;
      // Ignore obviously thick strokes and long pitch markings at the borders.
      // A pair of short dark branches near one endpoint suggests an arrowhead.
      function headScore(tipX,tipY,backX,backY){
        const phi=Math.atan2(backY,backX),branch=[-0.58,0.58];let score=0;
        for(const delta of branch){
          let found=0;
          for(let d=4;d<=11;d+=2){
            const xx=tipX+Math.cos(phi+delta)*d,yy=tipY+Math.sin(phi+delta)*d;
            if(dark(xx,yy))found++;
          }
          if(found>=2)score++;
        }
        return score;
      }
      const atEnd=headScore(x2,y2,-dx,-dy),atStart=headScore(x1,y1,dx,dy);
      const arrow=Math.max(atEnd,atStart)===2&&atEnd!==atStart;
      const candidate=arrow&&atStart>atEnd?
        {x1:x2,y1:y2,x2:x1,y2:y1,tone:'dark',width:3,dashed:false,arrow:true}:
        {x1,y1,x2,y2,tone:'dark',width:3,dashed:false,arrow};
      segments.push(candidate);
      if(segments.length>=24)return segments;
      break;
    }
  }
  return segments;
}

// Combine FOUR matching dark edges into an editable AB3 rectangle, removing
// their separate fragments. Unmatched strokes stay editable as individual lines.
function groupRectangles(segments,w,h) {
  // Join short gaps in thick rectangle edges, often caused by a player or ball
  // overlapping one of the borders in the original screenshot.
  const joined=segments.map(s=>({...s}));
  for(let i=0;i<joined.length;i++) {
    const a=joined[i];
    if(a.tone!=='dark'||a.dashed||a.lineStyle)continue;
    for(let j=i+1;j<joined.length;j++) {
      const b=joined[j];
      if(b.tone!=='dark'||b.dashed||b.lineStyle)continue;
      const ah=Math.abs(a.y1-a.y2)<4,bh=Math.abs(b.y1-b.y2)<4;
      const av=Math.abs(a.x1-a.x2)<4,bv=Math.abs(b.x1-b.x2)<4;
      if(ah&&bh&&Math.abs(a.y1-b.y1)<8){
        const x1=Math.min(a.x1,a.x2),x2=Math.max(a.x1,a.x2);
        const z1=Math.min(b.x1,b.x2),z2=Math.max(b.x1,b.x2);
        if(Math.max(0,Math.max(x1,z1)-Math.min(x2,z2))<=17){
          a.x1=Math.min(x1,z1);a.x2=Math.max(x2,z2);a.y1=a.y2=(a.y1+b.y1)/2;
          joined.splice(j--,1);continue;
        }
      }
      if(av&&bv&&Math.abs(a.x1-b.x1)<8){
        const y1=Math.min(a.y1,a.y2),y2=Math.max(a.y1,a.y2);
        const z1=Math.min(b.y1,b.y2),z2=Math.max(b.y1,b.y2);
        if(Math.max(0,Math.max(y1,z1)-Math.min(y2,z2))<=17){
          a.y1=Math.min(y1,z1);a.y2=Math.max(y2,z2);a.x1=a.x2=(a.x1+b.x1)/2;
          joined.splice(j--,1);continue;
        }
      }
    }
  }
  segments=joined;
  const dark=segments.filter(s=>s.tone==='dark'&&!s.dashed);
  const horizontal=dark.filter(s=>Math.abs(s.y2-s.y1)<4&&Math.abs(s.x2-s.x1)>w*.14);
  const vertical=dark.filter(s=>Math.abs(s.x2-s.x1)<4&&Math.abs(s.y2-s.y1)>h*.09);
  const used=new Set(), shapes=[];
  const tol=Math.max(10,Math.min(w,h)*.022);
  for(const a of horizontal) {
    if(used.has(a))continue;
    const x1=Math.min(a.x1,a.x2),x2=Math.max(a.x1,a.x2),y1=(a.y1+a.y2)/2;
    for(const b of horizontal) {
      if(a===b||used.has(b))continue;
      const y2=(b.y1+b.y2)/2;
      if(y2-y1<Math.min(w,h)*.11||Math.abs(Math.min(b.x1,b.x2)-x1)>tol||Math.abs(Math.max(b.x1,b.x2)-x2)>tol)continue;
      const l=vertical.find(v=>!used.has(v)&&Math.abs((v.x1+v.x2)/2-x1)<tol&&
        Math.abs(Math.min(v.y1,v.y2)-y1)<tol&&Math.abs(Math.max(v.y1,v.y2)-y2)<tol);
      const r=vertical.find(v=>!used.has(v)&&v!==l&&Math.abs((v.x1+v.x2)/2-x2)<tol&&
        Math.abs(Math.min(v.y1,v.y2)-y1)<tol&&Math.abs(Math.max(v.y1,v.y2)-y2)<tol);
      if(!l||!r)continue;
      used.add(a);used.add(b);used.add(l);used.add(r);
      shapes.push({x1,y1,x2,y2,tone:'dark',width:Math.max(4,...[a,b,l,r].map(v=>v.width||4)),lineStyle:'rectangle',dashed:false});
      break;
    }
  }
  return [...segments.filter(s=>!used.has(s)),...shapes];
}

function fallbackDetect(pixels,w,h,precomputedCandidates) {
  if(!precomputedCandidates) {
  const n=w*h, classes=new Uint8Array(n), visited=new Uint8Array(n), queue=new Int32Array(n);
  for(let p=0;p<n;p++){ const k=p*4; classes[p]=markerClass(pixels[k],pixels[k+1],pixels[k+2]); }
  var candidates=[];
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
    if(bw<7||bh<7||bw>Math.min(w,h)*.14||bh>Math.min(w,h)*.14||aspect<.48||aspect>2.15||ratio<.28||ratio>.96)continue;
    const radius=(bw+bh)/4,cx=sumX/area,cy=sumY/area;
    // On green pitch screenshots, pure-white line junctions can resemble circles.
    // Prefer near-neutral blue-tinted white shirt markers over green-tinted paint.
    if(type===4 && sumG/area > sumB/area + 3 && sumR/area > 240)continue;
    if(candidates.some(c=>Math.hypot(c.x-cx,c.y-cy)<Math.max(c.r,radius)*.8))continue;
    candidates.push({x:cx,y:cy,r:radius,rgb:[Math.round(sumR/area),Math.round(sumG/area),Math.round(sumB/area)],label:''});
    if(candidates.length>=60)break;
  }
  } else { var candidates=precomputedCandidates; }
  const grayRectangles=detectGrayRectangles(pixels,w,h,candidates);
  const white=grayRectangles.whiteBackground?[]:fallbackLines(pixels,w,h,candidates).map(s=>({...s,tone:'light',width:3}));
  const black=darkBoundaries(pixels,w,h,candidates).map(s=>({...s,width:8}));
  const primary=[...white,...black];
  const dashed=[...dashedBoundaries(pixels,w,h,candidates,'dark'),...(grayRectangles.whiteBackground?[]:dashedBoundaries(pixels,w,h,candidates,'light'))]
    .filter(s=>!primary.some(v=>v.tone===s.tone&&Math.hypot(v.x2-v.x1,v.y2-v.y1)>.75*Math.hypot(s.x2-s.x1,s.y2-s.y1)&&
      Math.abs(v.x1-s.x1)<14&&Math.abs(v.y1-s.y1)<14));
  const diagonal=diagonalStrokes(pixels,w,h,candidates,black);
  return { candidates, segments:[...grayRectangles.shapes,...groupRectangles([...primary,...dashed,...diagonal],w,h)] };
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
    emit('detecting',35,'Detecting players, rectangles, dashed lines and diagonal strokes…');
    const sourcePixels=new Uint8ClampedArray(buffer);
    const perspective=estimatePerspective(sourcePixels,w,h);
    emit('detecting',42,perspective.active?'Perspective pitch detected; rectifying field width…':'Using original top-down image coordinates…');
    const pixels=perspective.active?warpTrapezoid(sourcePixels,w,h,perspective):sourcePixels;
    const clean=suppressMeshTexture(pixels,w,h);
    const paleRectangles=detectGrayRectangles(pixels,w,h,[]);
    emit('detecting',52,'Filtering dense net textures and reconstructing editable geometry…');
    // Player detection must see the unmasked image. Line detection receives a
    // texture-filtered copy, with the SAME coordinate system.
    const players=fallbackDetect(pixels,w,h);
    const lines=fallbackDetect(clean.pixels,w,h,players.candidates);
    // Only classify tiny markers as cones when there is a distinct larger
    // circular-marker population; uniform small-player diagrams stay players.
    const radii=players.candidates.map(c=>c.r).sort((a,b)=>a-b);
    const upper=radii[Math.floor(radii.length*.75)]||0;
    for(const c of players.candidates){
      const red=c.rgb[0]>c.rgb[1]*1.35&&c.rgb[0]>c.rgb[2]*1.25;
      c.kind=(radii.length>=7&&upper>=4.8&&c.r<upper*.76&&red)?'cone':'player';
    }
    // Closed gray contours are detected directly on the original pixels,
    // before any net-texture masking. This also prevents colored corner cones
    // from punching holes in an otherwise continuous rectangular boundary.
    const reconstructed=[...paleRectangles.shapes,...lines.segments.filter(s=>
      !paleRectangles.shapes.some(rect=>s.lineStyle==='rectangle'&&
        Math.abs(rect.x1-s.x1)<12&&Math.abs(rect.y1-s.y1)<12&&
        Math.abs(rect.x2-s.x2)<12&&Math.abs(rect.y2-s.y2)<12))];
    const result={candidates:players.candidates,segments:reconstructed,ocrPixels:perspective.active?pixels:undefined};
    emit('detecting',64,'Checking for small soccer balls…');
    result.balls=findBalls(pixels,w,h,result.candidates);
    emit('detected',76,`Found ${result.candidates.length} players, ${result.segments.length} line segments and ${result.balls.length} possible balls.`);
    self.postMessage({type:'done',result,engine:'canvas',perspectiveDetected:perspective.active,textureTilesSuppressed:clean.tiles,
      warning:[perspective.active?'Perspective pitch detected. Partial horizontal rectification was applied; depth and object sizes remain estimates. Review the editable preview.':'',clean.tiles?'Dense net-like texture was suppressed during line reconstruction. Check goal positions and missing markings.':''].filter(Boolean).join(' ')});
  }catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:String(error)});}
};
