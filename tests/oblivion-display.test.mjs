import test from 'node:test';
import assert from 'node:assert/strict';
import {createDisplayDiagnostics,displaySummary} from '../public/oblivion/display.js';

function fixture(){
 const calls=[],context={fillRect(){},fillText(){}},parentElement={dataset:{}};
 const make=name=>({width:640,height:480,hidden:true,parentElement,style:{visibility:'visible'},listeners:{},getContext(...args){calls.push({name,args,receiver:this});return name==='test'?context:{name};},addEventListener(name,fn){this.listeners[name]=fn;},getBoundingClientRect:()=>({width:640,height:480})});
 const canvas=make('main'),overlay=make('overlay'),testCanvas=make('test');
 return {calls,canvas,overlay,testCanvas,monitor:createDisplayDiagnostics({canvas,overlay,testCanvas})};
}
test('the display test leaves both game canvas context modes unclaimed',()=>{
 const {calls,canvas,testCanvas,monitor}=fixture();assert.deepEqual(calls,[]);
 monitor.showTest(true);assert.equal(testCanvas.hidden,false);assert.equal(monitor.snapshot().testPattern,true);assert.deepEqual(calls.map(c=>c.name),['test']);
 const options={alpha:false},context=canvas.getContext('webgl2',options);assert.equal(context.name,'main');assert.equal(calls.at(-1).receiver,canvas);assert.equal(calls.at(-1).args[1],options);assert.equal(monitor.snapshot().mainContext,'webgl2');
 monitor.showTest(false);assert.equal(testCanvas.hidden,true);
});
test('display observation preserves callback arguments, return values and upstream layer visibility',()=>{
 const {canvas,overlay,monitor}=fixture(),seen=[],module={boxedwinePresentFrame(...args){seen.push([this,args]);return 17;},boxedwinePresentSoftwareFrame(){throw Error('upstream error');}};
 monitor.attachModule(module);monitor.attachModule(module);assert.equal(module.boxedwinePresentFrame('frame',640,480),17);assert.equal(seen[0][0],module);assert.deepEqual(seen[0][1],['frame',640,480]);
 assert.throws(()=>module.boxedwinePresentSoftwareFrame(),/upstream error/);assert.equal(monitor.snapshot().bitmapCallbacks,1);assert.equal(monitor.snapshot().softwareCallbacks,1);
 overlay.style.visibility='hidden';for(const mode of ['direct','software','auto']){monitor.setLayer(mode);assert.equal(canvas.parentElement.dataset.displayLayer,mode);assert.equal(overlay.style.visibility,'hidden');}
 assert.throws(()=>monitor.setLayer('unknown'),/Unknown/);
});
test('display diagnostics distinguish CPU activity and backend selection from rendered gameplay',()=>{
 const {monitor,canvas}=fixture(),info=monitor.snapshot();
 assert.match(displaySummary(info,{graphicsLoaded:true,cpuActive:true,started:true}),/MIPS is CPU activity, not FPS/);
 assert.match(displaySummary(info,{cpuActive:true}),/Waiting for the game/);
 assert.match(displaySummary(info,{headless:true}),/Graphics are disabled/);
 monitor.showTest(true);assert.match(displaySummary(monitor.snapshot()),/not Oblivion/);
 let prevented=false,stopped=false;canvas.listeners.webglcontextlost({preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});monitor.showTest(false);
 assert.ok(prevented);assert.equal(stopped,false);assert.match(displaySummary(monitor.snapshot()),/lost the graphics context/);
});
test('callback observation retries missing handlers and remains idempotent for replacements',()=>{
 const {monitor}=fixture(),module={};monitor.attachModule(module);module.boxedwinePresentFrame=()=>23;monitor.attachModule(module);monitor.attachModule(module);assert.equal(module.boxedwinePresentFrame(),23);assert.equal(monitor.snapshot().bitmapCallbacks,1);module.boxedwinePresentFrame=()=>42;monitor.attachModule(module);assert.equal(module.boxedwinePresentFrame(),42);assert.equal(monitor.snapshot().bitmapCallbacks,2);
});
test('a failed display pattern does not leave an empty test canvas selected',()=>{
 const {monitor,testCanvas}=fixture();testCanvas.getContext=()=>null;assert.throws(()=>monitor.showTest(true),/cannot create/);assert.equal(testCanvas.hidden,true);assert.equal(monitor.snapshot().testPattern,false);
});
