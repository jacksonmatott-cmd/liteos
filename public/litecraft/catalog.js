// LiteCraft content catalog. The first sixteen block IDs are save-compatible.
// Equipment values are Java-inspired LiteCraft tuning, not a claim of exact
// Minecraft 26.3 simulation. In particular recipes use a simplified recipe book,
// netherite upgrades omit smithing templates, and the End gate is craftable.
const block=(name,color,texture,extra={})=>({name,color,texture,solid:true,height:1,hardness:1,tier:0,tool:null,...extra});
export const BLOCKS=[
 block('Air','#c5e8ff','stone',{solid:false,hardness:0}),
 block('Meadow','#91bd59','dirt_grass',{top:'grass_top',bottom:'dirt',hardness:.6,tool:'shovel'}),
 block('Earth','#886343','dirt',{hardness:.5,tool:'shovel'}),
 block('Slate','#87929c','stone',{hardness:1.5,tool:'pickaxe'}),
 block('Sand','#dbc98d','sand',{hardness:.5,tool:'shovel'}),
 block('Timber','#88603c','trunk_side',{top:'trunk_top',bottom:'trunk_top',hardness:2,tool:'axe'}),
 block('Canopy','#77ab2f','leaves',{hardness:.2}),
 block('Boards','#be925e','wood',{hardness:2,tool:'axe'}),
 block('Brick','#ab6860','brick_red',{hardness:2,tool:'pickaxe'}),
 block('Glass','#b5e2e1','glass',{hardness:.3}),
 block('Water','#438aaf','water',{solid:false,height:.91,hardness:Infinity}),
 block('Copper','#c48c65','stone_iron',{hardness:3,tier:1,tool:'pickaxe',drop:'raw_copper'}),
 block('Coal','#3c4852','stone_coal',{hardness:3,tool:'pickaxe',drop:'coal'}),
 block('Lantern','#f3cf77','stone_gold',{hardness:.3}),
 block('Snow','#e2edf1','snow',{hardness:.2,tool:'shovel'}),
 block('Basalt','#394654','brick_grey',{hardness:3,tool:'pickaxe'}),
 block('Netherrack','#743636','netherrack',{hardness:.4,tool:'pickaxe'}),
 block('End Stone','#dedda5','end_stone',{hardness:3,tool:'pickaxe'}),
 block('Obsidian','#2c1d41','obsidian',{hardness:50,tier:3,tool:'pickaxe'}),
 block('Nether Portal','#813fbd','nether_portal',{solid:false,hardness:Infinity}),
 block('Lava','#f87415','lava_still',{solid:false,height:.91,hardness:Infinity}),
 block('Redstone Wire','#771e19','redstone_dust_dot',{solid:false,height:.06,hardness:0,drop:'redstone'}),
 block('Powered Wire','#ff3b20','redstone_dust_dot',{solid:false,height:.06,hardness:0,drop:'redstone'}),
 block('Redstone Block','#a61c09','redstone_block',{hardness:5,tool:'pickaxe'}),
 block('Redstone Lamp','#634a2e','redstone_lamp',{hardness:.3}),
 block('Lit Lamp','#efc779','redstone_lamp_on',{hardness:.3}),
 block('Lever','#977b58','lever',{solid:false,height:.4,hardness:.5}),
 block('Powered Lever','#cda566','lever',{solid:false,height:.4,hardness:.5}),
 block('Iron Ore','#b2957e','iron_ore',{hardness:3,tier:1,tool:'pickaxe',drop:'raw_iron'}),
 block('Diamond Ore','#74d7d6','diamond_ore',{hardness:3,tier:2,tool:'pickaxe',drop:'diamond'}),
 block('Ancient Debris','#65504a','ancient_debris_side',{top:'ancient_debris_top',bottom:'ancient_debris_top',hardness:30,tier:3,tool:'pickaxe'}),
 block('Crafting Table','#a87641','crafting_table_side',{front:'crafting_table_front',top:'crafting_table_top',bottom:'wood',hardness:2.5,tool:'axe'}),
 block('Furnace','#777773','furnace_side',{front:'furnace_front',top:'furnace_top',bottom:'furnace_top',hardness:3.5,tool:'pickaxe'}),
 block('End Portal','#192b37','end_portal_frame_top',{solid:false,height:.1,hardness:Infinity}),
 block('Bedrock','#535353','bedrock',{hardness:Infinity,tier:4,tool:'pickaxe'}),
 block('TNT','#b75239','tnt_side',{top:'tnt_top',bottom:'tnt_bottom',hardness:0}),
 block('Chest','#a87531','chest_side',{front:'chest_front',top:'chest_top',bottom:'chest_bottom',hardness:2.5,tool:'axe'}),
 block('Farmland','#796044','dirt',{top:'farmland_moist',height:.9375,hardness:.6,tool:'shovel'}),
 block('Wheat','#70a43a','wheat_stage0',{solid:false,height:.4,hardness:0,drop:'seeds'}),
 block('Ripe Wheat','#d5b652','wheat_stage7',{solid:false,height:.9,hardness:0,drop:'wheat'}),
 block('Iron Block','#d8d8d8','iron_block',{hardness:5,tier:1,tool:'pickaxe'}),
 block('Copper Block','#bd7355','copper_block',{hardness:3,tier:1,tool:'pickaxe'}),
 block('Diamond Block','#65dedb','diamond_block',{hardness:5,tier:2,tool:'pickaxe'}),
 block('Redstone Ore','#b04c45','redstone_ore',{hardness:3,tier:2,tool:'pickaxe',drop:'redstone'}),
 block('Gold Ore','#d0ad4e','gold_ore',{hardness:3,tier:2,tool:'pickaxe',drop:'raw_gold'}),
 block('Soul Sand','#685447','soul_sand',{hardness:.5,tool:'shovel'}),
];


