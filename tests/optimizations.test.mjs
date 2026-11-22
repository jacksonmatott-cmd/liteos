import test from 'node:test';
import assert from 'node:assert/strict';
import {assetResponse} from '../worker/index.js';
import worker from '../worker/index.js';
import {filePage,performancePolicy,powerMode,storageHealth,storageMessage,transactionDone,aiContext,createLocalStore} from '../public/runtime.js';
import {safePreferences} from '../public/workspace-backup.js';
import {actorPose} from '../public/litecraft/actors.js';
import {compileModel} from '../public/litecraft/mob-geometry.js';
import {readFileSync} from 'node:fs';

test('unchanged assets return validators without decoding or transferring bytes',async()=>{
 const asset={etag:'W/"abc"',size:3,binary:true,content:'!!!bad base64!!!',type:'image/png'},url='https://liteos.test/a.png';
 for(const header of ['W/"abc"','"abc"','"different", W/"abc"','*']){const r=assetResponse(new Request(url,{headers:{'If-None-Match':header}}),asset);assert.equal(r.status,304);assert.equal(await r.text(),'');assert.equal(r.headers.get('etag'),'W/"abc"');assert.match(r.headers.get('cache-control'),/private/);}
 const head=assetResponse(new Request(url,{method:'HEAD'}),asset);assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'3');assert.equal(await head.text(),'');
 const full=assetResponse(new Request(url,{headers:{'If-None-Match':'W/"other"'}}),{...asset,binary:false,content:'new'});assert.equal(await full.text(),'new');
});
test('missing assets and HEAD API responses retain security and body semantics',async()=>{
 const missing=await worker.fetch(new Request('https://liteos.test/missing'),{},{});assert.equal(missing.status,404);assert.equal(missing.headers.get('x-content-type-options'),'nosniff');assert.ok(missing.headers.has('content-security-policy'));
 const head=await worker.fetch(new Request('https://liteos.test/api/status',{method:'HEAD'}),{},{});assert.equal(head.status,200);assert.equal(await head.text(),'');
});
test('large folders paginate without losing files and filter across all pages',()=>{
 const files=Array.from({length:5000},(_,i)=>({id:String(i),kind:'file',path:'/Home/Documents/File '+i,name:'File '+i}));files.push({id:'folder',name:'Folder',path:'/Home/Documents/Folder',kind:'folder'});
 const first=filePage(files,{path:'/Home/Documents'});assert.equal(first.items.length,100);assert.equal(first.items[0].id,'folder');assert.equal(first.total,5001);
 const found=new Set();for(let page=0;page<first.pages;page++)for(const f of filePage(files,{path:'/Home/Documents',page}).items)found.add(f.id);assert.equal(found.size,5001);
 assert.equal(filePage(files,{path:'/Home/Documents',query:'File 4999'}).items[0].id,'4999');assert.equal(filePage(files,{path:'/Home/Documents',page:Infinity}).page,0);
 assert.equal(filePage(files,{path:'/Home/Documents',query:'no match',page:500}).page,0);
});
test('power preferences have bounded profiles and survive encrypted-backup preference validation',()=>{
 assert.equal(powerMode('__proto__'),'balanced');assert.equal(performancePolicy('efficiency',true).fps,30);assert.ok(performancePolicy('quality').pixelRatio>performancePolicy('efficiency').pixelRatio);assert.equal(performancePolicy('balanced',true).chunkRadius,2);
 assert.equal(safePreferences({performanceMode:'efficiency'}).performanceMode,'efficiency');assert.equal(safePreferences({performanceMode:'bad'}).performanceMode,undefined);
});
test('storage health tolerates unsupported APIs and reports browser estimates honestly',async()=>{
 assert.deepEqual(await storageHealth(undefined),{usage:null,quota:null,persistent:false});assert.deepEqual(await storageHealth({estimate:async()=>({usage:100,quota:1000}),persisted:async()=>true}),{usage:100,quota:1000,persistent:true});assert.equal((await storageHealth({estimate:async()=>{throw Error();}})).quota,null);
 assert.match(storageMessage({name:'QuotaExceededError'}),/storage is full/);
});
test('aborted and failed storage transactions reject instead of leaving saves pending',async()=>{
 const tx=new EventTarget(),done=transactionDone(tx);tx.dispatchEvent(new Event('abort'));await assert.rejects(done,/interrupted/);
 const full=new EventTarget();full.error=Object.assign(Error('Disk full'),{name:'QuotaExceededError'});const failed=transactionDone(full);full.dispatchEvent(new Event('error'));await assert.rejects(failed,{name:'QuotaExceededError'});
});
test('a failed IndexedDB open is retryable and blocked connections are closed if they arrive late',async()=>{
 const original=globalThis.indexedDB;let requests=[],closed=0;try{globalThis.indexedDB={open(){const r={};requests.push(r);return r;}};const store=createLocalStore('qa','state'),first=store.open();requests[0].error=Error('Unavailable');requests[0].onerror();await assert.rejects(first,/Unavailable/);const second=store.open();assert.equal(requests.length,2);requests[1].onblocked();await assert.rejects(second,/Close other/);requests[1].result={close(){closed++;}};requests[1].onsuccess();assert.equal(closed,1);}finally{globalThis.indexedDB=original;}
});
test('long assistant conversations stay inside the request budget and preserve the latest question',()=>{
 const input=Array.from({length:80},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(6000)}));input.push({role:'user',content:'Latest question'});const result=aiContext(input);assert.equal(result.at(-1).content,'Latest question');assert.ok(result.length<=12);assert.ok(result.reduce((n,m)=>n+m.content.length,0)<=28000);assert.ok(JSON.stringify({messages:result}).length<40000);
});
test('mob posing reuses geometry between animation ticks without freezing world movement',()=>{
 const raw=JSON.parse(readFileSync(new URL('../public/litecraft/mob-models.json',import.meta.url))).models.zombie,model=compileModel(raw,'zombie',1.8),view={world:{dimension:'overworld',systems:{clock:1,mobs:{overworld:[]}}},actorArt:{zombie:{model}}},mob={id:'qa',kind:'zombie',x:0,z:0};view.world.systems.mobs.overworld.push(mob);
 const a=actorPose(view,mob);view.world.systems.clock+=.01;mob.x+=.2;assert.equal(actorPose(view,mob),a);assert.equal(mob.x,.2);view.world.systems.clock+=.04;assert.notEqual(actorPose(view,mob),a);
});

test('assistant budgets include UTF-8 bytes and JSON escapes',()=>{for(const text of ['😀'.repeat(6000),'\u0000'.repeat(6000),'漢'.repeat(6000)]){const messages=aiContext(Array.from({length:12},()=>({role:'user',content:text})));assert.ok(new TextEncoder().encode(JSON.stringify({messages})).length<40000);}});

test('bursts of block changes queue each visible neighbor chunk only once',async()=>{
 const {View}=await import('../public/litecraft/render.js'),view={chunks:new Map(['0,0','-16,0','16,0','0,-16','0,16'].map(k=>[k,{}]))};
 for(let i=0;i<20;i++)View.prototype.changed.call(view,4,4);
 assert.equal(view.dirtyChunks.size,5);assert.deepEqual(view.dirtyChunks.get('0,0'),[0,0]);
});
