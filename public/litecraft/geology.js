// Globally anchored ore lenses: the same vein crosses chunk boundaries without seams.
export function rockField(seed,dimension='overworld'){
 const cells=new Map(),hash=(x,y,z,salt)=>{let n=Math.imul(x+seed+salt,374761393)^Math.imul(y,668265263)^Math.imul(z,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
 return (x,y,z,base)=>{
  const cx=Math.floor(x/12),cy=Math.floor(y/12),cz=Math.floor(z/12),key=cx+','+cy+','+cz;
  let c=cells.get(key);if(!c){const r=hash(cx,cy,cz,19);let id=0;
   if(dimension==='nether'){id=r<.29?66:r<.47?65:r<.485&&cy*12+6<28?30:r<.60?77:r<.70?78:0;}
   else{id=r<.20?12:r<.37?28:r<.51&&cy*12+6>-16&&cy*12+6<100?11:r<.57&&cy*12+6<35?44:r<.65&&cy*12+6<20?43:r<.68&&cy*12+6<0?29:r<.76?73:r<.84?74:r<.92?75:76;}
   c={x:cx*12+5+hash(cx,cy,cz,31)*2,y:cy*12+5+hash(cx,cy,cz,37)*2,z:cz*12+5+hash(cx,cy,cz,43)*2,r:id>=73?5:id===30?1.25:3.8+hash(cx,cy,cz,47)*.5,id};cells.set(key,c);}
  if(!c.id||Math.hypot(x-c.x,(y-c.y)*1.15,z-c.z)>c.r)return base;
  if(dimension==='nether')return c.id;
  return y<0?({12:67,11:68,28:69,44:70,43:71,29:72}[c.id]||c.id):c.id;
 };
}
