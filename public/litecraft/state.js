import {ALL_ITEMS,TOOLS,ARMOR} from './catalog.js';
export const DIMENSIONS=['overworld','nether','end'];
export const MOB_TYPES=['pig','cow','zombie','skeleton','creeper','enderman','blaze','dragon','duelist','spider'];
export function freshSystems(mode='creative'){return {version:1,items:{},durability:{},active:'hand',armor:{head:null,chest:null,legs:null,feet:null},shield:false,hunger:20,saturation:5,air:10,xp:0,difficulty:'normal',cheats:mode==='creative',rules:{keepInventory:false,mobGriefing:true,doMobSpawning:true},mobs:{overworld:[],nether:[],end:[]},circuits:{overworld:{},nether:{},end:{}},graves:[],smelting:[],fuses:[],clock:0,attackTime:2,hurtTime:0,shieldTime:0,fire:0,exhaustion:0,regenTime:0,spawnTime:0,deaths:0,kills:0,weather:'clear',dragonDefeated:false,chests:{overworld:{},nether:{},end:{}}};}
export function ensureSystems(w){if(!w.systems){w.systems=freshSystems(w.mode);if(w.tool){w.systems.items.stone_pickaxe=1;w.systems.active='stone_pickaxe';}}w.dimension??='overworld';w.realms??={};return w.systems;}
const bad=()=>{throw Error('World mechanics data is damaged.');};
function num(value,min=0,max=1e9){if(!Number.isFinite(value)||value<min||value>max)bad();return value;}
function counts(value){if(!value||typeof value!=='object'||Array.isArray(value))bad();const out={};for(const [key,n]of Object.entries(value)){if(!Object.hasOwn(ALL_ITEMS,key)||!Number.isInteger(n))bad();out[key]=num(n,0,999);}return out;}
function position(p){if(!p||typeof p!=='object')bad();return {x:num(p.x,-29999984,29999984),y:num(p.y,-64,340),z:num(p.z,-29999984,29999984)};}
export function validateSystems(value,mode,blockCount){
 if(value===undefined)return freshSystems(mode);if(!value||value.version!==1)bad();const s=freshSystems(mode);s.items=counts(value.items);s.durability={};
 for(const [key,n]of Object.entries(value.durability||{})){const item=ALL_ITEMS[key];if(!item?.durability)bad();s.durability[key]=num(n,0,item.durability);}
 if(value.active!=='hand'&&!Object.hasOwn(ALL_ITEMS,value.active))bad();s.active=value.active;
 for(const slot of ['head','chest','legs','feet']){const key=value.armor?.[slot];if(key!==null&&ARMOR[key]?.slot!==slot)bad();s.armor[slot]=key;}
 for(const key of ['shield','cheats']){if(typeof value[key]!=='boolean')bad();s[key]=value[key];}
 for(const key of ['keepInventory','mobGriefing','doMobSpawning']){if(typeof value.rules?.[key]!=='boolean')bad();s.rules[key]=value.rules[key];}
 if(!['peaceful','easy','normal','hard'].includes(value.difficulty)||!['clear','rain','thunder'].includes(value.weather))bad();s.difficulty=value.difficulty;s.weather=value.weather;
 for(const [key,max]of Object.entries({hunger:20,saturation:20,air:10,xp:1e8,clock:1e9,attackTime:60,hurtTime:10,shieldTime:10,fire:20,exhaustion:10,regenTime:20,spawnTime:1e9,deaths:1e6,kills:1e6}))s[key]=num(value[key]??s[key],0,max);
 s.dragonDefeated=value.dragonDefeated===true;for(const dim of DIMENSIONS){const chests=value.chests?.[dim]||{};if(typeof chests!=='object'||Object.keys(chests).length>64)bad();for(const [key,c]of Object.entries(chests)){if(!/^-?\d+,-?\d+,-?\d+$/.test(key)||!c||!Array.isArray(c.blocks)||c.blocks.length>blockCount||c.blocks.some(n=>!Number.isInteger(n)||n<0||n>999))bad();s.chests[dim][key]={blocks:Array.from({length:blockCount},(_,i)=>c.blocks[i]||0),items:counts(c.items)};}const mobs=value.mobs?.[dim],circuits=value.circuits?.[dim];if(!Array.isArray(mobs)||mobs.length>32||!circuits||typeof circuits!=='object'||Object.keys(circuits).length>4096)bad();
  s.spawnTime=Math.min(60,s.spawnTime);s.mobs[dim]=mobs.map(m=>{if(!MOB_TYPES.includes(m.kind)||typeof m.id!=='string'||m.id.length>64)bad();return {...position(m),id:m.id,kind:m.kind,hp:num(m.hp,0,200),yaw:num(m.yaw,-1e9,1e9),cooldown:num(m.cooldown,0,60),aggro:!!m.aggro,fuse:num(m.fuse,0,10),vy:num(m.vy??0,-30,30),hurt:num(m.hurt??0,0,2)};});
  for(const [key,id]of Object.entries(circuits)){if(!/^-?\d+,-?\d+,-?\d+$/.test(key)||!Number.isInteger(id)||id<21||id>35)bad();const [x,y,z]=key.split(',').map(Number);position({x,y,z});s.circuits[dim][key]=id;}
 }
 if(!Array.isArray(value.graves)||value.graves.length>4||!Array.isArray(value.smelting)||value.smelting.length>16||!Array.isArray(value.fuses)||value.fuses.length>32)bad();
 s.graves=value.graves.map(g=>{if(!DIMENSIONS.includes(g.dimension)||!Array.isArray(g.inventory)||g.inventory.length>blockCount||g.inventory.some(n=>!Number.isInteger(n)||n<0||n>999))bad();return {...position(g),dimension:g.dimension,inventory:Array.from({length:blockCount},(_,i)=>g.inventory[i]||0),items:counts(g.items),xp:num(g.xp,0,1e8),time:num(g.time,0,300)};});
 s.smelting=value.smelting.map(j=>{if(!ALL_ITEMS[j.output]||!DIMENSIONS.includes(j.dimension))bad();return {...position(j),output:j.output,count:num(j.count,1,64),remaining:num(j.remaining,0,512),dimension:j.dimension};});
 s.fuses=value.fuses.map(f=>({...position(f),dimension:DIMENSIONS.includes(f.dimension)?f.dimension:bad(),time:num(f.time,0,5)}));return s;
}
