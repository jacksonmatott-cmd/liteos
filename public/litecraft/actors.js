import {MOB_INFO} from './mechanics.js';
import {compileModel,poseFaces} from './mob-geometry.js';
let assets,actors;
export async function contentArt(){if(!assets)assets=fetch('/litecraft/content-art.json').then(r=>{if(!r.ok)throw Error('Content artwork could not load.');return r.json();});return assets;}
export async function actorResources(){if(!actors)actors=(async()=>{const [art,raw]=await Promise.all([contentArt(),fetch('/litecraft/mob-models.json').then(r=>{if(!r.ok)throw Error('Mob models could not load.');return r.json();})]),result={};
 for(const [kind,uri]of Object.entries(art.mobs)){const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=uri;});const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const c=canvas.getContext('2d');c.drawImage(image,0,0);result[kind]={canvas,width:canvas.width,height:canvas.height,data:c.getImageData(0,0,canvas.width,canvas.height).data,model:compileModel(raw.models[kind],kind,MOB_INFO[kind].height)};}return result;})();return actors;}
export function actorPose(view,mob){view.actorMotion??=new Map();const last=view.actorMotion.get(mob.id),t=view.world.systems.clock,interval=view.policy?.poseInterval||1/30;if(last?.faces&&t>=last.t&&t-last.t<interval)return last.faces;const walk=last&&Math.hypot(mob.x-last.x,mob.z-last.z)>.001?1:0,faces=poseFaces(view.actorArt[mob.kind].model,t,walk);view.actorMotion.set(mob.id,{x:mob.x,z:mob.z,t,faces});if(view.actorMotion.size>64){const alive=new Set(view.world.systems.mobs[view.world.dimension].map(m=>m.id));for(const id of view.actorMotion.keys())if(!alive.has(id))view.actorMotion.delete(id);}return faces;}
// Perspective-correct textured triangles with terrain depth testing, including
// near-plane clipping. Low-end phones see the same three-dimensional models.
export function rasterTriangle(view,vertices,art,shade,hurt=false){const {width,height,data}=view.image,[a,b,c]=vertices,edge=(a,b,x,y)=>(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x),area=edge(a,b,c.x,c.y);if(Math.abs(area)<.00001)return;
 const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x))),minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y)));
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const wa=edge(b,c,x+.5,y+.5)/area,wb=edge(c,a,x+.5,y+.5)/area,wc=1-wa-wb;if(wa<-.00001||wb<-.00001||wc<-.00001)continue;const iz=wa/a.z+wb/b.z+wc/c.z,z=1/iz,u=(wa*a.u/a.z+wb*b.u/b.z+wc*c.u/c.z)*z,v=(wa*a.v/a.z+wb*b.v/b.z+wc*c.v/c.z)*z;
  const rayX=(2*(x+.5)/width-1)*.7*width/height,rayY=(1-2*(y+.5)/height)*.7,distance=z*Math.hypot(1,rayX,rayY),at=y*width+x;if(view.depth[at]<=distance)continue;
  const tx=((Math.floor(u)%art.width)+art.width)%art.width,ty=((Math.floor(v)%art.height)+art.height)%art.height,src=(ty*art.width+tx)*4;if(art.data[src+3]<80)continue;const out=at*4;data[out]=hurt?Math.max(160,art.data[src]*shade):art.data[src]*shade;data[out+1]=art.data[src+1]*shade*(hurt?.45:1);data[out+2]=art.data[src+2]*shade*(hurt?.45:1);view.depth[at]=distance;
 }
}
function clipNear(poly){const output=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=a.z>=.08,bi=b.z>=.08;if(ai)output.push(a);if(ai!==bi){const t=(.08-a.z)/(b.z-a.z);output.push(Object.fromEntries(['x','y','z','u','v'].map(k=>[k,a[k]+(b[k]-a[k])*t])));}}return output;}
export function softwareActors(view,p){const {width,height}=view.image,world=view.world;if(!world.systems||!view.actorArt)return;const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw),sp=Math.sin(p.pitch),cp=Math.cos(p.pitch),tan=.7,aspect=width/height;
 const project=v=>({x:(1+v.x/(v.z*tan*aspect))*width/2,y:(1-v.y/(v.z*tan))*height/2,z:v.z,u:v.u,v:v.v});
 for(const mob of world.systems.mobs[world.dimension]){if(Math.hypot(mob.x-p.x,mob.z-p.z)>48)continue;const art=view.actorArt[mob.kind],yaw=mob.yaw+Math.PI,s=Math.sin(yaw),c=Math.cos(yaw),faces=actorPose(view,mob);
  for(const face of faces){const points=face.p.map((v,i)=>{const dx=mob.x+v[0]*c+v[2]*s-p.x,dy=mob.y+v[1]-p.y,dz=mob.z-v[0]*s+v[2]*c-p.z;return {x:cy*dx-sy*dz,y:sy*sp*dx+cp*dy+cy*sp*dz,z:-sy*cp*dx+sp*dy-cy*cp*dz,u:face.uv[i][0],v:face.uv[i][1]};}),poly=clipNear(points).map(project);
   for(let i=1;i<poly.length-1;i++)rasterTriangle(view,[poly[0],poly[i],poly[i+1]],art,face.shade*(world.dimension==='end'?.7:.9),mob.hurt>0);
  }
 }
 for(const shot of world.systems._shots||[]){const dx=shot.x-p.x,dy=shot.y-p.y,dz=shot.z-p.z,depth=-sy*cp*dx+sp*dy-cy*cp*dz;if(depth<=0)continue;const x=Math.floor((1+(cy*dx-sy*dz)/(depth*tan*aspect))*width/2),y=Math.floor((1-(sy*sp*dx+cp*dy+cy*sp*dz)/(depth*tan))*height/2);if(x>=0&&x<width&&y>=0&&y<height&&view.depth[y*width+x]>depth){const at=(y*width+x)*4;view.image.data[at]=255;view.image.data[at+1]=196;view.image.data[at+2]=75;}}
}
