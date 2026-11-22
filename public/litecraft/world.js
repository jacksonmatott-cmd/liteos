import {BLOCKS} from './catalog.js';
import {ensureSystems,validateSystems,DIMENSIONS} from './state.js';
export {BLOCKS} from './catalog.js';
import {MIN_Y,MAX_Y,WORLD_LIMIT,readTerrain,editTerrain,terrainSpawn,validateEdits,dimensionBounds} from './terrain.js';
export const SIZE=96,HEIGHT=48,SEA=13,VOLUME=SIZE*SIZE*HEIGHT;
export const HOTBAR=[1,2,3,4,5,6,7,8,13];
export const RECIPES=[{name:'Timber boards',cost:{5:1},id:7,count:4},{name:'Clay-colored bricks',cost:{2:3,3:1},id:8,count:4},{name:'Clear glass',cost:{4:2,12:1},id:9,count:3},{name:'Trail lantern',cost:{11:1,12:1,7:2},id:13,count:2},{name:'Stone pickaxe',cost:{3:3,7:2},tool:true},{name:'Packed slate',cost:{3:3},id:15,count:2}];
export const index=(x,y,z)=>(y*SIZE+z)*SIZE+x;
export const bounds=w=>w.version===2?{...dimensionBounds(w.dimension),limit:WORLD_LIMIT}:{min:0,max:HEIGHT,limit:SIZE};
export function get(w,x,y,z){if(w.version===2)return readTerrain(w,x,y,z);if(y<0)return 15;if(x<0||z<0||y>=HEIGHT||x>=SIZE||z>=SIZE)return 0;return w.blocks[index(x,y,z)];}
export const solid=id=>BLOCKS[id]?.solid===true;
export function hashSeed(text){let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function random(seed,x,z,y=0){let n=Math.imul(x+seed,374761393)^Math.imul(z,668265263)^Math.imul(y,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function smooth(t){return t*t*(3-2*t);}
function noise(seed,x,z,scale){x/=scale;z/=scale;const ix=Math.floor(x),iz=Math.floor(z),tx=smooth(x-ix),tz=smooth(z-iz);const a=random(seed,ix,iz),b=random(seed,ix+1,iz),c=random(seed,ix,iz+1),d=random(seed,ix+1,iz+1);return (a+(b-a)*tx)*(1-tz)+(c+(d-c)*tx)*tz;}
export function surface(w,x,z){for(let y=bounds(w).max-1;y>=bounds(w).min;y--)if(solid(get(w,x,y,z))&&get(w,x,y,z)!==6)return y;return 0;}
export function spawnPoint(w){const x=w.version===2?Math.floor(w.spawn.x):SIZE/2,z=w.version===2?Math.floor(w.spawn.z):SIZE/2;let y=w.dimension==='nether'?110:bounds(w).max-1;if(w.dimension==='nether'){while(y>bounds(w).min+1&&!(solid(get(w,x,y,z))&&!solid(get(w,x,y+1,z))&&!solid(get(w,x,y+2,z))))y--;}else while(y>bounds(w).min&&!solid(get(w,x,y,z)))y--;return {x:x+.5,y:y+2.7,z:z+.5};}
export function generate(seed='Lighthouse',mode='creative',name='My world'){
 const w={version:2,generator:2,id:crypto.randomUUID(),name:String(name).trim().slice(0,48)||'My world',seed:String(seed).slice(0,80),mode:mode==='survival'?'survival':'creative',edits:{},spawn:terrainSpawn(seed,2),inventory:Array(BLOCKS.length).fill(0),tool:false,health:10,time:.22,dimension:'overworld',realms:{},updated:Date.now()};
 w.player={...spawnPoint(w),yaw:Math.PI*.65,pitch:-.12};ensureSystems(w);if(w.mode==='survival'){w.inventory[7]=12;w.inventory[13]=3;}return w;
}
export function snapshot(w,json=false){const {version,id,name,seed,mode,inventory,tool,health,time,player,updated}=w;return {version,generator:w.generator||1,id,name,seed,mode,inventory:[...inventory],tool,health,time,player:{...player},updated,systems:Object.fromEntries(Object.entries(ensureSystems(w)).filter(([key])=>!key.startsWith('_'))),dimension:w.dimension,realms:w.realms,...(version===2?{spawn:{...w.spawn},edits:w.edits}:{blocks:json?Array.from(w.blocks):w.blocks})};}
export function generateLegacy(seed='Lighthouse',mode='creative',name='My island'){
 const key=hashSeed(seed),blocks=new Uint8Array(VOLUME),w={version:1,id:crypto.randomUUID(),name:String(name).trim().slice(0,48)||'My island',seed:String(seed).slice(0,80),mode:mode==='survival'?'survival':'creative',blocks,inventory:Array(BLOCKS.length).fill(0),tool:false,health:10,time:.22,player:null,updated:Date.now()};
 const put=(x,y,z,id)=>{if(x>=0&&z>=0&&x<SIZE&&z<SIZE&&y>=0&&y<HEIGHT)blocks[index(x,y,z)]=id;};
 for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){
  const edge=Math.min(x,z,SIZE-1-x,SIZE-1-z),h=Math.max(4,Math.min(35,Math.floor(10+noise(key,x,z,27)*14+noise(key+7,x,z,9)*5-Math.max(0,12-edge)*1.1))),sand=h<SEA+2;
  for(let y=0;y<=Math.max(h,SEA);y++){
   let id=y>h?10:y===0?15:y===h?(sand?4:h>27?14:1):y>h-4?(sand?4:2):3;
   if(id===3&&y>2&&y<h-3){const r=random(key,x,z,y);if(r<.027)id=12;else if(r<.05)id=11;else if(y>4&&noise(key+93,x+y*2,z-y,5)>.81)id=0;}
   put(x,y,z,id);
  }
 }
 for(let z=5;z<SIZE-5;z++)for(let x=5;x<SIZE-5;x++)if(random(key+11,x,z)>.989){const h=surface(w,x,z);if(get(w,x,h,z)!==1)continue;for(let y=h+1;y<h+5;y++)put(x,y,z,5);for(let dy=3;dy<=6;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(Math.abs(dx)+Math.abs(dz)<(dy===6?2:4)&&!get(w,x+dx,h+dy,z+dz))put(x+dx,h+dy,z+dz,6);}
 w.player={...spawnPoint(w),yaw:Math.PI*.65,pitch:-.12};
 for(const id of [1,2,3,4,5,6,7,8,13])w.inventory[id]=w.mode==='creative'?99:0;
 if(w.mode==='survival'){w.inventory[7]=12;w.inventory[13]=3;}return w;
}
export function setBlock(w,x,y,z,id){if(![x,y,z,id].every(Number.isInteger)||id<0||id>=BLOCKS.length)return false;let result;if(w.version===2)result=editTerrain(w,x,y,z,id);else{if(x<0||z<0||x>=SIZE||z>=SIZE||y<1||y>=HEIGHT)return false;w.blocks[index(x,y,z)]=id;result=true;}if(result&&w.systems){const nodes=w.systems.circuits[w.dimension||'overworld'],key=x+','+y+','+z;if(id>=21&&id<=27||id===35)nodes[key]=id;else delete nodes[key];}return result;}
export function raycast(w,origin,direction,reach=7){
 const p=[origin.x,origin.y,origin.z],d=[direction.x,direction.y,direction.z],c=p.map(Math.floor),step=d.map(v=>v>=0?1:-1),delta=d.map(v=>v===0?Infinity:Math.abs(1/v)),max=d.map((v,i)=>v===0?Infinity:((v>0?c[i]+1:c[i])-p[i])/v);let normal=[0,0,0],distance=0;
 for(let k=0;k<100&&distance<=reach;k++){
  const id=get(w,...c);if(id&&id!==10&&id!==20&&c[1]>=bounds(w).min)return {x:c[0],y:c[1],z:c[2],id,normal,distance};
  const axis=max[0]<=max[1]&&max[0]<=max[2]?0:max[1]<=max[2]?1:2;distance=max[axis];c[axis]+=step[axis];max[axis]+=delta[axis];normal=[0,0,0];normal[axis]=-step[axis];
 }return null;
}
export function collides(w,p){for(let y=Math.floor(p.y-1.62);y<=Math.floor(p.y+.12);y++)for(let x=Math.floor(p.x-.29);x<=Math.floor(p.x+.29);x++)for(let z=Math.floor(p.z-.29);z<=Math.floor(p.z+.29);z++)if(solid(get(w,x,y,z)))return true;return false;}
export function place(w,hit,id,player){if(!hit||!id||[10,20,34].includes(id)&&w.mode!=='creative'||w.mode==='survival'&&!w.inventory[id])return false;const [nx,ny,nz]=hit.normal,x=hit.x+nx,y=hit.y+ny,z=hit.z+nz;const previous=get(w,x,y,z);if(solid(previous)||!setBlock(w,x,y,z,id))return false;if(collides(w,player)){setBlock(w,x,y,z,previous);return false;}if(w.mode==='survival')w.inventory[id]--;return {x,y,z};}
export function mine(w,hit){if(!hit||hit.y<=bounds(w).min||!setBlock(w,hit.x,hit.y,hit.z,0))return false;w.inventory[hit.id]=Math.min(999,w.inventory[hit.id]+1);return hit;}
export function canCraft(w,r){return w.mode==='creative'||Object.entries(r.cost).every(([id,n])=>w.inventory[id]>=n);}
export function craft(w,i){const r=RECIPES[i];if(!r||!canCraft(w,r))return false;if(w.mode==='survival')for(const [id,n]of Object.entries(r.cost))w.inventory[id]-=n;if(r.tool)w.tool=true;else w.inventory[r.id]=Math.min(999,w.inventory[r.id]+r.count);return true;}
export function validateWorld(value){
 if(!value||![1,2].includes(value.version)||!['creative','survival'].includes(value.mode)||typeof value.seed!=='string'||value.seed.length>80||typeof value.name!=='string'||value.name.length>48)throw Error('This is not a supported LiteCraft world.');
 let terrain;if(value.version===1){const b=value.blocks;if(!(b instanceof Uint8Array)&&!Array.isArray(b))throw Error('World blocks are missing.');if(b.length!==VOLUME||Array.from(b).some(x=>!Number.isInteger(x)||x<0||x>=BLOCKS.length))throw Error('World blocks are damaged.');terrain={blocks:new Uint8Array(b)};}
 else{const edits=validateEdits(value.edits),spawn=value.spawn;if(!spawn||!Number.isFinite(spawn.x)||!Number.isFinite(spawn.z)||Math.abs(spawn.x)>=WORLD_LIMIT||Math.abs(spawn.z)>=WORLD_LIMIT)throw Error('World spawn is invalid.');terrain={edits,spawn:{x:spawn.x,z:spawn.z}};}
 if(!Array.isArray(value.inventory)||![16,46,BLOCKS.length].includes(value.inventory.length)||value.inventory.some(n=>!Number.isInteger(n)||n<0||n>999))throw Error('World inventory is damaged.');
 const generator=value.generator??1;if(![1,2].includes(generator))throw Error('Unsupported terrain generator.');const dimension=value.dimension??'overworld';if(!DIMENSIONS.includes(dimension)||value.version===1&&dimension!=='overworld')throw Error('World dimension is invalid.');const p=value.player,b=bounds({...value,dimension}),low=value.version===2?-b.limit+.5:.5,high=b.limit-.5;
 if(!p||!['x','y','z','yaw','pitch'].every(k=>Number.isFinite(p[k]))||p.x<low||p.x>high||p.z<low||p.z>high||p.y<b.min||p.y>b.max+20||Math.abs(p.pitch)>Math.PI/2)throw Error('World position is invalid.');
 if(!Number.isFinite(value.time)||value.time<0||value.time>1||!Number.isFinite(value.health)||value.health<0||value.health>10)throw Error('World state is invalid.');
 const realms={};for(const [key,realm]of Object.entries(value.realms||{})){if(!DIMENSIONS.includes(key)||key===dimension||!realm?.spawn||!Number.isFinite(realm.spawn.x)||!Number.isFinite(realm.spawn.z)||Math.abs(realm.spawn.x)>=WORLD_LIMIT||Math.abs(realm.spawn.z)>=WORLD_LIMIT)throw Error('World dimension data is damaged.');const range=dimensionBounds(key),p=realm.position;if(!p||!['x','y','z','yaw','pitch'].every(k=>Number.isFinite(p[k]))||Math.abs(p.x)>=WORLD_LIMIT||Math.abs(p.z)>=WORLD_LIMIT||p.y<range.min||p.y>range.max+20||Math.abs(p.pitch)>Math.PI/2)throw Error('Dimension position is damaged.');realms[key]={edits:validateEdits(realm.edits),spawn:{x:realm.spawn.x,z:realm.spawn.z},position:{x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch}};}
 const systems=validateSystems(value.systems,value.mode,BLOCKS.length);if(!value.systems&&value.tool){systems.items.stone_pickaxe=1;systems.active='stone_pickaxe';}
 return {generator,dimension,realms,systems,version:value.version,id:typeof value.id==='string'&&/^[a-f\d-]{36}$/.test(value.id)?value.id:crypto.randomUUID(),name:value.name,seed:value.seed,mode:value.mode,...terrain,inventory:Array.from({length:BLOCKS.length},(_,i)=>value.inventory[i]||0),player:{x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch},health:value.health,time:value.time,tool:value.tool===true,updated:Date.now()};
}
