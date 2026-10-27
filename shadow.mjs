// Real-pixel hand cutouts. Never substitute a generated hand for a failed mask.
export function createShadowRenderer(canvas,onState){
 const ctx=canvas.getContext('2d');let worker=null,ready=false,busy=false,failed=false,epoch=0,lastSend=0,lastVideo=-1,masks=[],timer=null;
 const clear=()=>ctx.clearRect(0,0,canvas.width,canvas.height);
 const report=(text,error=false)=>onState?.(text,error);
 function reset(){epoch++;masks=[];clear();lastVideo=-1;}
 function fail(message){clearTimeout(timer);worker?.terminate();worker=null;ready=false;busy=false;failed=true;reset();report('Hand cutout unavailable. Toggle immersive mode to retry. '+message,true);}
 function init(){
  if(worker||failed)return;
  report('Loading real hand cutout model…');worker=new Worker('./pixel-shadow-worker.js?v=pixel1');
  timer=setTimeout(()=>fail('Model loading timed out.'),60000);
  worker.onerror=()=>fail('The image processor could not start.');
  worker.onmessage=({data})=>{
   if(data.type==='ready'){clearTimeout(timer);ready=true;report('Real hand cutout ready. Keep hands clear of your face.');}
   else if(data.type==='error')fail('Try a browser with WebGL2 enabled.');
   else if(data.type==='result'){
    clearTimeout(timer);busy=false;if(data.session!==epoch)return;
    masks=data.outputs.map(o=>{const c=document.createElement('canvas');c.width=o.width;c.height=o.height;c.getContext('2d').putImageData(new ImageData(o.rgba,o.width,o.height),0,0);return {...o,canvas:c,received:performance.now(),captured:data.time};});
    report(masks.length?'Camera cutout · '+Math.max(1,Math.round(1000/Math.max(100,data.duration)))+' updates/s':'Waiting for hands');
   }
  };worker.postMessage({type:'init'});
 }
 async function update(video,hands,rect,time){
  init();clear();
  const visible=hands.filter(h=>time-h.time<400);
  // Move each last camera mask with its matching wrist between model updates.
  // Discard old shapes instead of letting ghosts linger after tracking loss.
  for(const m of masks){
   const hand=visible.find(h=>h.id===m.id);if(!hand||time-m.received>850)continue;
   const dx=hand.raw[0].x-m.wrist.x,dy=hand.raw[0].y-m.wrist.y;
   if(Math.hypot(dx,dy)>.2)continue;
   ctx.save();ctx.globalAlpha=.28;ctx.translate(rect.x+rect.w,rect.y);ctx.scale(-1,1);
   ctx.drawImage(m.canvas,(m.x+dx)*rect.w,(m.y+dy)*rect.h,m.w*rect.w,m.h*rect.h);ctx.restore();
  }
  if(!visible.length){masks=[];return;}
  if(!ready||busy||video.readyState<2||time-lastSend<100||lastVideo===video.currentTime)return;
  busy=true;lastSend=time;lastVideo=video.currentTime;const sentEpoch=epoch,sentWorker=worker;
  try{
   const bitmap=await createImageBitmap(video);
   if(sentEpoch!==epoch||sentWorker!==worker){bitmap.close();busy=false;return;}
   timer=setTimeout(()=>fail('The image processor stopped responding.'),12000);
   worker.postMessage({type:'frame',bitmap,hands:visible.map(h=>({id:h.id,raw:h.raw})),time,session:sentEpoch},[bitmap]);
  }catch(e){busy=false;fail('Could not read a camera frame.');}
 }
 return {update,reset,retry(){if(failed){failed=false;reset();}},close(){clearTimeout(timer);worker?.terminate();worker=null;ready=false;busy=false;reset();}};
}
