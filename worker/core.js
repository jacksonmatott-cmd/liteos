export const VERSION = '0.3.3';
export function sandboxPolicy(){return `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; sandbox allow-scripts allow-downloads`;}
export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export const uid=()=>crypto.randomUUID();
export const now=()=>Date.now();
export const hex=buffer=>Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,'0')).join('');
export async function digest(value){return hex(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value));}
export async function hashPassword(password,salt){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
export function constantEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let v=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)v|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return v===0;}
export function normalizePath(input){
 if(typeof input!=='string'||input.length>700||/[\x00-\x1f]/.test(input))throw new HttpError(400,'Invalid LiteFS path.');
 const segments=input.replaceAll('\\','/').replace(/^L:/i,'').split('/').filter(Boolean);
 if(segments.some(s=>s==='.'||s==='..'||s.length>120||/[<>:"|?*]/.test(s)))throw new HttpError(400,'Use a valid LiteFS path without parent traversal.');
 return '/'+segments.join('/');
}
export function safeName(name){const p=normalizePath('/'+String(name||''));if(p==='/'||p.slice(1).includes('/'))throw new HttpError(400,'Use a filename without slashes.');return p.slice(1);}
