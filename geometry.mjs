export const CHAINS=[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:(a.z||0)-(b.z||0)});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export function angle(a,b,c){const u=sub(a,b),v=sub(c,b);return Math.acos(clamp(dot(u,v)/(Math.hypot(u.x,u.y,u.z)*Math.hypot(v.x,v.y,v.z)||1),-1,1));}
export function openness(p,chain){const [a,b,c,d]=chain;return clamp(((angle(p[a],p[b],p[c])+angle(p[b],p[c],p[d]))/2-0.75)/(Math.PI-0.75));}
export function orientation(p){const u=sub(p[5],p[0]),v=sub(p[17],p[0]);const n={x:u.y*v.z-u.z*v.y,y:u.z*v.x-u.x*v.z,z:u.x*v.y-u.y*v.x};return {face:Math.abs(n.z)/(Math.hypot(n.x,n.y,n.z)||1),angle:Math.atan2(p[17].y-p[5].y,-(p[17].x-p[5].x))};}
export function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
export function mapPoint(p,rect){return {x:rect.x+(1-p.x)*rect.w,y:rect.y+p.y*rect.h};}
export function contain(w,h,W=1200,H=900){const s=Math.min(W/w,H/h);return {x:(W-w*s)/2,y:(H-h*s)/2,w:w*s,h:h*s};}
// Two persistent tracks: prefer nearest wrist over array order; reject large jumps.
export function assignHands(hands,previous,now){let best=[],score=-Infinity;function visit(i,used,list,total){if(i===hands.length){if(total>score){score=total;best=list.slice();}return;}for(let id=0;id<2;id++){if(used.has(id))continue;const old=previous.get(id),fresh=old&&now-old.time<240;const d=fresh?distance(hands[i].landmarks[0],old.raw[0]):0.2;const match=fresh&&old.label===hands[i].label?.08:0;used.add(id);list.push({...hands[i],id,continuous:!!fresh&&d<.2});visit(i+1,used,list,total-d+match);list.pop();used.delete(id);}}visit(0,new Set(),[],0);return best;}