BLOCKS.push(
 block('Birch Log','#d9d5b6','birch_log',{top:'birch_log_top',bottom:'birch_log_top',hardness:2,tool:'axe'}),
 block('Spruce Log','#59452c','spruce_log',{top:'spruce_log_top',bottom:'spruce_log_top',hardness:2,tool:'axe'}),
 block('Spruce Leaves','#557d40','spruce_leaves',{hardness:.2}),
 block('Birch Leaves','#88ac46','birch_leaves',{hardness:.2}),
 block('Cactus','#50852e','cactus_side',{top:'cactus_top',bottom:'cactus_bottom',hardness:.4}),
 block('Red Sand','#bd6b26','red_sand',{hardness:.5,tool:'shovel'}),
 block('Terracotta','#a35f42','terracotta',{hardness:1.25,tool:'pickaxe'}),
 block('Ice','#8dbaf1','ice',{hardness:.5}),
 block('Packed Ice','#91bbed','packed_ice',{hardness:.5}),
 block('Acacia Log','#786f61','acacia_log',{top:'acacia_log_top',bottom:'acacia_log_top',hardness:2,tool:'axe'}),
 block('Acacia Leaves','#84a14e','acacia_leaves',{hardness:.2}),
 block('Podzol','#6e482c','podzol_side',{top:'podzol_top',bottom:'dirt',hardness:.5,tool:'shovel'}),
 block('Mud','#4a453c','mud',{hardness:.5,tool:'shovel'}),
 block('Mangrove Log','#63544b','mangrove_log',{top:'mangrove_log_top',bottom:'mangrove_log_top',hardness:2,tool:'axe'}),
 block('Mangrove Leaves','#779944','mangrove_leaves',{hardness:.2}),
 block('Poplar Log','#a6a18b','poplar_log',{top:'poplar_log_top',bottom:'poplar_log_top',hardness:2,tool:'axe'}),
 block('Red Poplar Leaves','#bc5139','red_poplar_leaves',{hardness:.2}),
 block('Orange Poplar Leaves','#d7853b','orange_poplar_leaves',{hardness:.2}),
 block('Yellow Poplar Leaves','#d9b44e','yellow_poplar_leaves',{hardness:.2})
);

// Appended IDs preserve every block stored by earlier releases.
BLOCKS.push(
 block('Nether Gold Ore','#a96c38','nether_gold_ore',{hardness:3,tool:'pickaxe',drop:'gold_nugget'}),
 block('Nether Quartz Ore','#ad887d','nether_quartz_ore',{hardness:3,tool:'pickaxe',drop:'quartz'}),
 ...[['Coal','coal',0,'coal'],['Copper','copper',1,'raw_copper'],['Iron','iron',1,'raw_iron'],['Gold','gold',2,'raw_gold'],['Redstone','redstone',2,'redstone'],['Diamond','diamond',2,'diamond']].map(([name,key,tier,drop])=>block('Deepslate '+name+' Ore','#58616a','deepslate_'+key+'_ore',{hardness:4.5,tier,tool:'pickaxe',drop})),
 block('Gravel','#918780','gravel',{hardness:.6,tool:'shovel'}),
 block('Granite','#a57566','granite',{hardness:1.5,tool:'pickaxe'}),
 block('Diorite','#c5c4bf','diorite',{hardness:1.5,tool:'pickaxe'}),
 block('Andesite','#8c8e89','andesite',{hardness:1.5,tool:'pickaxe'}),
 block('Blackstone','#342c33','blackstone',{hardness:1.5,tool:'pickaxe'}),
 block('Basalt Pillar','#514c55','basalt_side',{top:'basalt_top',bottom:'basalt_top',hardness:1.25,tool:'pickaxe'})
);

