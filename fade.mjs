export const HOLD_MS=3000;
export const FADE_MS=2000;
export function visibility(age){return age<=HOLD_MS?1:Math.max(0,1-(age-HOLD_MS)/FADE_MS);}
// Retain only the last five seconds of paint; every mark has its own clock.
export class FadeHistory {
 constructor(){this.items=[];}
 add(draw,time){this.items.push({draw,time});}
 clear(){this.items=[];}
 render(now){this.items=this.items.filter(item=>visibility(now-item.time)>0);for(const item of this.items)item.draw(visibility(now-item.time));return this.items.length;}
}
