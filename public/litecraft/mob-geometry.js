// Geometry is read from Mojang's published Bedrock samples, not a flat skin cutout.
// Both renderers consume these same UV-mapped, animated cuboid faces.
const FACE=[[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]];
const SHADE=[.8,.7,1,.55,.85,.95];
// Bedrock model rotations use the opposite handedness to our Y-up coordinates.
const rad=a=>a.map(x=>-x*Math.PI/180);
function rotate(p,pivot,r){let [x,y,z]=p.map((v,i)=>v-pivot[i]);let c=Math.cos(r[0]),s=Math.sin(r[0]);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(r[1]);s=Math.sin(r[1]);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(r[2]);s=Math.sin(r[2]);[x,y]=[x*c-y*s,x*s+y*c];return [x+pivot[0],y+pivot[1],z+pivot[2]];}
function dragonBones(bones){const out=bones.filter(b=>['head','jaw','neck','body','frontleg','frontleg1','rearleg','rearleg1'].includes(b.name)).map(b=>structuredClone(b));
 const wing=bones.find(b=>b.name==='wing'),tip=bones.find(b=>b.name==='wingtip');
 for(const [part,name]of [[wing,'wing'],[tip,'wingtip']])for(const sign of [1,-1]){const b=structuredClone(part);b.name=name+(sign<0?'Right':'Left');b.pivot=sign>0?[-12,19,2]:[12,19,2];b.cubes=b.cubes.map(c=>({...c,origin:sign>0?c.origin:[-c.origin[0]-c.size[0],c.origin[1],c.origin[2]],mirror:sign<0}));out.push(b);}
 const neck=bones.find(b=>b.name==='neck');for(let i=0;i<6;i++){const b=structuredClone(neck);b.name='tail'+i;b.pivot=[0,12,54+i*9];b.cubes=b.cubes.map(c=>({...c,origin:[c.origin[0],c.origin[1]-12-i,c.origin[2]+60+i*9]}));out.push(b);}return out;}
export function compileModel(raw,kind,height){const g=raw['minecraft:geometry']?.[0]||Object.values(raw).find(v=>v?.bones);if(!g)throw Error('Mob geometry is missing.');
 const bones=kind==='dragon'?dragonBones(g.bones):g.bones,byName=Object.fromEntries(bones.map(b=>[b.name,b])),faces=[];
 for(const bone of bones){if(bone.neverRender)continue;for(const cube of bone.cubes||[]){const [w,h,d]=cube.size,[u,v]=Array.isArray(cube.uv)?cube.uv:[0,0],rects=[[u+d+w,v+d,d,h],[u,v+d,d,h],[u+d,v,w,d],[u+d+w,v,w,d],[u+d+w+d,v+d,w,h],[u+d,v+d,w,h]],inflate=cube.inflate||0;
  const vertices=FACE.map(face=>face.map(q=>q.map((n,i)=>cube.origin[i]-inflate+n*(cube.size[i]+inflate*2))));
  for(let f=0;f<6;f++){if((f<2&&(!h||!d))||(f>=2&&f<4&&(!w||!d))||(f>=4&&(!w||!h)))continue;let pts=vertices[f];if(cube.rotation)pts=pts.map(p=>rotate(p,cube.pivot||cube.origin.map((v,i)=>v+cube.size[i]/2),rad(cube.rotation)));if(bone.bind_pose_rotation)pts=pts.map(p=>rotate(p,bone.pivot||[0,0,0],rad(bone.bind_pose_rotation)));
   const r=rects[f],uv=[[r[0],r[1]+r[3]],[r[0]+r[2],r[1]+r[3]],[r[0]+r[2],r[1]],[r[0],r[1]]];if(cube.mirror??bone.mirror)for(const t of uv)t[0]=r[0]*2+r[2]-t[0];faces.push({p:pts,uv,bone:bone.name,shade:SHADE[f]});
  }
 }}
 const model={kind,bones,byName,faces,height,scale:1,bottom:0};const posed=poseFaces(model,0,0,true),ys=posed.flatMap(f=>f.p.map(p=>p[1]));model.bottom=Math.min(...ys);model.scale=height/(Math.max(...ys)-model.bottom||16);return model;
}
function jointRotation(b,kind,t,walk){const r=rad(b.rotation||[0,0,0]),n=b.name,swing=Math.sin(t*7)*.65*walk;
 if(/leg/i.test(n)&&kind!=='dragon'){const phase=/left|[13]$/.test(n)?1:-1;r[0]+=swing*phase;if(kind==='spider'){r[2]+=/[0246]$/.test(n)?-.65:.65;r[1]+=((Number(n.slice(-1))>>1)-1.5)*.4;}}
 if(/Arm/.test(n)){r[0]+=kind==='zombie'?1.45:kind==='skeleton'?.9:-swing*(/left/.test(n)?-1:1);}
 // Blaze rod placement is handled as three independent orbiting rings below.
 if(kind==='dragon'&&n.startsWith('wing'))r[2]+=(n.endsWith('Left')?1:-1)*(.15+Math.sin(t*3)*.32);
 if(kind==='dragon'&&n.startsWith('tail'))r[1]+=Math.sin(t*2+Number(n.slice(4))*.4)*.08;
 return r;
}
export function poseFaces(model,t=0,walk=0,raw=false){const transforms={};for(const b of model.bones)transforms[b.name]=jointRotation(b,model.kind,t,walk);
 return model.faces.map(face=>({...face,p:face.p.map(point=>{let p=point,b=model.byName[face.bone],guard=0;while(b&&guard++<32){p=rotate(p,b.pivot||[0,0,0],transforms[b.name]);b=model.byName[b.parent];}if(model.kind==='blaze'&&face.bone.startsWith('upper')){const i=Number(face.bone.replace('upperBodyParts','')),ring=Math.floor(i/4),a=i*Math.PI/2+t*(ring===1?-.9:.9);p=[p[0]+Math.cos(a)*(9-ring*2)-1,p[1]-ring*8,p[2]+Math.sin(a)*(9-ring*2)-1];}return raw?p:[p[0]*model.scale,(p[1]-model.bottom)*model.scale,p[2]*model.scale];})}));}
export function modelTriangles(faces){const p=[],uv=[],color=[];for(const face of faces)for(const i of [0,1,2,0,2,3]){p.push(...face.p[i]);uv.push(...face.uv[i]);color.push(face.shade,face.shade,face.shade);}return {p,uv,color};}
