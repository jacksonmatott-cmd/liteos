import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import {runLiteScript} from '../public/litescript.js';
const origin='https://liteos.test';
const call=(env,path,body,headers={})=>worker.fetch(new Request(origin+'/api'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...headers},body:body?JSON.stringify(body):undefined}),env,{});
test('server operates with no database, bucket or account bindings',async()=>{
 const status=await call({},'/status');assert.equal(status.status,200);const value=await status.json();assert.equal(value.storage,'device');assert.equal(value.cloud,false);assert.equal(value.ai,false);
 assert.equal((await call({},'/files')).status,404);
 assert.equal((await call({},'/auth/register',{username:'x'})).status,404);
});
test('optional provider key cannot be used without a separately configured access code',async()=>{
 const env={OLLAMA_API_KEY:'private-provider-key'};
 assert.equal((await(await call(env,'/status')).json()).ai,false);
 assert.equal((await call(env,'/ai',{messages:[{role:'user',content:'hello'}]})).status,503);
 env.AI_ACCESS_CODE='private-access-code';
 assert.equal((await call(env,'/ai',{messages:[{role:'user',content:'hello'}]})).status,401);
 assert.equal((await call(env,'/ai',{messages:[{role:'user',content:'hello'}]},{Authorization:'Bearer '+env.AI_ACCESS_CODE,Origin:'https://evil.test'})).status,403);
});
test('existing provider credit errors are clear and credentials never enter the response',async()=>{
 const env={OLLAMA_API_KEY:'private-provider-key',AI_ACCESS_CODE:'private-access-code'};
 const original=globalThis.fetch;let called=false;
 try{globalThis.fetch=async(url,options)=>{called=true;assert.equal(url,'https://ollama.com/api/chat');assert.equal(options.headers.Authorization,'Bearer '+env.OLLAMA_API_KEY);return Response.json({error:'No credits'},{status:402});};
 const response=await call(env,'/ai',{messages:[null,{role:'user',content:'hello'}]},{Authorization:'Bearer '+env.AI_ACCESS_CODE});
 assert.equal(response.status,402);const result=await response.text();assert.match(result,/usage credits/);assert.ok(!result.includes(env.OLLAMA_API_KEY));assert.ok(!result.includes(env.AI_ACCESS_CODE));assert.ok(called);
 }finally{globalThis.fetch=original;}
});
test('AI rejects oversized and empty requests before contacting a provider',async()=>{
 const env={OLLAMA_API_KEY:'private-provider-key',AI_ACCESS_CODE:'private-access-code'},headers={Authorization:'Bearer private-access-code'};
 assert.equal((await call(env,'/ai',{messages:[]},headers)).status,400);
 assert.equal((await call(env,'/ai',{messages:[{role:'user',content:'x'.repeat(41000)}]},headers)).status,413);
});
test('LiteScript executes quoted paths and variables without access to JavaScript or the host',async()=>{const files=new Map(),output=[];const host={username:'friend',print:s=>output.push(s),clear:()=>output.length=0,list:async()=>[],isFolder:async()=>true,mkdir:async()=>{},write:async(p,s)=>files.set(p,s),read:async p=>files.get(p),remove:async p=>files.delete(p),open:async()=>{}};await runLiteScript('set NAME=LiteOS\necho Hello, %NAME%!\nwrite "Documents/My note.txt" Made with LiteScript\ntype "Documents/My note.txt"',host);assert.deepEqual(output,['Hello, LiteOS!','Saved L:/Home/Documents/My note.txt','Made with LiteScript']);await assert.rejects(()=>runLiteScript('eval process.exit()',host),/Unknown command/);await assert.rejects(()=>runLiteScript('type ../../etc/passwd',host),/limited/);await assert.rejects(()=>runLiteScript('echo a\necho b',host,{maxSteps:1}),/command limit/);});
