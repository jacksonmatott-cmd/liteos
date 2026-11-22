import test from 'node:test';
import assert from 'node:assert/strict';
import {DeviceAccounts,passwordHash,devicePath} from '../public/device-accounts.js';
import {mergeWorkspace} from '../public/workspace-backup.js';
function environment(shared=new Map()) {
 let token=null,time=1000000;
 const get=async k=>structuredClone(shared.get(k));
 const set=async(k,v)=>shared.set(k,structuredClone(v));
 const seed=()=>[{id:crypto.randomUUID(),path:'/Home/Documents',name:'Documents',kind:'folder',size:0,trashed:0},{id:crypto.randomUUID(),path:'/Home/Documents/hello.txt',name:'hello.txt',kind:'file',content:'Hello',size:5,mime:'text/plain',trashed:0}];
 const api=new DeviceAccounts({get,set,seed,restore:mergeWorkspace,getToken:()=>token,setToken:v=>{token=v;},clock:()=>time});
 return {shared,api,get,advance:ms=>time+=ms,call:(p,d,m='POST')=>api.request(p,{method:m,body:d||{}})};
}
const register=(e,username='guardian')=>e.call('/auth/register',{username,display_name:username,password:'Test-password-123'});
test('device passwords have independent salts; paths cannot escape LiteFS',async()=>{
 assert.notEqual(await passwordHash('password','one'),await passwordHash('password','two'));
 assert.equal(devicePath('L:\\Home\\Documents\\a.txt'),'/Home/Documents/a.txt');
 for(const p of ['/Home/../System','/System/file','/Home/.','/Home/a\u0000b','/Home/evil:name'])assert.throws(()=>devicePath(p));
});
test('profiles persist with separate files, hashed passwords and no network',async()=>{
 const e=environment();const parent=await register(e);
 assert.equal(parent.user.role,'parent');assert.ok(!('password_hash'in parent.user));
 const f=(await e.call('/files',null,'GET')).files.find(x=>x.kind==='file');
 await e.call('/files/'+f.id,{content:'Private work'},'PATCH');
 const metadata=await e.get('accounts-v2');assert.ok(!JSON.stringify(metadata).includes('Test-password-123'));
 await e.call('/auth/logout');await assert.rejects(()=>e.call('/files',null,'GET'),/Sign in/);
 await register(e,'other_parent');await assert.rejects(()=>e.call('/files/'+f.id,{content:'Overwrite'},'PATCH'),/not found/);
 await e.call('/auth/logout');await e.call('/auth/login',{username:'guardian',password:'Test-password-123'});
 assert.equal((await e.call('/files',null,'GET')).files.find(x=>x.id===f.id).content,'Private work');
 await assert.rejects(()=>e.call('/files',{path:'/Home/Missing/x.txt',content:'Bad'}),/Parent folder/);
});
test('family policies, reauthentication, approval expiry and one-use clearing',async()=>{
 const e=environment();await register(e);
 await e.call('/family',{username:'child',display_name:'Kid',password:'Child-password-123',parentPassword:'Test-password-123'});
 await assert.rejects(()=>e.call('/policies',{parentPassword:'wrong',policies:{allowImports:false}},'PATCH'),/incorrect/);
 await e.call('/policies',{parentPassword:'Test-password-123',policies:{allowImports:false}},'PATCH');
 await e.call('/auth/logout');await e.call('/auth/login',{username:'child',password:'Child-password-123'});
 await assert.rejects(()=>e.call('/family',null,'GET'),/parent/);
 await assert.rejects(()=>e.call('/feature',{feature:'allowAI'}),/restricted/);
 await assert.rejects(()=>e.call('/feature',{feature:'allowSharing'}),/restricted/);await assert.rejects(()=>e.call('/feature',{feature:'allowGameRuntime'}),/restricted/);
 await assert.rejects(()=>e.call('/files/import',new FormData()),/restricted/);
 await assert.rejects(()=>e.call('/policies',{parentPassword:'Child-password-123',policies:{childAI:true}},'PATCH'),/parent/);
 await assert.rejects(()=>e.call('/clear-browser-data',{}),/approval/);
 await assert.rejects(()=>e.call('/parent-approve',{username:'child',password:'Child-password-123'}),/parent/);
 let a=await e.call('/parent-approve',{username:'guardian',password:'Test-password-123'});e.advance(61000);
 await assert.rejects(()=>e.call('/clear-browser-data',a),/approval/);
 a=await e.call('/parent-approve',{username:'guardian',password:'Test-password-123'});
 assert.deepEqual(await e.call('/clear-browser-data',a),{ok:true});
 await assert.rejects(()=>e.call('/clear-browser-data',a),/approval/);
});
test('binary files stay local; rename and recycle propagate through directories',async()=>{
 const e=environment();await register(e);
 await e.call('/files',{path:'/Home/Documents/Folder',kind:'folder'});
 const form=new FormData();form.append('file',new Blob(['binary data'],{type:'text/custom'}),'a.bin');form.append('path','/Home/Documents/Folder/a.bin');
 await e.call('/files/import',form);
 let files=(await e.call('/files',null,'GET')).files;const folder=files.find(f=>f.kind==='folder'&&f.name==='Folder');
 assert.equal(await files.find(f=>f.name==='a.bin').blob.text(),'binary data');
 await e.call('/files/'+folder.id,{name:'Renamed'},'PATCH');
 await e.call('/files/'+folder.id,{trashed:true},'PATCH');
 files=(await e.call('/files',null,'GET')).files;assert.equal(files.find(f=>f.name==='a.bin').path,'/Home/Documents/Renamed/a.bin');assert.equal(files.find(f=>f.name==='a.bin').trashed,1);
 await e.call('/files/'+folder.id,null,'DELETE');assert.ok(!(await e.call('/files',null,'GET')).files.some(f=>f.name==='a.bin'));
});
test('password change revokes other device sessions and preserves file space',async()=>{
 const a=environment();await register(a);const b=environment(a.shared);
 await b.call('/auth/login',{username:'guardian',password:'Test-password-123'});
 await a.call('/password',{current:'Test-password-123',password:'Changed-password-456'});
 await assert.rejects(()=>b.call('/me',null,'GET'),/Sign in/);
 assert.equal((await a.call('/me',null,'GET')).user.username,'guardian');
 await a.call('/auth/logout');await assert.rejects(()=>a.call('/auth/login',{username:'guardian',password:'Test-password-123'}),/incorrect/);
 await a.call('/auth/login',{username:'guardian',password:'Changed-password-456'});
 assert.equal((await a.call('/files',null,'GET')).files.length,2);
});
test('account writes serialize and oversized text is rejected without data loss',async()=>{
 const e=environment();await register(e);
 await Promise.all([e.call('/files',{path:'/Home/Documents/one.txt',content:'one'}),e.call('/files',{path:'/Home/Documents/two.txt',content:'two'})]);
 assert.equal((await e.call('/files',null,'GET')).files.length,4);
 await assert.rejects(()=>e.call('/files',{path:'/Home/Documents/large.txt',content:'x'.repeat(1048577)}),/1 MB/);
 assert.equal((await e.call('/files',null,'GET')).files.length,4);
});

test('policy updates reject inherited object keys and feature checks reject unknown names',async()=>{
 const e=environment();await register(e);
 for(const key of ['__proto__','constructor','toString'])await assert.rejects(e.call('/policies',{parentPassword:'Test-password-123',policies:JSON.parse('{"'+key+'":{"allowAI":false}}')},'PATCH'),/Unknown policy/);
 await assert.rejects(e.call('/feature',{feature:'__proto__'}),/Unknown feature/);
 assert.equal((await e.call('/me',{},'GET')).policies.allowAI,true);assert.equal({}.allowAI,undefined);
});
