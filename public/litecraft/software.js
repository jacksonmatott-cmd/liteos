import {BIOMES} from './biomes.js';
import {bounds,SIZE,get} from './world.js';
import {chunkAt,localIndex} from './terrain.js';
import {loadTiles,textureIndex} from './textures.js';
import {BLOCKS} from './catalog.js';
import {actorResources,softwareActors} from './actors.js';
const getBlockBelow=(w,x,y,z)=>get(w,x,y-1,z)||3;
export class SoftwareView{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('This browser cannot create a drawing canvas.');this.last=0;this.look={x:0,y:0,z:-1};}
 async init(){const tiles=await loadTiles(32,true);this.textures=tiles.map(c=>c.getContext('2d').getImageData(0,0,32,32).data);this.actorArt=await actorResources();this.resize();}
 resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;this.canvas.width=w>h?176:112;this.canvas.height=Math.round(this.canvas.width*h/w);this.image=this.ctx.createImageData(this.canvas.width,this.canvas.height);this.depth=new Float32Array(this.canvas.width*this.canvas.height);this.canvas.style.imageRendering='pixelated';}
 setPerformance(policy){this.policy=policy;}
 load(world){this.actorMotion?.clear();this.world=world;this.last=0;}
 changed(){this.last=0;}
 direction(){return this.look;}
 draw(p,time,hit){if(this.world.version===2)this.world._center=[Math.floor(p.x/16),Math.floor(p.z/16)];const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw),sp=Math.sin(p.pitch),cp=Math.cos(p.pitch);this.look={x:-sy*cp,y:sp,z:-cy*cp};if(performance.now()-this.last<80)return;this.last=performance.now();const {width,height,data}=this.image,blocks=this.world.blocks,world=this.world,range=bounds(world),day=world.dimension==='nether'?.5:world.dimension==='end'?.35:Math.max(.12,Math.sin(time*Math.PI*2)),sky=world.dimension==='nether'?[65,18,16]:world.dimension==='end'?[20,13,32]:[30+day*130,48+day*160,68+day*154],tan=.7,aspect=width/height;
  for(let py=0;py<height;py++)for(let px=0;px<width;px++){
   const u=(2*(px+.5)/width-1)*tan*aspect,v=(1-2*(py+.5)/height)*tan;
   let dx=-sy*cp+u*cy+v*sy*sp,dy=sp+v*cp,dz=-cy*cp-u*sy+v*cy*sp;const len=Math.hypot(dx,dy,dz);dx/=len;dy/=len;dz/=len;
   let x=Math.floor(p.x),y=Math.floor(p.y),z=Math.floor(p.z),sx=dx>=0?1:-1,sz=dz>=0?1:-1,syy=dy>=0?1:-1,tx=dx===0?1e9:Math.abs(1/dx),ty=dy===0?1e9:Math.abs(1/dy),tz=dz===0?1e9:Math.abs(1/dz),mx=dx===0?1e9:((dx>0?x+1:x)-p.x)/dx,my=dy===0?1e9:((dy>0?y+1:y)-p.y)/dy,mz=dz===0?1e9:((dz>0?z+1:z)-p.z)/dz,dist=0,id=0,axis=1,ccx=Infinity,ccz=Infinity,cached=null;
   for(let n=0;n<100&&dist<64;n++){if(y>=range.min&&y<range.max){if(world.version===2&&Math.abs(x)<range.limit&&Math.abs(z)<range.limit){const nx=Math.floor(x/16),nz=Math.floor(z/16);if(nx!==ccx||nz!==ccz){cached=chunkAt(world,nx,nz);ccx=nx;ccz=nz;}id=cached.blocks[localIndex(x-ccx*16,y,z-ccz*16)];}else if(world.version===1&&x>=0&&z>=0&&x<SIZE&&z<SIZE)id=blocks[(y*SIZE+z)*SIZE+x];if(id){const h=BLOCKS[id].height;if(h<1){const plane=(y+h-p.y)/dy;if(dy<0&&plane>=dist&&plane<64&&p.x+dx*plane>=x&&p.x+dx*plane<=x+1&&p.z+dz*plane>=z&&p.z+dz*plane<=z+1){dist=plane;axis=1;break;}const yy=p.y+dy*dist;if(yy>=y&&yy<=y+h)break;id=0;}else break;}}if(mx<=my&&mx<=mz){dist=mx;mx+=tx;x+=sx;axis=0;}else if(my<=mz){dist=my;my+=ty;y+=syy;axis=1;}else{dist=mz;mz+=tz;z+=sz;axis=2;}}
   let r=sky[0],g=sky[1],b=sky[2];if(id&&dist<64){const xx=p.x+dx*dist,yy=p.y+dy*dist,zz=p.z+dz*dist,frac=q=>q-Math.floor(q);const uu=frac(axis===0?zz:xx),vv=frac(axis===1?zz:-yy),texture=this.textures[textureIndex(id,axis===1?(dy<0?2:3):axis===0?(dx<0?0:1):(dz<0?4:5),y,world.dimension)],offset=(Math.min(31,Math.floor(vv*32))*32+Math.min(31,Math.floor(uu*32)))*4,background=texture[offset+3]<100?this.textures[textureIndex(getBlockBelow(world,x,y,z),2)]:texture,light=(axis===1?(dy<0?1:.6):axis===0?.8:.9)*(.3+.7*day),fog=Math.min(.9,Math.max(0,(dist-25)/45));r=background[offset]*light*(1-fog)+r*fog;g=background[offset+1]*light*(1-fog)+g*fog;b=background[offset+2]*light*(1-fog)+b*fog;if(hit&&x===hit.x&&y===hit.y&&z===hit.z&&(uu<.025||uu>.975||vv<.025||vv>.975)){r=240;g=224;b=165;}}
   this.depth[py*width+px]=id?dist:Infinity;if(world.generator>=2&&cached&&(id===6||id===1&&axis===1&&dy<0)){const tint=BIOMES[cached.biomes[(z-ccz*16)*16+x-ccx*16]].grass;r*=tint[0]/145;g*=tint[1]/189;b*=tint[2]/89;}const at=(py*width+px)*4;data[at]=r;data[at+1]=g;data[at+2]=b;data[at+3]=255;
  }softwareActors(this,p);this.ctx.putImageData(this.image,0,0);
 }
}
