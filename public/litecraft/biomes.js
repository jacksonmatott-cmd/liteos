// Climate classification is discrete, but terrain elevation uses only continuous
// fields. Crossing a biome boundary therefore changes materials, not cliff height.
const tree=(log,leaves,style,chance)=>({log,leaves,style,chance});
export const BIOMES=[
 {id:0,key:'plains',name:'Plains',top:1,sub:2,tree:tree(5,6,'oak',.002),grass:[145,189,89],height:{base:70,scale:12}},
 {id:1,key:'forest',name:'Forest',top:1,sub:2,tree:tree(5,6,'oak',.028),grass:[112,175,64],height:{base:76,scale:18}},
 {id:2,key:'birch_forest',name:'Birch Forest',top:1,sub:2,tree:tree(46,49,'birch',.024),grass:[128,179,79],height:{base:76,scale:18}},
 {id:3,key:'taiga',name:'Taiga',top:57,sub:2,tree:tree(47,48,'spruce',.026),grass:[119,154,99],height:{base:83,scale:22}},
 {id:4,key:'desert',name:'Desert',top:4,sub:4,tree:tree(5,6,'oak',0),grass:[191,183,85],height:{base:72,scale:16}},
 {id:5,key:'snowy_plains',name:'Snowy Plains',top:14,sub:2,tree:tree(47,48,'spruce',.002),grass:[128,164,118],height:{base:73,scale:14}},
 {id:6,key:'savanna',name:'Savanna',top:1,sub:2,tree:tree(55,56,'flat',.008),grass:[174,183,71],height:{base:78,scale:20}},
 {id:7,key:'swamp',name:'Swamp',top:58,sub:2,tree:tree(59,60,'flat',.017),grass:[91,116,56],height:{base:65,scale:6}},
 {id:8,key:'mountains',name:'Mountains',top:3,sub:3,tree:tree(47,48,'spruce',.001),grass:[120,156,100],height:{base:115,scale:58}},
 {id:9,key:'badlands',name:'Badlands',top:51,sub:52,tree:tree(5,6,'oak',0),grass:[166,163,68],height:{base:93,scale:30}},
 {id:10,key:'ocean',name:'Ocean',top:4,sub:4,tree:tree(5,6,'oak',0),grass:[118,173,85],height:{base:45,scale:15}},
 {id:11,key:'river',name:'River',top:4,sub:4,tree:tree(5,6,'oak',.001),grass:[122,175,81],height:{base:61,scale:2}},
 {id:12,key:'dappled_forest',name:'Dappled Forest',top:1,sub:2,tree:tree(61,62,'poplar',.028),grass:[142,163,76],height:{base:82,scale:20}},
];
function hash(seed,x,z){let n=Math.imul(x+seed,374761393)^Math.imul(z,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
const smooth=t=>t*t*(3-2*t);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const ramp=(a,b,v)=>smooth(clamp((v-a)/(b-a),0,1));
export function biomeNoise(seed,x,z,scale){x/=scale;z/=scale;const ix=Math.floor(x),iz=Math.floor(z),tx=smooth(x-ix),tz=smooth(z-iz),a=hash(seed,ix,iz),b=hash(seed,ix+1,iz),c=hash(seed,ix,iz+1),d=hash(seed,ix+1,iz+1);return (a+(b-a)*tx)*(1-tz)+(c+(d-c)*tx)*tz;}
function climate(seed,x,z){return {continent:biomeNoise(seed+101,x,z,600),temperature:biomeNoise(seed+307,x,z,900),moisture:biomeNoise(seed+401,x,z,700),peak:biomeNoise(seed+503,x,z,360),variety:biomeNoise(seed+607,x,z,260),river:Math.abs(biomeNoise(seed+211,x,z,260)-.5)};}
function classify(c){
 if(c.continent<.28)return 10;
 if(c.river<.029)return 11;
 if(c.peak>.73&&c.continent>.38)return 8;
 if(c.temperature<.32)return c.moisture>.47?3:5;
 if(c.temperature>.65&&c.moisture<.37)return c.variety>.51?9:4;
 if(c.temperature>.65&&c.moisture<.57)return 6;
 if(c.moisture>.73&&c.continent<.66)return 7;
 if(c.temperature<.52&&c.moisture>.56&&c.variety>.54)return 12;
 if(c.temperature>.36&&c.temperature<.68&&c.moisture>.52&&c.variety<.37)return 2;
 if(c.moisture>.52)return 1;
 return 0;
}
export function biomeAt(seed,x,z){return BIOMES[classify(climate(seed,x,z))];}
export function sampleLandscape(seed,x,z){
 const c=climate(seed,x,z),biome=BIOMES[classify(c)],land=ramp(.25,.48,c.continent);
 const detail=(biomeNoise(seed+11,x,z,85)*12+biomeNoise(seed+13,x,z,28)*5)*land;
 const mountains=ramp(.56,.96,c.peak)*ramp(.30,.56,c.continent)*65;
 let h=clamp(64+(c.continent-.32)*90+detail+mountains,35,180);
 // A broad smooth river valley has a flat submerged core and no height seams.
 const river=1-ramp(.03,.26,c.river);h=h*(1-river)+61*river;
 h=clamp(Math.floor(h),35,180);
 return {biome:biome.id,h,top:biome.top,sub:biome.sub};
}
