import {BLOCKS} from './catalog.js';
import {contentArt} from './actors.js';
export const TEXTURES=[...new Set(BLOCKS.flatMap(b=>[b.texture,b.top,b.bottom]).filter(Boolean))];
export const ATLAS_COLUMNS=8,ATLAS_ROWS=Math.ceil(TEXTURES.length/ATLAS_COLUMNS);
export function textureIndex(id,face){const b=BLOCKS[id]||BLOCKS[3];return TEXTURES.indexOf(face===2?(b.top||b.texture):face===3?(b.bottom||b.texture):b.texture);}
// Vanilla grass, leaves and water get their color from the game's biome tint.
const tints={grass_top:[145,189,89],leaves:[119,171,47],water:[63,118,228],spruce_leaves:[97,153,97],birch_leaves:[128,167,85],acacia_leaves:[145,189,89],mangrove_leaves:[113,166,49]};
export async function loadTiles(size,software=false){const art=await contentArt();return Promise.all(TEXTURES.map(name=>new Promise((resolve,reject)=>{
 const image=new Image();image.onload=()=>{try{
  const source=document.createElement('canvas');source.width=source.height=image.naturalWidth;const pixels=source.getContext('2d');
  // Animated files contain vertically stacked square frames. Use frame zero.
  pixels.drawImage(image,0,0,image.naturalWidth,image.naturalWidth,0,0,source.width,source.height);
  const tint=tints[name]||(name==='redstone_dust_dot'?[210,35,18]:null);if(tint){const data=pixels.getImageData(0,0,source.width,source.height);for(let i=0;i<data.data.length;i+=4)for(let c=0;c<3;c++)data.data[i+c]=Math.round(data.data[i+c]*tint[c]/255);pixels.putImageData(data,0,0);}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  if(name==='leaves'){ctx.fillStyle='#243b17';ctx.fillRect(0,0,size,size);}else if(software&&name==='glass'){ctx.fillStyle='#b6dce2';ctx.fillRect(0,0,size,size);}else if(software&&name==='water'){ctx.fillStyle='#3f76e4';ctx.fillRect(0,0,size,size);}
  ctx.drawImage(source,0,0,size,size);resolve(canvas);
 }catch(error){reject(error);}};image.onerror=()=>reject(Error('A LiteCraft texture did not load. Reload to retry.'));image.src=art.blocks[name]||'/litecraft/textures/'+name+'.png';
})));}
