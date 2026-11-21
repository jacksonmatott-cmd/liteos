import {HttpError,digest} from './core.js';
// Replaced at build time. The upstream code and engine bytes are pinned.
const GAME_RUNTIME = {};
const SOURCE_ARCHIVES = {};
const HEROES_LOADER = "";
function runtimeCache(){try{return globalThis.caches?.default;}catch{return null;}}
export function runtimeScope(profile,version){if(!/^(guest|[a-f0-9-]{36})$/.test(profile||'')||!/^[a-f0-9-]{36}$/.test(version||''))throw new HttpError(400,'Invalid game profile.');return {profile,version};}
export function enginePrefix(profile,version){runtimeScope(profile,version);return `// LiteOS: scope the upstream engine's OPFS access to this local profile/version.\n(()=>{const original=navigator.storage.getDirectory.bind(navigator.storage);navigator.storage.getDirectory=async()=>{let d=await original();for(const name of ['liteos-games','heroes3',${JSON.stringify(profile)},${JSON.stringify(version)}])d=await d.getDirectoryHandle(name,{create:true});return d;};})();\n`;}
export async function extractTarEntry(stream,wanted){
 const reader=stream.getReader();let buffer=new Uint8Array(0),ended=false;
 async function take(size){while(buffer.length<size&&!ended){const next=await reader.read();if(next.done){ended=true;break;}const joined=new Uint8Array(buffer.length+next.value.length);joined.set(buffer);joined.set(next.value,buffer.length);buffer=joined;}if(buffer.length<size)throw new HttpError(502,'The game runtime download was incomplete.');const out=buffer.slice(0,size);buffer=buffer.slice(size);return out;}
 try{for(;;){const header=await take(512);const name=new TextDecoder().decode(header.subarray(0,100)).replace(/\0.*$/s,'');if(!name)break;const size=parseInt(new TextDecoder().decode(header.subarray(124,136)).replace(/\0.*$/s,'').trim(),8);if(!Number.isSafeInteger(size)||size<0||size>128*1048576)throw new HttpError(502,'Invalid runtime archive.');if(name===wanted){const bytes=new Uint8Array(size);for(let offset=0;offset<size;){const part=await take(Math.min(65536,size-offset));bytes.set(part,offset);offset+=part.length;}return bytes;}let remaining=Math.ceil(size/512)*512;while(remaining){const n=Math.min(remaining,65536);await take(n);remaining-=n;}}throw new HttpError(502,'The requested game engine file was absent.');}finally{await reader.cancel().catch(()=>{});}
}
export async function gameRuntime(request,env,ctx){
 if(!['GET','HEAD'].includes(request.method))throw new HttpError(405,'Method not allowed.');
 const url=new URL(request.url),name=url.pathname.split('/').at(-1),spec=GAME_RUNTIME.files[name];if(!spec)throw new HttpError(404,'Unknown game engine file.');
 let prefix='';if(name==='vcmiclient.js'&&url.searchParams.has('profile'))prefix=enginePrefix(url.searchParams.get('profile'),url.searchParams.get('version'));
 let response;
 if(name==='vcmiclient.js'&&HEROES_LOADER)response=new Response(HEROES_LOADER);
 else if(env.GAME_ASSETS){response=await env.GAME_ASSETS.fetch(new Request(url.origin+'/runtimes/heroes3/'+name));if(!response.ok)throw new HttpError(503,'The game engine assets were not deployed.');}
 else{
  const key=new Request(url.origin+'/runtimes/heroes3/'+name+'?runtime=vcmi-1.7.5-v0.1.0');
  const cache=runtimeCache();response=await cache?.match(key).catch(()=>null);
  if(!response){const upstream=await fetch(GAME_RUNTIME.archive,{signal:AbortSignal.timeout(90000)});if(!upstream.ok)throw new HttpError(503,'The browser engine could not be downloaded. Please retry.');const bytes=await extractTarEntry(upstream.body.pipeThrough(new DecompressionStream('gzip')),'homm3-browser/dist/'+name);if(bytes.length!==spec.size||await digest(bytes)!==spec.sha256)throw new HttpError(502,'Game runtime integrity verification failed.');response=new Response(bytes,{headers:{'Content-Type':spec.type,'Cache-Control':'public,max-age=31536000,immutable'}});if(ctx?.waitUntil&&cache)ctx.waitUntil(cache.put(key,response.clone()).catch(()=>{}));}
 }
 if(prefix){const code=await response.text();return new Response(prefix+code,{headers:{'Content-Type':spec.type,'Cache-Control':'private,no-cache'}});}
 return new Response(request.method==='HEAD'?null:response.body,{headers:{'Content-Type':spec.type,'Cache-Control':'public,max-age=31536000,immutable'}});
}
export async function engineSource(request,env,ctx){
 const url=new URL(request.url),name=url.pathname.replace('/runtimes/sources/',''),spec=SOURCE_ARCHIVES[name];if(!spec)throw new HttpError(404,'Unknown engine source archive.');
 const headers={'Content-Type':'application/gzip','Content-Length':String(spec.bytes),'Content-Disposition':'attachment; filename="'+name+'"','Cache-Control':'public,max-age=31536000,immutable'};
 if(request.method==='HEAD')return new Response(null,{headers});
 if(env.GAME_ASSETS){const response=await env.GAME_ASSETS.fetch(new Request(url.origin+url.pathname));if(!response.ok)throw new HttpError(503,'The engine source archive was not deployed.');return new Response(response.body,{headers});}
 const key=new Request(url.origin+url.pathname+'?sha256='+spec.sha256);const cache=runtimeCache();let response=await cache?.match(key).catch(()=>null);
 if(!response){const upstream=await fetch(spec.url,{signal:AbortSignal.timeout(120000)});if(!upstream.ok)throw new HttpError(503,'The engine source archive is temporarily unavailable.');const bytes=new Uint8Array(await upstream.arrayBuffer());if(bytes.length!==spec.bytes||await digest(bytes)!==spec.sha256)throw new HttpError(502,'Engine source verification failed.');response=new Response(bytes,{headers});if(ctx?.waitUntil&&cache)ctx.waitUntil(cache.put(key,response.clone()).catch(()=>{}));}
 return new Response(response.body,{headers});
}
