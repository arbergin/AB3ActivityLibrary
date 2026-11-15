/* Isolated OCR worker. Parent owns a hard timeout and can terminate this worker. */
/* global importScripts, self, OffscreenCanvas, ImageData */
const send=(stage,percent,detail)=>self.postMessage({type:'progress',stage,percent,detail});
self.onmessage=async({data})=>{
  if(data?.type!=='recognize')return;
  let recognizer;
  try{
    send('ocr',80,'Downloading jersey-number recognition engine…');
    importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    if(!self.Tesseract?.createWorker)throw new Error('Tesseract library not available');
    recognizer=await self.Tesseract.createWorker('eng',1,{
      workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
      corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
      langPath:'https://tessdata.projectnaptha.com/4.0.0',
      workerBlobURL:true,
    });
    await recognizer.setParameters({tessedit_char_whitelist:'0123456789',tessedit_pageseg_mode:'10'});
    const {width,height,pixels:buffer,candidates}=data;
    const pixels=new Uint8ClampedArray(buffer),labels=[];
    const source=new OffscreenCanvas(width,height),context=source.getContext('2d');
    if(!context)throw new Error('OCR canvas unavailable');
    context.putImageData(new ImageData(pixels,width,height),0,0);
    for(let i=0;i<candidates.length;i++){
      const c=candidates[i],r=Math.max(7,Math.round(c.r*.83)),size=96;
      const crop=new OffscreenCanvas(size,size),ctx=crop.getContext('2d');
      if(!ctx)continue;
      ctx.fillStyle='white';ctx.fillRect(0,0,size,size);
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(source,c.x-r,c.y-r,r*2,r*2,0,0,size,size);
      const recognized=await recognizer.recognize(crop);
      const label=(recognized.data?.text||'').replace(/\D/g,'').slice(0,2);
      labels.push({index:i,label});
      send('ocr',80+Math.round((i+1)/candidates.length*15),`Reading player numbers ${i+1}/${candidates.length}…`);
    }
    self.postMessage({type:'done',labels});
  }catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:String(error)});}
  finally{try{await recognizer?.terminate();}catch{}}
};
