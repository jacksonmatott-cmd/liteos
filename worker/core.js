export const VERSION = '0.1.0';
export function sandboxPolicy(){return `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; sandbox allow-scripts allow-downloads`;}
export const DEFAULT_POLICIES = Object.freeze({allowAI:true,allowSharing:true,allowTerminal:true,allowExternalApps:true,allowImports:true,requirePassword:true,shareExpiryHours:24,maxUploadMB:20,autoLockMinutes:15,childAI:false,childSharing:false,childExternalApps:false});
export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export const uid=()=>crypto.randomUUID();
export const now=()=>Date.now();
export const hex=buffer=>Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,'0')).join('');
export async function digest(value){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}
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
export function publicUser(u){return {id:u.id,username:u.username,display_name:u.display_name,role:u.role,household_id:u.household_id,preferences:JSON.parse(u.preferences||'{}')};}
export function policiesFor(h){return {...DEFAULT_POLICIES,...JSON.parse(h?.policies||'{}')};}
export function checkPolicy(u,p,feature){if(p[feature]===false)throw new HttpError(403,'This action is disabled by your family policy.');if(u.role==='child'&&({allowAI:'childAI',allowSharing:'childSharing',allowExternalApps:'childExternalApps'}[feature])&&!p[({allowAI:'childAI',allowSharing:'childSharing',allowExternalApps:'childExternalApps'})[feature]])throw new HttpError(403,'A parent has restricted this action for child accounts.');}
export function validExternalURL(input){let u;try{u=new URL(input)}catch{throw new HttpError(400,'Enter a valid HTTPS address.')}if(u.protocol!=='https:'||u.username||u.password)throw new HttpError(400,'Only HTTPS addresses are supported.');return u.href;}
export const STARTER_SCRIPT='@echo off\nrem Welcome to LiteScript\nset NAME=friend\necho Hello, %NAME%!\npwd\ndir\nmkdir Projects\nwrite Projects/hello.txt Made with LiteScript\necho Your first file is ready.\n';
export const WELCOME_TEXT='Welcome to LiteOS\n\nA little lighter. A lot more you.\n\nYour files live in L:/Home. Use Lite Files to create, import, download, and share them.\n\nLiteScript is our batch-inspired language. Open Lite Terminal and type HELP, or run the example in Documents.\n\nCreate a family account to sync files and share secure links across devices. Guest files stay in this browser.\n\nWindows .exe and Steam files can be stored here. Native Windows programs need a remote Windows streaming service; browser apps and Lite games run directly.\n\nPress Ctrl+Space for Start. Ctrl+K opens search. Escape closes menus.\n';
export function starterFiles(){return [
 ...['Desktop','Documents','Downloads','Pictures','Projects','Apps'].map(name=>({path:'/Home/'+name,name,kind:'folder',mime:'inode/directory',size:0,content:null})),
 {path:'/Home/Documents/Welcome to LiteOS.txt',name:'Welcome to LiteOS.txt',kind:'file',mime:'text/plain',content:WELCOME_TEXT,size:WELCOME_TEXT.length},
 {path:'/Home/Documents/hello.lite',name:'hello.lite',kind:'file',mime:'text/plain',content:STARTER_SCRIPT,size:STARTER_SCRIPT.length},
 {path:'/Home/Documents/Ideas.txt',name:'Ideas.txt',kind:'file',mime:'text/plain',content:'My next great idea\n\nA place for the things you want to make.\n',size:60}
];}
