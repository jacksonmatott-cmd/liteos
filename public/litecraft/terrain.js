import {BIOMES,biomeAt,sampleLandscape} from './biomes.js';
import {rockField} from './geology.js';
import {BLOCKS} from './catalog.js';
// Procedural chunks and sparse edits. Generated blocks are never part of a save.
export const CHUNK=16,MIN_Y=-64,MAX_Y=320,WORLD_LIMIT=29999984,CHUNK_VOLUME=CHUNK*CHUNK*(MAX_Y-MIN_Y),CACHE_LIMIT=128;
export function seedHash(text){let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function random(seed,x,z,y=0){let n=Math.imul(x+seed,374761393)^Math.imul(z,668265263)^Math.imul(y,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(seed,x,z,scale){x/=scale;z/=scale;const ix=Math.floor(x),iz=Math.floor(z);let tx=x-ix,tz=z-iz;tx=tx*tx*(3-2*tx);tz=tz*tz*(3-2*tz);const a=random(seed,ix,iz),b=random(seed,ix+1,iz),c=random(seed,ix,iz+1),d=random(seed,ix+1,iz+1);return (a+(b-a)*tx)*(1-tz)+(c+(d-c)*tx)*tz;}
export function column(seed,x,z,generator=1){if(generator>=2){const land=sampleLandscape(seed,x,z);if(land.biome===8&&land.h>115)land.top=14;return land;}const h=Math.floor(43+noise(seed,x,z,190)*38+noise(seed+7,x,z,35)*16+noise(seed+9,x,z,10)*4),biome=noise(seed+71,x,z,340);return {h,top:h<66||biome<.23?4:biome>.77&&h>78?14:1};}
export const localIndex=(x,y,z)=>((y-MIN_Y)*CHUNK+z)*CHUNK+x;
export function dimensionBounds(dimension){return dimension==='nether'?{min:0,max:128}:dimension==='end'?{min:0,max:256}:{min:MIN_Y,max:MAX_Y};}
export function buildChunk(seed,cx,cz,patch={},dimension='overworld',generator=1){
 const rock=rockField(seed,dimension);
 const blocks=new Uint8Array(CHUNK_VOLUME),tops=new Uint16Array(CHUNK*CHUNK),biomes=new Uint8Array(CHUNK*CHUNK),ox=cx*CHUNK,oz=cz*CHUNK;
 const put=(x,y,z,id,onlyAir=false)=>{x-=ox;z-=oz;if(x<0||z<0||x>=CHUNK||z>=CHUNK||y<MIN_Y||y>=MAX_Y)return;const i=localIndex(x,y,z);if(onlyAir&&blocks[i])return;blocks[i]=id;if(id)tops[z*CHUNK+x]=Math.max(tops[z*CHUNK+x],y-MIN_Y+1);};
 if(dimension==='nether'){
  for(let z=0;z<CHUNK;z++)for(let x=0;x<CHUNK;x++){const wx=ox+x,wz=oz+z,h=Math.floor(23+noise(seed+141,wx,wz,26)*23);for(let y=0;y<128;y++){let id=y===0||y===127?34:y<=h||y>=116?16:y<=31?20:0;if(generator>=3&&id===16&&y>3&&y<116)id=rock(wx,y,wz,16);if(generator<3&&id===16&&y>3&&y<25&&random(seed+16,wx,wz,y)>.991)id=30;if(generator<3&&id===16&&y>15&&random(seed+17,wx,wz,y)>.98)id=44;if(y===115&&random(seed+18,wx,wz)>.9)id=13;put(wx,y,wz,id);}}
 }else if(dimension==='end'){
  for(let z=0;z<CHUNK;z++)for(let x=0;x<CHUNK;x++){const wx=ox+x,wz=oz+z,d=Math.hypot(wx,wz),island=d<170||d>650&&noise(seed+151,wx,wz,90)>.46;if(!island)continue;const h=Math.floor(58+noise(seed+152,wx,wz,35)*15);for(let y=Math.max(15,h-22);y<=h;y++)put(wx,y,wz,17);if(d<170&&Math.abs(wx)%37===0&&Math.abs(wz)%41===0)for(let y=h+1;y<h+16;y++)put(wx,y,wz,18);}
 }else{
 for(let z=0;z<CHUNK;z++)for(let x=0;x<CHUNK;x++){
  const wx=ox+x,wz=oz+z,land=column(seed,wx,wz,generator),{h}=land,top=generator>=2&&land.biome===8&&h>115?14:land.top;biomes[z*CHUNK+x]=land.biome||0;tops[z*CHUNK+x]=Math.max(h,64)-MIN_Y+1;
  for(let y=MIN_Y;y<=Math.max(h,64);y++){
   let id=y>h?10:y===MIN_Y?15:y===h?top:y>h-(land.biome===9?10:4)?(land.sub??(top===4?4:2)):y<0?15:3;
   if((id===3||id===15)&&y>MIN_Y+3&&y<h-4){const r=random(seed,wx,wz,y);if(generator<2){if(r<.027)id=12;else if(r<.049)id=11;else if(noise(seed+93,wx+y*2,wz-y,8)>.84)id=0;}else if(generator>=3){if(noise(seed+93,wx+y*2,wz-y,8)>.84)id=0;else id=rock(wx,y,wz,id);}else if(r<.006&&y<0)id=29;else if(r<.014&&y<20)id=43;else if(r<.021&&y<35)id=44;else if(r<.037)id=12;else if(r<.057)id=28;else if(r<.078)id=11;else if(noise(seed+93,wx+y*2,wz-y,8)>.84)id=0;}
   if(generator>=2&&y===64&&id===10&&[3,5].includes(land.biome))id=53;blocks[localIndex(x,y,z)]=id;
  }
 }
 // Anchor sampling includes canopy reach on both sides of every chunk edge.
 const reach=generator>=2?3:2;
 for(let z=oz-reach;z<oz+CHUNK+reach;z++)for(let x=ox-reach;x<ox+CHUNK+reach;x++){
  const r=random(seed+11,x,z);if(r<(generator>=2?.972:.989))continue;const land=column(seed,x,z,generator),{h,top}=land;
  if(generator<2){if(top!==1||h<66)continue;const tall=4+Math.floor(random(seed+12,x,z)*3);for(let y=1;y<=tall;y++)put(x,h+y,z,5);for(let dy=tall-1;dy<=tall+2;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(Math.abs(dx)+Math.abs(dz)<(dy===tall+2?2:4))put(x+dx,h+dy,z+dz,6,true);continue;}
  const biome=BIOMES[land.biome];if(biome.key==='desert'&&r>.995&&h>=65){for(let y=1;y<=2+Math.floor(random(seed+25,x,z)*3);y++)put(x,h+y,z,50);continue;}
  const tree=biome.tree;if(!tree.chance||r<1-tree.chance||h<63||h>150)continue;const tall=(tree.style==='spruce'?7:tree.style==='poplar'?8:4)+Math.floor(random(seed+12,x,z)*4),leaf=tree.style==='poplar'?62+Math.floor(random(seed+14,x,z)*3):tree.leaves;
  for(let y=1;y<=tall;y++)put(x,h+y,z,tree.log);
  if(tree.style==='spruce'){for(let y=2;y<=tall+1;y++){const radius=Math.min(3,Math.floor((tall+2-y)/2));for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)if(Math.abs(dx)+Math.abs(dz)<=radius+1)put(x+dx,h+y,z+dz,leaf,true);}}
  else if(tree.style==='poplar'){for(let y=3;y<=tall+2;y++){const radius=y>tall?1:2;for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)if(Math.abs(dx)+Math.abs(dz)<=radius)put(x+dx,h+y,z+dz,leaf,true);}}
  else{const radius=tree.style==='flat'?3:2;for(let y=tall-1;y<=tall+1;y++)for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)if(Math.abs(dx)+Math.abs(dz)<radius*2)put(x+dx,h+y,z+dz,leaf,true);}
 }
 }
 const touched=new Set();for(const [key,id]of Object.entries(patch)){const i=Number(key);blocks[i]=id;touched.add(i%(CHUNK*CHUNK));}
 for(const col of touched){let y=MAX_Y-1;while(y>MIN_Y&&!blocks[(y-MIN_Y)*CHUNK*CHUNK+col])y--;tops[col]=y-MIN_Y+1;}
 return {cx,cz,blocks,tops,biomes};
}
export function chunkAt(w,cx,cz){
 w._chunks??=new Map();w._seed??=seedHash(w.seed);const key=cx+','+cz;let chunk=w._chunks.get(key);if(chunk)return chunk;
 chunk=buildChunk(w._seed,cx,cz,w.edits[key],w.dimension||'overworld',w.generator||1);w._chunks.set(key,chunk);
 if(w._chunks.size>CACHE_LIMIT){const center=w._center||[cx,cz];let farKey=null,far=-1;for(const [k,c]of w._chunks){const distance=Math.max(Math.abs(c.cx-center[0]),Math.abs(c.cz-center[1]));if(k!==key&&distance>far){far=distance;farKey=k;}}if(farKey)w._chunks.delete(farKey);}
 return chunk;
}
export function readTerrain(w,x,y,z){const range=dimensionBounds(w.dimension);if(y<range.min)return 15;if(y>=range.max||Math.abs(x)>=WORLD_LIMIT||Math.abs(z)>=WORLD_LIMIT)return 0;const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK),c=chunkAt(w,cx,cz);return c.blocks[localIndex(x-cx*CHUNK,y,z-cz*CHUNK)];}
export function editTerrain(w,x,y,z,id){const range=dimensionBounds(w.dimension);if(y<=range.min||y>=range.max||Math.abs(x)>=WORLD_LIMIT||Math.abs(z)>=WORLD_LIMIT)return false;const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK),i=localIndex(x-cx*CHUNK,y,z-cz*CHUNK),c=chunkAt(w,cx,cz),key=cx+','+cz;c.blocks[i]=id;(w.edits[key]??={})[i]=id;const col=i%(CHUNK*CHUNK);if(id)c.tops[col]=Math.max(c.tops[col],y-MIN_Y+1);else if(c.tops[col]===y-MIN_Y+1){let top=y-1;while(top>MIN_Y&&!c.blocks[(top-MIN_Y)*CHUNK*CHUNK+col])top--;c.tops[col]=top-MIN_Y+1;}return true;}
export function terrainSpawn(seed,generator=1){const key=seedHash(seed);for(let radius=0;radius<=(generator>=2?64:16);radius++)for(let z=-radius;z<=radius;z++)for(let x=-radius;x<=radius;x++){if(radius&&Math.abs(x)!==radius&&Math.abs(z)!==radius)continue;const wx=x*16,wz=z*16;if(column(key,wx,wz,generator).h>=67)return {x:wx+.5,z:wz+.5};}return {x:.5,z:.5};}
export function validateEdits(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('World edits are damaged.');const result={};let count=0;for(const [key,patch]of Object.entries(value)){if(!/^-?\d+,-?\d+$/.test(key)||!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('World chunk edits are damaged.');const [cx,cz]=key.split(',').map(Number);if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||Math.abs(cx)>Math.ceil(WORLD_LIMIT/CHUNK)||Math.abs(cz)>Math.ceil(WORLD_LIMIT/CHUNK)||key!==cx+','+cz)throw Error('World chunk position is invalid.');const clean={};for(const [at,id]of Object.entries(patch)){const i=Number(at);if(!Number.isInteger(i)||String(i)!==at||i<CHUNK*CHUNK||i>=CHUNK_VOLUME||!Number.isInteger(id)||id<0||id>=BLOCKS.length||++count>2000000)throw Error('World block edits are damaged or too large.');clean[i]=id;}result[key]=clean;}return result;}

export function worldBiome(w,x=w.player.x,z=w.player.z){if(w.dimension==='nether')return {name:'Nether Wastes',key:'nether_wastes',grass:[145,189,89]};if(w.dimension==='end')return {name:Math.hypot(x,z)<300?'The End':'End Islands',key:'end',grass:[145,189,89]};if(w.generator>=2)return biomeAt(w._seed??seedHash(w.seed),x,z);return {name:'Classic landscape',key:'classic',grass:[145,189,89]};}
