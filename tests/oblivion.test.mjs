import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrateOblivion} from '../scripts/hydrate-games.mjs';
import {verifyWineRoot,localRootLoader} from '../public/oblivion/root-loader.js';
import {readFile} from 'node:fs/promises';
import {normalizeOblivionPath,stagedSummary,budgetError,SIZE_ACK_BYTES,MOBILE_CAP_BYTES} from '../public/oblivion/probe-files.js';
test('selected original game files map to the expected temporary Wine drive',()=>{
 assert.equal(normalizeOblivionPath('Oblivion.exe'),'/Oblivion/Oblivion.exe');
 assert.equal(normalizeOblivionPath('Oblivion(1).esm'),'/Oblivion/Data/Oblivion.esm');
 assert.equal(normalizeOblivionPath('SteamLibrary/Oblivion/Data/Oblivion - Meshes.bsa'),'/Oblivion/Data/Oblivion - Meshes.bsa');
 assert.equal(normalizeOblivionPath('Installed Oblivion/binkw32.dll'),'/Oblivion/binkw32.dll');
 assert.equal(normalizeOblivionPath('Data/Textures/a.dds'),'/Oblivion/Data/Textures/a.dds');
});
test('selected paths cannot leave the temporary game directory',()=>{
 for(const path of ['../secret','Oblivion/Data/../../private','C:\\Games\\Oblivion.exe','bad\0file.dll','Data/<script>.esp'])assert.throws(()=>normalizeOblivionPath(path));
});
test('memory protection requires acknowledgement and caps touch-device selections',()=>{
 assert.equal(budgetError(SIZE_ACK_BYTES,false,false),'');
 assert.match(budgetError(SIZE_ACK_BYTES+1,false,false),/Acknowledge/);
 assert.equal(budgetError(SIZE_ACK_BYTES+1,false,true),'');
 assert.match(budgetError(MOBILE_CAP_BYTES+1,true,true),/touch devices/);
 assert.match(budgetError(7*1024**3,false,true),/6 GB/);
});
test('staging evaluates File metadata without reading game bytes',()=>{
 const file={size:7898624,arrayBuffer(){throw Error('Game bytes should not be read during staging');}};
 assert.deepEqual(stagedSummary([{path:'/Oblivion/Oblivion.exe',file}]),{count:1,bytes:7898624,hasExe:true,hasMaster:false,hasBink:false,archives:0});
});
test('local Wine root verifies bytes and substitutes only the fixed root filename',async()=>{
 const file=new Blob(['local system root']),hash=Buffer.from(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())).toString('hex');
 const bytes=await verifyWineRoot(file,{bytes:file.size,sha256:hash});
 assert.equal(new TextDecoder().decode(bytes),'local system root');
 await assert.rejects(()=>verifyWineRoot(file,{bytes:file.size,sha256:'wrong'}),/checksum/);
 await assert.rejects(()=>verifyWineRoot({size:1,arrayBuffer(){throw Error('must not read');}}),/expected size/);
 const calls=[],original=(prefix,name,callback)=>{calls.push({prefix,name});return callback('upstream');},load=localRootLoader(original,'wine-root.zip',bytes);
 let local;await load('ignored/','wine-root.zip',value=>local=value);assert.equal(local,bytes);assert.equal(calls.length,0);
 let other;await load('/fixed/','other.zip',value=>other=value);assert.equal(other,'upstream');assert.deepEqual(calls,[{prefix:'/fixed/',name:'other.zip'}]);
});
test('retained runtime WebAssembly compiles and exposes the actual engine entrypoint',async()=>{
 await hydrateOblivion();
 const bytes=await readFile(new URL('../.runtime-cache/oblivion/boxedwine.wasm',import.meta.url));
 const module=await WebAssembly.compile(bytes);
 const exports=WebAssembly.Module.exports(module).map(x=>x.name);
 assert.ok(exports.includes('__main_argc_argv'),JSON.stringify(exports.slice(0,20)));
});
