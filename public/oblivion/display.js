// Observe the runtime without creating a context on either of its canvases.
// The diagnostic test pattern has its own separate 2D canvas.
export function createDisplayDiagnostics({canvas,overlay,testCanvas,onChange=()=>{}}){
 const facts={mainContext:null,overlayContext:null,contextErrors:[],softwareCallbacks:0,bitmapCallbacks:0,softwareFrames:0,bitmapFrames:0,droppedFrames:0,lastError:null,contextLost:false,testPattern:false,layer:'auto'};
 const originalMain=canvas.getContext,originalOverlay=overlay.getContext;
 function watch(target,original,field){return function(type,...args){const context=original.call(this,type,...args);if(context){facts[field]=type;onChange();}else if(['webgl','webgl2','2d','bitmaprenderer'].includes(type)){if(!facts.contextErrors.includes(field+':'+type))facts.contextErrors.push(field+':'+type);onChange();}return context;};}
 canvas.getContext=watch(canvas,originalMain,'mainContext');overlay.getContext=watch(overlay,originalOverlay,'overlayContext');
 function lost(event){event.preventDefault();facts.contextLost=true;onChange();}
 canvas.addEventListener('webglcontextlost',lost,true);overlay.addEventListener('webglcontextlost',lost,true);canvas.addEventListener('contextlost',lost,true);overlay.addEventListener('contextlost',lost,true);
 const observer=typeof MutationObserver==='function'?new MutationObserver(()=>onChange()):null;for(const target of [canvas,overlay])observer?.observe(target,{attributes:true,attributeFilter:['style','width','height']});const resize=typeof ResizeObserver==='function'?new ResizeObserver(()=>onChange()):null;resize?.observe(canvas);
 const wrappers=new WeakMap();
 return {
  attachModule(module){const attached=wrappers.get(module)||{};for(const [name,counter]of [['boxedwinePresentFrame','bitmapCallbacks'],['boxedwinePresentSoftwareFrame','softwareCallbacks']]){const original=module[name];if(typeof original==='function'&&original!==attached[name])module[name]=attached[name]=function(...args){try{return original.apply(this,args);}finally{facts[counter]++;try{onChange();}catch{}}};}wrappers.set(module,attached);},
  recordPresentation(info){for(const key of ['softwareFrames','bitmapFrames','droppedFrames','lastError'])facts[key]=info[key];onChange();},
  recordError(message){facts.lastError=String(message);onChange();},
  setLayer(layer){if(!['auto','direct','software'].includes(layer))throw Error('Unknown display layer.');facts.layer=layer;canvas.parentElement.dataset.displayLayer=layer;onChange();},
  showTest(show){if(show){const context=testCanvas.getContext('2d',{alpha:false});if(!context)throw Error('This browser cannot create a 2D display test.');testCanvas.width=640;testCanvas.height=480;context.fillStyle='#142744';context.fillRect(0,0,640,480);for(const [i,color]of ['#ed616a','#f7c75b','#6acfa5','#64a8ec'].entries()){context.fillStyle=color;context.fillRect(i*160,120,160,180);}context.fillStyle='#ffffff';context.font='bold 26px system-ui';context.textAlign='center';context.fillText('LiteOS display test',320,66);context.font='18px system-ui';context.fillText('Test pattern — not game output',320,352);context.fillText('Choose Back to game to return',320,388);}facts.testPattern=!!show;testCanvas.hidden=!show;onChange();},
  snapshot(){const rectangle=canvas.getBoundingClientRect(),style=typeof getComputedStyle==='function'?getComputedStyle(overlay):overlay.style;return {...facts,contextErrors:[...facts.contextErrors],canvasBuffer:[canvas.width,canvas.height],canvasDisplay:[Math.round(rectangle.width),Math.round(rectangle.height)],overlayVisibility:style?.visibility||'visible'};}
 };
}
export function displaySummary(info,{headless=false,started=false,graphicsLoaded=false,cpuActive=false}={}){
 if(info.testPattern)return 'Display test only — this colored pattern is not Oblivion’s picture.';
 if(info.lastError)return 'Display error: '+info.lastError;
 if(headless)return 'Graphics are disabled in dependency-only mode. Reload with WebGL 2 available for a game display.';
 if(info.contextLost)return 'The browser lost the graphics context. Reload the experiment before trying again.';
 if(started&&(info.canvasDisplay[0]<1||info.canvasDisplay[1]<1))return 'The game canvas has no visible area. Exit fullscreen and use View game.';
 if(info.mainContext&&info.overlayVisibility==='hidden')return 'The runtime selected the direct graphics canvas. A selected renderer does not confirm successful game rendering.';
 if(info.softwareFrames||info.bitmapFrames)return `Overlay submissions: ${info.softwareFrames} software, ${info.bitmapFrames} bitmap. These do not establish working game graphics.`;
 if(graphicsLoaded)return 'Wine’s graphics backend loaded; no displayed game picture has been confirmed. MIPS is CPU activity, not FPS.';
 if(cpuActive)return 'Wine is processing instructions. Waiting for the game’s graphics initialization.';
 return started?'Waiting for display activity. Use Test display to check the page canvas.':'Test display checks the page without starting the game.';
}