const item=(name,texture,extra={})=>({name,texture,...extra});
export const ITEMS={
 gold_nugget:item('Gold Nugget','gold_nugget'),quartz:item('Nether Quartz','quartz'),stick:item('Stick','stick'),raw_copper:item('Raw Copper','raw_copper'),raw_iron:item('Raw Iron','raw_iron'),raw_gold:item('Raw Gold','raw_gold'),
 copper_ingot:item('Copper Ingot','copper_ingot'),iron_ingot:item('Iron Ingot','iron_ingot'),gold_ingot:item('Gold Ingot','gold_ingot'),diamond:item('Diamond','diamond'),
 coal:item('Coal','coal'),redstone:item('Redstone Dust','redstone'),netherite_scrap:item('Netherite Scrap','netherite_scrap'),netherite_ingot:item('Netherite Ingot','netherite_ingot'),
 ender_pearl:item('Ender Pearl','ender_pearl'),blaze_powder:item('Blaze Powder','blaze_powder'),eye_of_ender:item('Eye of Ender','ender_eye'),
 flint:item('Flint','flint'),flint_and_steel:item('Flint and Steel','flint_and_steel',{durability:64}),shield:item('Shield','shield',{durability:336}),
 bow:item('Bow','bow',{durability:384}),arrow:item('Arrow','arrow'),string:item('String','string'),
 apple:item('Apple','apple',{food:4,saturation:2.4}),raw_beef:item('Raw Beef','beef',{food:3,saturation:1.8}),cooked_beef:item('Steak','cooked_beef',{food:8,saturation:12.8}),
 wheat:item('Wheat','wheat'),bread:item('Bread','bread',{food:5,saturation:6}),seeds:item('Wheat Seeds','wheat_seeds'),leather:item('Leather','leather'),
 gunpowder:item('Gunpowder','gunpowder'),rotten_flesh:item('Rotten Flesh','rotten_flesh',{food:4,saturation:.8}),bone:item('Bone','bone'),
};

const materials={
 wood:{prefix:'wooden',label:'Wooden',tier:0,speed:2,bonus:0,durability:59,axe:7,axeSpeed:.8,hoeSpeed:1},
 stone:{prefix:'stone',label:'Stone',tier:1,speed:4,bonus:1,durability:131,axe:9,axeSpeed:.8,hoeSpeed:2},
 copper:{prefix:'copper',label:'Copper',tier:1,speed:5,bonus:1,durability:190,axe:9,axeSpeed:.8,hoeSpeed:2},
 iron:{prefix:'iron',label:'Iron',tier:2,speed:6,bonus:2,durability:250,axe:9,axeSpeed:.9,hoeSpeed:3},
 golden:{prefix:'golden',label:'Golden',tier:0,speed:12,bonus:0,durability:32,axe:7,axeSpeed:1,hoeSpeed:1},
 diamond:{prefix:'diamond',label:'Diamond',tier:3,speed:8,bonus:3,durability:1561,axe:9,axeSpeed:1,hoeSpeed:4},
 netherite:{prefix:'netherite',label:'Netherite',tier:4,speed:9,bonus:4,durability:2031,axe:10,axeSpeed:1,hoeSpeed:4},
};
const title=s=>s[0].toUpperCase()+s.slice(1);
export const TOOLS={};
for(const [material,m]of Object.entries(materials))for(const kind of ['pickaxe','axe','shovel','sword','hoe']){
 const key=m.prefix+'_'+kind;
 TOOLS[key]={name:m.label+' '+title(kind),texture:key,kind,material,tier:m.tier,speed:m.speed,damage:kind==='axe'?m.axe:kind==='hoe'?1:(kind==='sword'?4:kind==='shovel'?2.5:2)+m.bonus,attackSpeed:kind==='axe'?m.axeSpeed:kind==='hoe'?m.hoeSpeed:kind==='sword'?1.6:kind==='pickaxe'?1.2:1,durability:m.durability};
}

const armorMaterials={
 leather:{label:'Leather',armor:[1,3,2,1],toughness:0,durability:[55,80,75,65]},
 copper:{label:'Copper',armor:[2,4,3,1],toughness:0,durability:[121,176,165,143]},
 iron:{label:'Iron',armor:[2,6,5,2],toughness:0,durability:[165,240,225,195]},
 golden:{label:'Golden',armor:[2,5,3,1],toughness:0,durability:[77,112,105,91]},
 diamond:{label:'Diamond',armor:[3,8,6,3],toughness:2,durability:[363,528,495,429]},
 netherite:{label:'Netherite',armor:[3,8,6,3],toughness:3,durability:[407,592,555,481]},
};
const armorParts=[['helmet','head'],['chestplate','chest'],['leggings','legs'],['boots','feet']];
export const ARMOR={};
for(const [material,m]of Object.entries(armorMaterials))for(let i=0;i<armorParts.length;i++){
 const [part,slot]=armorParts[i],key=material+'_'+part;ARMOR[key]={name:m.label+' '+title(part),texture:key,slot,armor:m.armor[i],toughness:m.toughness,durability:m.durability[i]};
}
export const ALL_ITEMS={...ITEMS,...TOOLS,...ARMOR};

