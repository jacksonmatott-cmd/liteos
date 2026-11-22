import test from 'node:test';
import assert from 'node:assert/strict';
import {BIOMES,biomeNoise,biomeAt,sampleLandscape} from '../public/litecraft/biomes.js';

test('biome climate is deterministic at positive and negative million-block coordinates',()=>{
 for(const [x,z]of [[0,0],[1,-1],[-1000000,1000000],[29999900,-29999900]]){
  assert.deepEqual(sampleLandscape(98765,x,z),sampleLandscape(98765,x,z));
  const biome=biomeAt(98765,x,z),sample=sampleLandscape(98765,x,z);
  assert.equal(biome.id,sample.biome);assert.ok(BIOMES.includes(biome));
  const noise=biomeNoise(98765,x,z,700);assert.ok(noise>=0&&noise<=1);
 }
 assert.notEqual(biomeNoise(1,1234,5678,700),biomeNoise(2,1234,5678,700));
});

test('all thirteen biomes occur and adjacent elevations stay smooth across climate boundaries',()=>{
 const seen=new Set();let boundaries=0;
 for(let i=0;i<20000;i++){
  const x=((i*7919)%20001)-10000,z=((i*104729)%20001)-10000,a=sampleLandscape(12345,x,z);seen.add(a.biome);
  assert.ok(Number.isInteger(a.h)&&a.h>=35&&a.h<=180);
  if(a.biome===10||a.biome===11)assert.ok(a.h<64,'Water biomes must have submerged beds');
  for(const [dx,dz]of [[1,0],[0,1]]){const b=sampleLandscape(12345,x+dx,z+dz);assert.ok(Math.abs(a.h-b.h)<=6,'Biome changes must not create height cliffs');if(a.biome!==b.biome)boundaries++;}
 }
 assert.equal(seen.size,13);assert.ok(boundaries>20);
});

test('biome material, foliage tint and tree metadata use supported blocks and styles',()=>{
 assert.equal(new Set(BIOMES.map(b=>b.key)).size,13);
 for(let i=0;i<BIOMES.length;i++){
  const b=BIOMES[i];assert.equal(b.id,i);assert.ok(b.name);assert.ok(b.top>=1&&b.top<=64);assert.ok(b.sub>=1&&b.sub<=64);
  assert.ok(['oak','birch','spruce','flat','poplar'].includes(b.tree.style));assert.ok(b.tree.log>=1&&b.tree.log<=64);assert.ok(b.tree.leaves>=1&&b.tree.leaves<=64);assert.ok(b.tree.chance>=0&&b.tree.chance<=1);
  assert.equal(b.grass.length,3);assert.ok(b.grass.every(n=>Number.isInteger(n)&&n>=0&&n<=255));assert.ok(b.height.scale>=0);
 }
 assert.equal(BIOMES.find(b=>b.key==='dappled_forest').tree.style,'poplar');
 assert.equal(BIOMES.find(b=>b.key==='desert').tree.chance,0);
 assert.equal(BIOMES.find(b=>b.key==='badlands').sub,52);
});
