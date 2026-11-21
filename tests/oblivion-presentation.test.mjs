import test from 'node:test';
import assert from 'node:assert/strict';
import {installPresentationBridge,probeWebGL} from '../public/oblivion/presentation.js';
function fixture(options={}){
 let mode,allocations=0;const calls=[],errors=[],presentations=[];
 const context={createImageData(width,height){allocations++;return {width,height,data:new Uint8ClampedArray(width*height*4)};},putImageData(image){if(options.throwDraw)throw Error('draw failed');calls.push({kind:'software',bytes:[...image.data]});},drawImage(...args){if(options.throwDraw)throw Error('draw failed');calls.push({kind:'bitmap',args});}};
 const canvas={width:2,height:1,parentElement:{style:{setProperty(){}}},getContext(type,attributes){calls.push({kind:'context',type,attributes});if(options.denyContext||mode&&mode!==type)return null;mode=type;return context;}};
 const module={},bridge=installPresentationBridge(module,{canvas,onError:message=>{errors.push(message);if(options.throwObserver)throw Error('observer');},onPresent:info=>presentations.push(info)});
 return {module,bridge,canvas,calls,errors,presentations,get allocations(){return allocations;}};
}
const lock=()=>new Int32Array([1]),bytes=()=>new Uint8Array([255,0,0,255,0,255,0,255]);
const bitmap=()=>({width:2,height:1,closed:0,close(){this.closed++;}});
test('alternating bitmap/software presentations retain one context and release acknowledgements in either order',()=>{
 for(const order of [['bitmap','software','bitmap'],['software','bitmap','software']]){const f=fixture();assert.deepEqual(f.calls,[]);for(const kind of order){const state=lock();if(kind==='software')f.module.boxedwinePresentSoftwareFrame(2,1,bytes(),state);else{const b=bitmap();f.module.boxedwinePresentFrame(b,state);assert.equal(b.closed,1);}assert.equal(state[0],0);}assert.deepEqual(f.calls.filter(c=>c.kind==='context').map(c=>c.type),['2d']);assert.deepEqual(f.calls.filter(c=>c.kind!=='context').map(c=>c.kind),order);assert.equal(f.presentations.length,3);assert.equal(f.bridge.snapshot().droppedFrames,0);}
});
test('bitmap cropping, cleanup and frame dimensions are preserved',()=>{
 const f=fixture(),state=lock(),b={...bitmap(),width:8,height:6};f.module.boxedwinePresentFrame(b,state,2,1,3,4);assert.deepEqual(f.calls.find(c=>c.kind==='bitmap').args,[b,2,1,3,4,0,0,3,4]);assert.equal(f.canvas.width,3);assert.equal(f.canvas.height,4);assert.equal(b.closed,1);assert.equal(state[0],0);
});
test('drawing and diagnostic exceptions cannot stall the next frame',()=>{
 const options={throwDraw:true,throwObserver:true},f=fixture(options),state=lock(),b=bitmap();assert.doesNotThrow(()=>f.module.boxedwinePresentFrame(b,state));assert.equal(state[0],0);assert.equal(b.closed,1);assert.match(f.errors[0],/draw failed/);assert.equal(f.bridge.snapshot().droppedFrames,1);options.throwDraw=false;const next=lock();f.module.boxedwinePresentSoftwareFrame(2,1,bytes(),next);assert.equal(next[0],0);assert.equal(f.bridge.snapshot().softwareFrames,1);assert.equal(f.bridge.snapshot().lastError,null);
});
test('invalid dimensions and truncated buffers allocate no pixels and retain the last surface',()=>{
 const f=fixture();for(const [w,h,b]of [[0,1,bytes()],[8193,1,bytes()],[8192,8192,bytes()],[2,1,new Uint8Array(2)]]){const state=lock();f.module.boxedwinePresentSoftwareFrame(w,h,b,state);assert.equal(state[0],0);}assert.equal(f.allocations,0);assert.equal(f.canvas.width,2);assert.equal(f.canvas.height,1);assert.equal(f.bridge.snapshot().droppedFrames,4);const b=bitmap(),state=lock();f.module.boxedwinePresentFrame(b,state,3,0,1,1);assert.equal(b.closed,1);assert.equal(state[0],0);
});
test('software frames honor view offsets and accept ordinary or shared buffers',()=>{
 const f=fixture(),data=new Uint8Array([9,9,...bytes(),9]);f.module.boxedwinePresentSoftwareFrame(2,1,data.subarray(2,10),lock());f.module.boxedwinePresentSoftwareFrame(2,1,bytes().buffer,lock());if(typeof SharedArrayBuffer==='function'){const shared=new Uint8Array(new SharedArrayBuffer(8));shared.set(bytes());f.module.boxedwinePresentSoftwareFrame(2,1,shared.buffer,lock());}for(const call of f.calls.filter(c=>c.kind==='software'))assert.deepEqual(call.bytes,[...bytes()]);assert.equal(f.allocations,1);
});
test('context denial is explicit and null/control frames or cleanup failures always acknowledge',()=>{
 const f=fixture({denyContext:true}),state=lock();f.module.boxedwinePresentSoftwareFrame(2,1,bytes(),state);assert.equal(state[0],0);assert.match(f.errors[0],/could not create/);for(const kind of ['software','bitmap']){const next=lock();if(kind==='software')f.module.boxedwinePresentSoftwareFrame(2,1,null,next);else f.module.boxedwinePresentFrame(null,next);assert.equal(next[0],0);}const good=fixture(),last=lock();good.module.boxedwinePresentFrame({...bitmap(),close(){throw Error('close failed');}},last);assert.equal(last[0],0);assert.match(good.errors[0],/close failed/);
});
test('WebGL capability probing handles denial and optional extension failures',()=>{
 assert.deepEqual(probeWebGL(()=>({getContext(){throw Error('graphics denied');}})),{available:false,error:'graphics denied'});assert.equal(probeWebGL(()=>({getContext:()=>null})).available,false);assert.equal(probeWebGL(()=>({getContext:()=>({getExtension:()=>({loseContext(){throw Error('cleanup failed');}})})})).available,true);
});
