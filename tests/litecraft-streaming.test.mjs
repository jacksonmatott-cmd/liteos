import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generate,get,setBlock,validateWorld,snapshot,collides,raycast,mine,place,bounds} from '../public/litecraft/world.js';
import {chunkAt,buildChunk,seedHash,column,MIN_Y,MAX_Y,CHUNK_VOLUME,CACHE_LIMIT,WORLD_LIMIT,localIndex} from '../public/litecraft/terrain.js';

test('open worlds generate deterministic terrain millions of blocks away in positive and negative directions',()=>{
 const a=generate('Modern world'),b=generate('Modern world'),c=generate('Different seed');
 assert.equal(a.version,2);assert.equal(collides(a,a.player),false);
 for(const [cx,cz]of [[0,0],[-1,-1],[62500,-62500],[-1000000,1000000]]){
  const ac=chunkAt(a,cx,cz),bc=chunkAt(b,cx,cz),cc=chunkAt(c,cx,cz);
  assert.deepEqual(ac.blocks,bc.blocks);assert.notDeepEqual(ac.blocks,cc.blocks);
  assert.equal(ac.blocks.length,CHUNK_VOLUME);assert.ok(ac.blocks.some(id=>id===3||id===15));
  assert.equal(get(a,cx*16,MIN_Y,cz*16),15);
 }
 assert.equal(bounds(a).limit,WORLD_LIMIT);
});
test('chunk boundaries use continuous global coordinates and work across negative zero',()=>{
 const w=generate('Seam test'),key=seedHash(w.seed);
 for(const x of [-17,-16,-1,0,15,16,17])for(const z of [-1,0,15,16]){
  const {h,top}=column(key,x,z,w.generator),cx=Math.floor(x/16),cz=Math.floor(z/16),chunk=chunkAt(w,cx,cz);
  assert.equal(get(w,x,h,z),top);assert.equal(get(w,x,h,z),chunk.blocks[localIndex(x-cx*16,h,z-cz*16)]);
 }
});
test('evicting generated chunks never loses edits and saves contain no generated terrain',()=>{
 const w=generate('Long journey','survival');w.inventory[7]=12;
 assert.equal(setBlock(w,-1,150,-1,7),true);assert.equal(get(w,-1,150,-1),7);
 for(let i=0;i<CACHE_LIMIT+5;i++)chunkAt(w,100+i,100);
 assert.ok(w._chunks.size<=CACHE_LIMIT);assert.equal(w._chunks.has('-1,-1'),false);assert.equal(get(w,-1,150,-1),7);
 const data=snapshot(w,true),json=JSON.stringify(data);assert.equal(data.blocks,undefined);assert.equal(data._chunks,undefined);assert.ok(json.length<2000);
 const restored=validateWorld(JSON.parse(json));assert.equal(get(restored,-1,150,-1),7);assert.equal(setBlock(restored,0,MIN_Y,0,0),false);
});
test('modern-world mining and placement operate below Y zero and survive backup restore',()=>{
 const w=generate('Underground','survival');setBlock(w,100,-20,100,3);setBlock(w,100,-20,101,0);setBlock(w,100,-20,102,0);
 const hit=raycast(w,{x:100.5,y:-19.5,z:102.8},{x:0,y:0,z:-1});assert.equal(hit.z,100);assert.ok(mine(w,hit));assert.equal(w.inventory[3],1);
 setBlock(w,100,-20,100,3);assert.ok(place(w,{...hit,normal:[0,0,1]},3,{x:110,y:150,z:110}));
 const restored=validateWorld(JSON.parse(JSON.stringify(snapshot(w,true))));assert.equal(get(restored,100,-20,101),3);assert.equal(restored.inventory[3],0);
});
test('streamed world imports reject malformed chunks, bedrock edits, invalid IDs and out-of-world coordinates',()=>{
 const w=generate('Validation');
 for(const edits of [{'bad':{}},{'0,0':{'-1':3}},{'0,0':{'256':99}},{'0,0':{'0':0}},{'01,0':{'256':3}}])assert.throws(()=>validateWorld({...snapshot(w),edits}));
 assert.throws(()=>validateWorld({...snapshot(w),player:{...w.player,x:WORLD_LIMIT+1}}),/position/);
 assert.doesNotThrow(()=>validateWorld({...snapshot(w),player:{...w.player,x:-WORLD_LIMIT+.5,z:WORLD_LIMIT-.5}}));
});
test('original open-world chunks retain their published terrain bytes after the biome upgrade',()=>{
 const fixtures=[[0,0,'e120cc36e030bac31c765014017cfdd98585c6747f382ee02b124e53ebb3210d'],[-1,-1,'7603c3fb47995153954cb0d5aad2d7e0a6ca68f514d9a4b81f2faae4ee6bd358'],[20,-30,'50ac4583e9766386d00f0d2a43b66718163c7cee052ef91282611b80530c6f5f']];
 for(const [x,z,hash]of fixtures)assert.equal(createHash('sha256').update(buildChunk(seedHash('Compatibility'),x,z,{},'overworld',1).blocks).digest('hex'),hash);
 const old=generate('Old save');delete old.generator;const copy=validateWorld(JSON.parse(JSON.stringify(snapshot(old,true))));assert.equal(copy.generator,1);
});
