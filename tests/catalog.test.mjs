import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOCKS,TOOLS,ARMOR,ALL_ITEMS,CRAFTS} from '../public/litecraft/catalog.js';

test('catalog keeps legacy block IDs stable and gives ores and functional blocks usable metadata',()=>{
 assert.deepEqual(BLOCKS.slice(0,16).map(b=>b.name),['Air','Meadow','Earth','Slate','Sand','Timber','Canopy','Boards','Brick','Glass','Water','Copper','Coal','Lantern','Snow','Basalt']);
 assert.equal(BLOCKS[18].name,'Obsidian');assert.equal(BLOCKS[34].name,'Bedrock');assert.equal(BLOCKS[45].name,'Soul Sand');
 for(const id of [0,10,19,20,21,22,26,27,33,38,39])assert.equal(BLOCKS[id].solid,false);
 for(const block of BLOCKS)if(block.drop)assert.ok(ALL_ITEMS[block.drop],block.drop);
 assert.equal(BLOCKS[29].tier,2);assert.equal(BLOCKS[18].tier,3);
});
test('crafting graph has unique recipes, valid references, positive costs and no free obsidian',()=>{
 const keys=new Set();const valid=ref=>/^b:\d+$/.test(ref)?!!BLOCKS[Number(ref.slice(2))]:/^i:[a-z_]+$/.test(ref)&&!!ALL_ITEMS[ref.slice(2)];
 for(const recipe of CRAFTS){assert.ok(!keys.has(recipe.key),recipe.key);keys.add(recipe.key);assert.ok(Object.keys(recipe.cost).length);assert.ok(Object.keys(recipe.output).length);
  for(const [ref,count]of [...Object.entries(recipe.cost),...Object.entries(recipe.output)]){assert.ok(valid(ref),recipe.key+' '+ref);assert.ok(Number.isInteger(count)&&count>0);}
  assert.equal(recipe.output['b:18'],undefined,'Obsidian must be mined or formed rather than freely crafted');
 }
 for(const key of [...Object.keys(TOOLS),...Object.keys(ARMOR)])assert.ok(keys.has(key),'Missing craft: '+key);
 for(const tool of Object.values(TOOLS).filter(t=>t.material==='netherite')){const recipe=CRAFTS.find(r=>r.key===tool.texture);assert.equal(recipe.cost['i:diamond_'+tool.kind],1);assert.equal(recipe.cost['i:netherite_ingot'],1);}
});
test('equipment has persistent slots, durability and meaningful modern copper progression',()=>{
 assert.equal(Object.keys(TOOLS).length,35);assert.equal(Object.keys(ARMOR).length,24);
 const stone=TOOLS.stone_pickaxe,copper=TOOLS.copper_pickaxe,iron=TOOLS.iron_pickaxe;
 assert.equal(copper.tier,stone.tier);assert.equal(copper.damage,stone.damage);assert.ok(copper.speed>stone.speed&&copper.speed<iron.speed);assert.ok(copper.durability>stone.durability&&copper.durability<iron.durability);
 for(const tool of Object.values(TOOLS)){assert.ok(tool.durability>0);assert.ok(tool.attackSpeed>0);assert.ok(tool.speed>0);}
 for(const armor of Object.values(ARMOR)){assert.ok(['head','chest','legs','feet'].includes(armor.slot));assert.ok(armor.durability>0);assert.ok(armor.armor>0);assert.ok(armor.toughness>=0);}
});
