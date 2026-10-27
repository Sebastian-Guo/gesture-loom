// Camera pixels define the silhouette; landmarks only locate the crop and wrist.
let segmenter;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const MODEL='https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite';
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{
   const {InteractiveSegmenter,FilesetResolver}=await import('./vision_bundle.mjs');
   const files=await FilesetResolver.forVisionTasks(new URL('./',self.location.href).href);
   segmenter=await InteractiveSegmenter.createFromOptions(files,{canvas:new OffscreenCanvas(1,1),baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},outputConfidenceMasks:true,outputCategoryMask:false});
   self.postMessage({type:'ready'});
  }catch(e){self.postMessage({type:'error',message:String(e.stack||e)});}return;
 }
 if(data.type!=='frame')return;
 const started=performance.now(),outputs=[];
 try{
  for(const hand of data.hands){
   const p=hand.raw,w=data.bitmap.width,h=data.bitmap.height;
   const palm={x:(p[5].x+p[9].x+p[13].x+p[17].x)/4,y:(p[5].y+p[9].y+p[13].y+p[17].y)/4};
   const dx=(palm.x-p[0].x)*w,dy=(palm.y-p[0].y)*h,len=Math.hypot(dx,dy);
   if(len<5)continue;
   const pad=len*.30;
   const x=Math.max(0,Math.floor(Math.min(...p.map(v=>v.x*w))-pad)),y=Math.max(0,Math.floor(Math.min(...p.map(v=>v.y*h))-pad));
   const cw=Math.min(w-x,Math.ceil(Math.max(...p.map(v=>v.x*w))+pad-x)),ch=Math.min(h-y,Math.ceil(Math.max(...p.map(v=>v.y*h))+pad-y));
   if(cw<4||ch<4)continue;
   // Keep the camera's aspect ratio: letterbox each crop into a square.
   const size=384,scale=Math.min(size/cw,size/ch),ox=(size-cw*scale)/2,oy=(size-ch*scale)/2;
   const crop=new OffscreenCanvas(size,size),c=crop.getContext('2d');c.fillStyle='#808080';c.fillRect(0,0,size,size);c.drawImage(data.bitmap,x,y,cw,ch,ox,oy,cw*scale,ch*scale);
   const seed={x:(palm.x+p[0].x)*.5,y:(palm.y+p[0].y)*.5};
   const keypoint={x:clamp(((seed.x*w-x)*scale+ox)/size,.001,.999),y:clamp(((seed.y*h-y)*scale+oy)/size,.001,.999)};
   segmenter.segment(c.getImageData(0,0,size,size),{keypoint},result=>{
    const masks=result.confidenceMasks;if(!masks?.length)throw new Error('No segmentation mask returned.');
    // MagicTouch exposes background then foreground. Check the selected seed
    // to accommodate a single-channel foreground model as well.
    const sample=masks[0],mw=sample.width,mh=sample.height,si=Math.min(mw*mh-1,Math.floor(keypoint.y*mh)*mw+Math.floor(keypoint.x*mw));
    const arrays=masks.map(m=>m.getAsFloat32Array());let best=arrays[0];for(const a of arrays)if(a[si]>best[si])best=a;
    if(best[si]<.5)return;
    const rgba=new Uint8ClampedArray(mw*mh*4);
    for(let yy=0;yy<mh;yy++)for(let xx=0;xx<mw;xx++){
     const px=(xx/mw*size-ox)/scale+x,py=(yy/mh*size-oy)/scale+y;
     if(px<x||px>x+cw||py<y||py>y+ch)continue;
     const axis=((px-p[0].x*w)*dx+(py-p[0].y*h)*dy)/(len*len);
     const fade=clamp((axis+.04)/.48);const soft=fade*fade*(3-2*fade);
     const confidence=clamp((best[yy*mw+xx]-.35)/.30);
     rgba[(yy*mw+xx)*4+3]=Math.round(255*confidence*soft);
    }
    outputs.push({id:hand.id,rgba,width:mw,height:mh,x:(x-ox/scale)/w,y:(y-oy/scale)/h,w:size/scale/w,h:size/scale/h,wrist:p[0]});
   });
  }
  self.postMessage({type:'result',outputs,time:data.time,session:data.session,duration:performance.now()-started},outputs.map(o=>o.rgba.buffer));
 }catch(e){self.postMessage({type:'error',message:String(e.stack||e)});}finally{data.bitmap.close();}
};
