import {api} from './api.js';
import {HttpError,sandboxPolicy} from './core.js';
import {gameRuntime,oblivionRuntime,engineSource} from './game-runtime.js';
// The build replaces this declaration with the project's static asset bytes.
const ASSETS = {};
const SECURITY={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; media-src 'self' blob:; frame-src https: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"};
const GAME_CSP="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
export default {async fetch(request,env,ctx){const p=new URL(request.url).pathname;let response;try{
 if(!['GET','HEAD'].includes(request.method)&&!p.startsWith('/api/'))throw new HttpError(405,'Method not allowed.');
 if(p==='/api/runtime/heroes3/vcmiclient.js')response=await gameRuntime(request,env,ctx);
 else if(p.startsWith('/oblivion/runtime/'))response=await oblivionRuntime(request,env,ctx);
 else if(p.startsWith('/runtimes/sources/'))response=await engineSource(request,env,ctx);
 else if(p.startsWith('/api/'))response=await api(request,env,ctx);
 else if(p.startsWith('/runtimes/heroes3/'))response=await gameRuntime(request,env,ctx);
 else{const route=p==='/'||p==='/game-mode'?'/index.html':p==='/heroes3/'?'/heroes3/index.html':p,asset=ASSETS[route];if(!asset)return new Response('Not found',{status:404});const body=asset.binary?Uint8Array.from(atob(asset.content),c=>c.charCodeAt(0)):asset.content;response=new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':asset.type,'Cache-Control':p.includes('/assets/')?'public,max-age=86400':'no-cache',...(p==='/sandbox.html'?{'Content-Security-Policy':sandboxPolicy()}:{})}});}
 }catch(e){if(!(e instanceof HttpError))console.error('LiteOS request failed',e.message);response=Response.json({error:e instanceof HttpError?e.message:'LiteOS could not complete this request. Please retry.'},{status:e.status||500,headers:{'Cache-Control':'no-store'}});}
 const headers=new Headers(response.headers);for(const[k,v]of Object.entries(SECURITY))if(!headers.has(k))headers.set(k,v);
 if(p==='/game-mode'||p.startsWith('/heroes3/')||p.startsWith('/runtimes/heroes3/')||p==='/api/runtime/heroes3/vcmiclient.js'||p.startsWith('/oblivion/')){headers.set('Cross-Origin-Opener-Policy','same-origin');headers.set('Cross-Origin-Embedder-Policy','require-corp');headers.set('Cross-Origin-Resource-Policy','same-origin');}
 if(p.startsWith('/heroes3/')||p.startsWith('/runtimes/heroes3/')||p==='/api/runtime/heroes3/vcmiclient.js'||p.startsWith('/oblivion/'))headers.set('Content-Security-Policy',GAME_CSP);
 if(new URL(request.url).protocol==='https:')headers.set('Strict-Transport-Security','max-age=31536000');return new Response(response.body,{status:response.status,headers});}};
