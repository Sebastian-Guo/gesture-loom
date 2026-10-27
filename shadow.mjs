// Solid per-hand masks avoid dark seams where fingers and palm overlap.
const CHAINS=[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function paintHandMask(ctx,p){
 if(p.length!==21||p.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.y)))return false;
 const wrist=p[0],center={x:(p[5].x+p[9].x+p[13].x+p[17].x)/4,y:(p[5].y+p[9].y+p[13].y+p[17].y)/4};
 const length=dist(wrist,center);if(length<2)return false;
 const u={x:(center.x-wrist.x)/length,y:(center.y-wrist.y)/length},n={x:-u.y,y:u.x};
 const breadth=Math.max(length*.30,dist(p[5],p[17]));
 const radius=Math.max(2,Math.min(length*.15,breadth*.12));
 const wristWidth=Math.max(radius*1.8,breadth*.29);
 const left={x:wrist.x+n.x*wristWidth,y:wrist.y+n.y*wristWidth},right={x:wrist.x-n.x*wristWidth,y:wrist.y-n.y*wristWidth};
 // Choose wrist corners according to the projected index/pinky positions.
 const side=(p[5].x-wrist.x)*n.x+(p[5].y-wrist.y)*n.y;
 const a=side>=0?left:right,b=side>=0?right:left;
 ctx.fillStyle='#000';ctx.strokeStyle='#000';ctx.lineJoin='round';ctx.lineCap='round';
 ctx.beginPath();[a,p[1],p[2],p[5],p[9],p[13],p[17],b].forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fill();ctx.lineWidth=radius*.9;ctx.stroke();
 for(let f=0;f<5;f++){
  const ids=CHAINS[f],base=radius*(f===0?1.15:f===4?.82:1);
  for(let j=0;j<3;j++){
   const q=p[ids[j]],r=p[ids[j+1]],d=dist(q,r),nx=d?-(r.y-q.y)/d:0,ny=d?(r.x-q.x)/d:1;
   const r0=base*(1-j*.15),r1=base*(1-(j+1)*.15);
   ctx.beginPath();ctx.moveTo(q.x+nx*r0,q.y+ny*r0);ctx.lineTo(r.x+nx*r1,r.y+ny*r1);ctx.lineTo(r.x-nx*r1,r.y-ny*r1);ctx.lineTo(q.x-nx*r0,q.y-ny*r0);ctx.closePath();ctx.fill();
   for(const [v,radius] of [[q,r0],[r,r1]]){ctx.beginPath();ctx.arc(v.x,v.y,radius,0,Math.PI*2);ctx.fill();}
  }
 }
 // The fade follows the palm axis, so it rotates with the wrist.
 const g=ctx.createLinearGradient(wrist.x-u.x*length*.08,wrist.y-u.y*length*.08,wrist.x+u.x*length*.55,wrist.y+u.y*length*.55);
 g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.3,'rgba(0,0,0,.12)');g.addColorStop(1,'rgba(0,0,0,1)');
 ctx.save();ctx.globalCompositeOperation='destination-in';ctx.fillStyle=g;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();return true;
}
export function createShadowRenderer(canvas){
 const ctx=canvas.getContext('2d'),mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;const m=mask.getContext('2d');
 return hands=>{ctx.clearRect(0,0,canvas.width,canvas.height);for(const p of hands){m.clearRect(0,0,mask.width,mask.height);if(paintHandMask(m,p)){ctx.save();ctx.globalAlpha=.28;ctx.drawImage(mask,0,0);ctx.restore();}}};
}
