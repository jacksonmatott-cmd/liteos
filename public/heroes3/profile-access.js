import {DeviceAccounts} from '/device-accounts.js';
let database;
async function localGet(key){database??=new Promise((resolve,reject)=>{const r=indexedDB.open('liteos-local',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();database=null;};resolve(r.result);};r.onerror=()=>reject(r.error);});const db=await database;return new Promise((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
const accounts=new DeviceAccounts({get:localGet,set:()=>{throw Error('Use LiteOS Settings to manage profiles.');},seed:()=>[],getToken:()=>sessionStorage.getItem('liteos.session')||localStorage.getItem('liteos.remember'),setToken:()=>{}});
export async function assertGamePermission(feature='allowGameRuntime',profile=new URLSearchParams(location.search).get('profile')||'guest'){
 let current;try{current=await accounts.request('/me');}catch(e){if(e.status!==401)throw e;if(profile!=='guest')throw Error('Sign in to this LiteOS profile again.');return;}
 if(current.user.id!==profile)throw Error('Reopen this game from your current LiteOS profile.');await accounts.request('/feature',{body:{feature}});
}