const recipe=(key,name,cost,output)=>({key,name,cost,output});
export const CRAFTS=[
 recipe('boards','Timber Boards',{'b:5':1},{'b:7':4}),
 recipe('gold_from_nuggets','Gold Ingot',{'i:gold_nugget':9},{'i:gold_ingot':1}),
 recipe('sticks','Sticks',{'b:7':2},{'i:stick':4}),
 recipe('crafting_table','Crafting Table',{'b:7':4},{'b:31':1}),
 recipe('furnace','Furnace',{'b:3':8},{'b:32':1}),
 recipe('bricks','Clay-colored Bricks',{'b:2':3,'b:3':1},{'b:8':4}),
 recipe('packed_slate','Packed Slate',{'b:3':3},{'b:15':2}),
 recipe('shield','Shield',{'b:7':6,'i:iron_ingot':1},{'i:shield':1}),
 recipe('flint_and_steel','Flint and Steel',{'i:flint':1,'i:iron_ingot':1},{'i:flint_and_steel':1}),
 recipe('bow','Bow',{'i:stick':3,'i:string':3},{'i:bow':1}),
 recipe('arrows','Arrows',{'i:stick':1,'i:flint':1},{'i:arrow':4}),
 recipe('bread','Bread',{'i:wheat':3},{'i:bread':1}),
 recipe('wire','Redstone Wire',{'i:redstone':1},{'b:21':1}),
 recipe('redstone_block','Redstone Block',{'i:redstone':9},{'b:23':1}),
 recipe('redstone_dust','Unpack Redstone Block',{'b:23':1},{'i:redstone':9}),
 recipe('redstone_lamp','Redstone Lamp',{'i:redstone':4,'b:13':1},{'b:24':1}),
 recipe('lever','Lever',{'b:3':1,'i:stick':1},{'b:26':1}),
 recipe('tnt','TNT',{'i:gunpowder':5,'b:4':4},{'b:35':1}),
 recipe('chest','Chest',{'b:7':8},{'b:36':1}),
 recipe('eye_of_ender','Eye of Ender',{'i:ender_pearl':1,'i:blaze_powder':1},{'i:eye_of_ender':1}),
 recipe('end_portal','End Gate · simplified',{'i:eye_of_ender':12,'b:18':12},{'b:33':1}),
 recipe('netherite_ingot','Netherite Ingot',{'i:netherite_scrap':4,'i:gold_ingot':4},{'i:netherite_ingot':1}),
];
const materialCost={wood:'b:7',stone:'b:3',copper:'i:copper_ingot',iron:'i:iron_ingot',golden:'i:gold_ingot',diamond:'i:diamond'};
for(const [key,tool]of Object.entries(TOOLS)){
 if(tool.material==='netherite'){CRAFTS.push(recipe(key,'Upgrade '+tool.name,{['i:diamond_'+tool.kind]:1,'i:netherite_ingot':1},{['i:'+key]:1}));continue;}
 const cost={[materialCost[tool.material]]:tool.kind==='pickaxe'||tool.kind==='axe'?3:tool.kind==='shovel'?1:2,'i:stick':tool.kind==='sword'?1:2};
 CRAFTS.push(recipe(key,tool.name,cost,{['i:'+key]:1}));
}
const armorCost={leather:'i:leather',copper:'i:copper_ingot',iron:'i:iron_ingot',golden:'i:gold_ingot',diamond:'i:diamond'};
for(const [key,armor]of Object.entries(ARMOR)){
 const [material,part]=key.split('_');
 if(material==='netherite')CRAFTS.push(recipe(key,'Upgrade '+armor.name,{['i:diamond_'+part]:1,'i:netherite_ingot':1},{['i:'+key]:1}));
 else CRAFTS.push(recipe(key,armor.name,{[armorCost[material]]:({head:5,chest:8,legs:7,feet:4})[armor.slot]},{['i:'+key]:1}));
}
for(const [name,id,ingredient]of [['iron',40,'iron_ingot'],['copper',41,'copper_ingot'],['diamond',42,'diamond']]){
 CRAFTS.push(recipe(name+'_block',title(name)+' Block',{['i:'+ingredient]:9},{['b:'+id]:1}));
 CRAFTS.push(recipe(name+'_unpack','Unpack '+title(name)+' Block',{['b:'+id]:1},{['i:'+ingredient]:9}));
}

for(const id of [46,47,55,59,61])CRAFTS.push(recipe('boards_'+id,'Boards from '+BLOCKS[id].name,{['b:'+id]:1},{'b:7':4}));
