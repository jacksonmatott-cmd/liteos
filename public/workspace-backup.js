import {normalizePinnedApps} from './desktop-state.js';
import {devicePath} from './device-accounts.js';
const text=new TextEncoder(),decode=new TextDecoder(),LIMIT=50*1048576;
const b64=bytes=>{let result='';for(let at=0;at<bytes.length;at+=32768)result+=String.fromCharCode(...bytes.subarray(at,at+32768));return btoa(result);};
const unb64=s=>{if(typeof s!=='string'||s.length>100*1048576||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('Invalid backup data.');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};
async function keyFor(password,salt){if(typeof password!=='string'||password.length<8||password.length>200)throw Error('Use a backup password between 8 and 200 characters.');const material=await crypto.subtle.importKey('raw',text.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:210000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export function safePreferences(input={}) {
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 const out={};
 if(['center','left'].includes(input.taskbarAlignment))out.taskbarAlignment=input.taskbarAlignment;
 if(Array.isArray(input.startPins))out.startPins=normalizePinnedApps(input.startPins);
 for(const k of ['reduceMotion','transparency','notifications','showSeconds','desktopIcons','sounds','startFullscreen','highContrast','doNotDisturb'])if(typeof input[k]==='boolean')out[k]=input[k];
 if(['balanced','efficiency','quality'].includes(input.performanceMode))out.performanceMode=input.performanceMode;
 if(['light','dark','system'].includes(input.theme))out.theme=input.theme;
 if(['blue','aurora','dusk','midnight','light','custom'].includes(input.wallpaper))out.wallpaper=input.wallpaper;
 if(/^#[0-9a-f]{6}$/i.test(input.accent || ''))out.accent=input.accent;
 if(['normal','large'].includes(input.fontScale))out.fontScale=input.fontScale;
 if([0,5,15,30,60].includes(input.autoLockMinutes))out.autoLockMinutes=input.autoLockMinutes;
 return out;
}
export async function exportWorkspace(files,preferences,password) {
 if(files.length>2000||files.reduce((n,f)=>n+(f.size||0),0)>LIMIT)throw Error('Workspace backups support up to 2,000 entries and 50 MB. Download larger files separately.');
 const records=[];
 for(const f of files){const {path,name,kind,mime,trashed}=f;const record={path,name,kind,mime,trashed};if(kind!=='folder'){if(f.blob)record.bytes=b64(new Uint8Array(await f.blob.arrayBuffer()));else record.content=String(f.content||'');}records.push(record);}
 const payload={version:1,files:records,preferences:safePreferences(preferences),wallpaperPath:files.find(f=>f.id===preferences.wallpaperFile)?.path || null};
 const salt=crypto.getRandomValues(new Uint8Array(24)),iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await keyFor(password,salt),text.encode(JSON.stringify(payload)));
 return new Blob([JSON.stringify({format:'LiteOS encrypted workspace',version:1,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(data))})],{type:'application/json'});
}
export async function importWorkspace(blob,password) {
 if(blob.size>100*1048576)throw Error('This backup is too large.');
 let envelope;try{envelope=JSON.parse(await blob.text());}catch{throw Error('Choose a valid .litebackup file.');}
 if(envelope?.format!=='LiteOS encrypted workspace'||envelope.version!==1)throw Error('This is not a supported LiteOS backup.');
 const salt=unb64(envelope.salt),iv=unb64(envelope.iv);if(salt.length!==24||iv.length!==12)throw Error('Invalid backup header.');
 let payload;try{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},await keyFor(password,salt),unb64(envelope.data));payload=JSON.parse(decode.decode(plain));}catch{throw Error('The backup password is incorrect, or this file is damaged.');}
 if(payload?.version!==1||!Array.isArray(payload.files)||payload.files.length>2000)throw Error('Invalid workspace backup.');
 let used=0;const seen=new Set(),files=[];
 for(const source of payload.files){if(!source||typeof source!=='object')throw Error('Invalid backup entry.');const path=devicePath(source.path);if(seen.has(path))throw Error('Duplicate backup path.');seen.add(path);const kind=source.kind==='folder'?'folder':'file',mime=String(source.mime||'application/octet-stream').slice(0,150);
  const f={id:crypto.randomUUID(),path,name:path.split('/').at(-1),kind,mime,trashed:source.trashed?1:0,modified_at:Date.now(),size:0,content:null,blob:null};
  if(kind==='file'){if('bytes'in source)f.blob=new Blob([unb64(source.bytes)],{type:mime});else f.content=String(source.content||'');f.size=f.blob?.size??text.encode(f.content).length;if(f.size>20*1048576)throw Error('A backup file exceeds the 20 MB import limit.');used+=f.size;}
  if(used>LIMIT)throw Error('This backup exceeds the 50 MB limit.');files.push(f);
 }
 return {files,preferences:safePreferences(payload.preferences),wallpaperPath:typeof payload.wallpaperPath==='string'?payload.wallpaperPath:null};
}
export function mergeWorkspace(existing,restored) {
 const files=structuredClone(existing),mapped=new Map();
 for(const source of [...restored.files].sort((a,b)=>a.path.length-b.path.length)){
  const original=source.path,parent=original.slice(0,original.lastIndexOf('/'));
  let path=(mapped.get(parent)||parent)+'/'+source.name;
  const collision=files.find(f=>f.path===path);
  if(collision?.kind==='folder'&&source.kind==='folder'){mapped.set(original,path);continue;}
  if(collision){let n=1;const dot=source.kind==='file'?source.name.lastIndexOf('.'):-1;do{const name=dot>0?source.name.slice(0,dot)+` (imported ${n++})`+source.name.slice(dot):source.name+` (imported ${n++})`;path=(mapped.get(parent)||parent)+'/'+name;}while(files.some(f=>f.path===path));}
  if(parent!=='/Home'&&!files.some(f=>f.path===(mapped.get(parent)||parent)&&f.kind==='folder'))throw Error('The backup is missing a parent folder.');
  mapped.set(original,path);files.push({...source,id:crypto.randomUUID(),path,name:path.split('/').at(-1)});
 }
 if(files.reduce((n,f)=>n+(f.size||0),0)>250*1048576)throw Error('The restored workspace would exceed the 250 MB allowance.');
 const preferences={...restored.preferences};const wallpaper=files.find(f=>f.path===mapped.get(restored.wallpaperPath));if(wallpaper)preferences.wallpaperFile=wallpaper.id;else if(preferences.wallpaper==='custom')preferences.wallpaper='blue';
 return {files,preferences};
}
