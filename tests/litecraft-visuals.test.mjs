import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileModel,poseFaces,modelTriangles} from '../public/litecraft/mob-geometry.js';
import {MOB_INFO} from '../public/litecraft/mechanics.js';
import {rasterTriangle} from '../public/litecraft/actors.js';
import {rockField} from '../public/litecraft/geology.js';
import {textureIndex,TEXTURES} from '../public/litecraft/textures.js';
import {buildChunk,seedHash,localIndex} from '../public/litecraft/terrain.js';
import {generate,validateWorld,snapshot,setBlock} from '../public/litecraft/world.js';
import {breakBlock,equip,make} from '../public/litecraft/equipment.js';
const raw=JSON.parse(readFileSync(new URL('../public/litecraft/mob-models.json',import.meta.url))).models;
test('all ten mobs use volumetric downloaded geometry with finite UVs and animated limbs',()=>{
 for(const [kind,info]of Object.entries(MOB_INFO)){const model=compileModel(raw[kind],kind,info.height),faces=poseFaces(model,0,0),positions=faces.flatMap(f=>f.p),xs=positions.map(p=>p[0]),ys=positions.map(p=>p[1]),zs=positions.map(p=>p[2]);
  assert.ok(faces.length>=24,kind);assert.ok(Math.max(...xs)>Math.min(...xs));assert.ok(Math.max(...zs)-Math.min(...zs)>.2);assert.ok(Math.abs(Math.max(...ys)-info.height)<.0001,kind);assert.ok(Math.abs(Math.min(...ys))<.0001,kind);
  assert.ok(positions.flat().every(Number.isFinite));assert.ok(faces.flatMap(f=>f.uv.flat()).every(Number.isFinite));assert.equal(modelTriangles(faces).p.length,faces.length*18);
  assert.notDeepEqual(poseFaces(model,.2,1),poseFaces(model,.7,1),kind);
 }
 const spider=compileModel(raw.spider,'spider',.8);assert.equal(spider.bones.filter(b=>b.name.startsWith('leg')).length,8);
});
test('software model triangles respect terrain occlusion, texture alpha and depth',()=>{
 const view={image:{width:16,height:16,data:new Uint8ClampedArray(16*16*4)},depth:new Float32Array(256).fill(Infinity)},art={width:1,height:1,data:new Uint8ClampedArray([40,200,60,255])},tri=[{x:1,y:1,z:2,u:0,v:0},{x:14,y:1,z:2,u:0,v:0},{x:1,y:14,z:2,u:0,v:0}];
 view.depth[3*16+3]=1;rasterTriangle(view,tri,art,1);assert.equal(view.image.data[(3*16+3)*4+1],0);assert.equal(view.image.data[(4*16+4)*4+1],200);
 const before=view.image.data.slice();art.data[3]=0;rasterTriangle(view,tri.map(v=>({...v,z:1})),art,1);assert.deepEqual(view.image.data,before);
});
test('gold and deepslate variants choose the correct authentic texture on both render paths',()=>{
 assert.equal(TEXTURES[textureIndex(44,0,50,'nether')],'nether_gold_ore');assert.equal(TEXTURES[textureIndex(29,0,-20)],'deepslate_diamond_ore');
 assert.equal(TEXTURES[textureIndex(66,0,40,'nether')],'nether_quartz_ore');assert.equal(TEXTURES[textureIndex(32,5)],'furnace_front');assert.equal(TEXTURES[textureIndex(32,0)],'furnace_side');assert.equal(TEXTURES[textureIndex(36,5)],'chest_front');
});
test('new geology forms connected veins across independently generated chunk edges',()=>{
 const seed=seedHash('Ore patches'),rock=rockField(seed,'nether'),a=buildChunk(seed,-1,0,{},'nether',3),b=buildChunk(seed,0,0,{},'nether',3);let ores=0,connected=0;
 for(let y=4;y<24;y++)for(let z=0;z<16;z++)for(let x=-16;x<16;x++){const id=(x<0?a:b).blocks[localIndex(x<0?x+16:x,y,z)];assert.equal(id,rock(x,y,z,16));if([65,66].includes(id)){ores++;if(x<15&&rock(x+1,y,z,16)===id)connected++;}}
 assert.ok(ores>30);assert.ok(connected>ores*.45);assert.deepEqual(a.blocks,buildChunk(seed,-1,0,{},'nether',3).blocks);
});
test('older biome saves remain valid and modern ore drops are usable in survival',()=>{
 const w=generate('Visual update','survival');assert.equal(w.generator,3);const old=snapshot(w,true);old.generator=2;old.inventory.length=65;assert.equal(validateWorld(old).inventory.length,w.inventory.length);
 equip(w,'hand');w.systems.items.wooden_pickaxe=1;equip(w,'wooden_pickaxe');setBlock(w,10,150,10,65);breakBlock(w,{id:65,x:10,y:150,z:10});assert.equal(w.systems.items.gold_nugget,4);
 w.systems.items.gold_nugget=9;assert.ok(make(w,'gold_from_nuggets'));assert.equal(w.systems.items.gold_ingot,1);
});

test('quadruped body rotations join the leg pivots without floating torsos',()=>{
 for(const kind of ['cow','pig']){const model=compileModel(raw[kind],kind,MOB_INFO[kind].height),faces=poseFaces(model,0,0,true),body=faces.filter(f=>f.bone==='body').slice(0,6).flatMap(f=>f.p.map(p=>p[1])),legTop=Math.max(...faces.filter(f=>f.bone.startsWith('leg')).flatMap(f=>f.p.map(p=>p[1])));assert.ok(Math.abs(Math.min(...body)-legTop)<.001,kind);}
});

test('blaze has twelve independently placed rods rather than one overlapping column',()=>{
 const model=compileModel(raw.blaze,'blaze',1.8),faces=poseFaces(model,0,0,true),centers=new Set();for(let i=0;i<12;i++){const p=faces.find(f=>f.bone==='upperBodyParts'+i).p;centers.add(p[0].map((v,j)=>Math.round(p.reduce((n,q)=>n+q[j],0)/4)).join(','));}assert.equal(centers.size,12);
});
