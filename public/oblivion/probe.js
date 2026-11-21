import {assertGamePermission} from '/heroes3/profile-access.js';
import {createDisplayDiagnostics,displaySummary} from './display.js';
import {installPresentationBridge,probeWebGL} from './presentation.js';
import {launchAvailability} from './launch-state.js';
import {verifyWineRoot,localRootLoader} from './root-loader.js';
import {planOblivionImport,stagedSummary,budgetError,SIZE_ACK_BYTES} from './probe-files.js';
import {steamInstallation,inspectSteamExecutable,prepareSteamProfile,classifyWineLine} from './steam-profile.js';
const $ = selector => document.querySelector(selector);
const staged = new Map();
const state = {authorized:false,loading:false,ready:false,started:false,failed:false,headless:false,rootFile:null,busy:false,exeInfo:null,profileInfo:null,coreStarted:false,expanded:false,launchIssue:null,displayTest:false,graphicsLoaded:false,cpuActive:false,log:[]};
const mobile = matchMedia('(pointer: coarse)').matches && innerWidth < 1100;
const runtimeBase = new URL('./runtime/', location.href);
let preparation=null,resolvePreparation,rejectPreparation,preparationTimer,launchTimer,displayMonitor,displayUpdateTimer,presentationBridge,graphicsProbe,fullscreenPending=false;

function log(value) {
  const line = typeof value === 'string' ? value : String(value);
  state.log.push(line.slice(0,8000));
  if (state.log.length > 500) state.log.splice(0,state.log.length-500);
  $('#probe-log').textContent = state.log.join('\n');
  $('#probe-log').scrollTop = $('#probe-log').scrollHeight;
  if(/wined3d_dll_init.*(?:WebGL WineD3D|OpenGL renderer|WebGL-compatible profile)/i.test(line))state.graphicsLoaded=true;
  if(/\[MIPS\]/.test(line))state.cpuActive=true;
  scheduleDisplay();
  const issue=classifyWineLine(line);if(issue){state.launchIssue=issue.message;announce(issue.message,true);refreshLaunch();}
}
function announce(message,error=false) { $('#probe-status').textContent=message;$('#probe-status').classList.toggle('error',error);if(state.loading||state.busy||state.started)$('#launch-hint').textContent=message; }
function formatBytes(value) { return value < 1024*1024 ? (value/1024).toFixed(1)+' KB' : value < 1024**3 ? (value/1024**2).toFixed(1)+' MB' : (value/1024**3).toFixed(2)+' GB'; }
function refresh() {
  const summary=stagedSummary(staged.values()),check=steamInstallation(staged.values());
  $('#selection-summary').textContent=summary.count ? `${summary.count} selected files · ${formatBytes(summary.bytes)}` : 'No game files selected';
  $('#selection-detail').textContent=summary.count ? [summary.hasExe?'Original game EXE selected':'Oblivion.exe is missing',summary.hasBink?'binkw32.dll selected':'binkw32.dll is missing',summary.hasMaster?'Master selected':'Master not selected',summary.archives+ ' BSA archives selected'].join(' · ') : 'Start with Oblivion.exe and its bundled DLLs for a small dependency probe.';
  $('#memory-ack-row').hidden=summary.bytes<=SIZE_ACK_BYTES;
  const error=budgetError(summary.bytes,mobile,$('#memory-ack').checked);
  $('#selection-error').textContent=error;
  $('#load-runtime').disabled=!state.authorized||!state.rootFile||state.loading||state.ready||state.failed;
  $('#pick-root').disabled=!state.authorized||state.loading||state.ready||state.failed;
  $('#clear-selection').disabled=state.started||!summary.count;
  $('#pick-files').disabled=!state.authorized||state.started;
  $('#pick-folder').disabled=!state.authorized||state.started;
  $('#check-install').disabled=!state.authorized||state.busy||state.started||!summary.hasExe;
  $('#steam-dlc').disabled=state.busy||state.started;
  for(const id of ['run-probe','load-runtime','pick-root','clear-selection','pick-files','pick-folder'])if(state.busy)$('#'+id).disabled=true;
  $('#install-readiness').textContent=check.completeCandidate?'Core Steam installation paths found. This does not verify gameplay.':check.missing.length+' required game paths missing. A dependency test is still available with an EXE.';
  $('#install-checks').replaceChildren();for(const [name,found]of check.checks){const row=document.createElement('li');row.className=found?'found':'missing';row.textContent=(found?'Found · ':'Missing · ')+name;$('#install-checks').appendChild(row);}
  $('#steam-exe').textContent=state.exeInfo?(state.exeInfo.knownSteamBuild?'Recognized Steam build · 1.2.0416 · Steam client not provided': 'Classic 32-bit EXE · checksum '+state.exeInfo.checksum)+(state.exeInfo.steamImports.length?' · Steam API dependency detected':''):'Executable build has not been checked yet.';
  $('#selection-list').replaceChildren();
  for(const record of [...staged.values()].slice(0,12)) {
    const row=document.createElement('li');row.textContent=record.path+' · '+formatBytes(record.file.size);$('#selection-list').appendChild(row);
  }
  if(summary.count>12){const row=document.createElement('li');row.textContent=`…and ${summary.count-12} more files`;$('#selection-list').appendChild(row);}
  refreshLaunch();
}
function stageFiles(files,folder=false) {
  if(!state.authorized||state.started||state.busy)return;
  try {
    const plan=planOblivionImport([...files]);
    if(folder&&!plan.records.some(r=>r.path.toLowerCase()==='/oblivion/oblivion.exe'))throw Error('Choose the full steamapps/common/Oblivion folder, including Oblivion.exe. Use Choose files for a partial dependency test.');
    const next=new Map(folder?[]:staged);for(const record of plan.records)next.set(record.path.toLowerCase(),record);
    if(next.size>12000)throw Error('This experiment accepts at most 12,000 game files.');
    staged.clear();for(const [key,record]of next)staged.set(key,record);state.exeInfo=null;
    $('#memory-ack').checked=false;
    announce('Steam selection staged. '+(plan.skipped?plan.skipped+' unrelated or installer files were skipped. ':'')+'Your game files have not been read into the engine.');refresh();
  }catch(error){announce(error.message,true);}
}
async function inspectSelection(){
  await assertGamePermission();await assertGamePermission('allowImports');
  const exe=[...staged.values()].find(r=>r.path.toLowerCase()==='/oblivion/oblivion.exe');
  if(!exe)throw Error('Choose the original Steam Oblivion.exe first.');
  state.exeInfo=await inspectSteamExecutable(exe.file);refresh();return state.exeInfo;
}
$('#check-install').addEventListener('click',async()=>{if(state.busy||state.started)return;state.busy=true;refresh();try{const exe=await inspectSelection();log('STEAM_EXE_CHECK '+JSON.stringify(exe));const check=steamInstallation(staged.values());announce((exe.knownSteamBuild?'The EXE matches the recognized Steam 1.2.0416 compatibility build. ':'Classic 32-bit EXE detected. ')+(check.missing.length?'Missing '+check.missing.length+' game paths; choose the full installed folder for a game test.':'Core installation paths were found; graphics and gameplay remain unverified.'));}catch(e){announce(e.message,true);}finally{state.busy=false;refresh();}});
$('#pick-files').addEventListener('click',()=>$('#file-picker').click());
$('#pick-folder').addEventListener('click',()=>$('#folder-picker').click());
$('#file-picker').addEventListener('change',event=>{stageFiles(event.target.files);event.target.value='';});
$('#folder-picker').addEventListener('change',event=>{stageFiles(event.target.files,true);event.target.value='';});
$('#pick-root').addEventListener('click',()=>$('#root-picker').click());
$('#root-picker').addEventListener('change',event=>{state.rootFile=event.target.files[0]||null;$('#root-summary').textContent=state.rootFile?state.rootFile.name+' · checksum checked when loading':'Wine system ZIP needed.';refresh();});
$('#memory-ack').addEventListener('change',refresh);
$('#clear-selection').addEventListener('click',()=>{staged.clear();state.exeInfo=null;refresh();announce('Selection cleared.');});
$('#reload-probe').addEventListener('click',()=>location.reload());
$('#download-log').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({application:'LiteOS Steam classic Oblivion experiment',steamAppId:22330,executable:state.exeInfo,compatibilityProfile:state.profileInfo,display:{...displayMonitor?.snapshot(),presentation:presentationBridge?.snapshot(),webglProbe:graphicsProbe},runtime:'BoxedWine ST-JIT bf831736',verifiedGameSupport:false,graphicsMode:state.headless?'loader-only-no-display':'webgl2',selection:stagedSummary(staged.values()),messages:state.log},null,2)],{type:'application/json'});
  if(parent!==window){parent.postMessage({type:'liteos:oblivion',action:'download',token:new URLSearchParams(location.search).get('token')||'',blob},location.origin);return;}
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='LiteOS-Oblivion-diagnostic.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
});
function loadScript(name) {
  return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(name,runtimeBase).href;script.onload=resolve;script.onerror=()=>reject(Error('Could not load the pinned browser engine: '+name));document.head.appendChild(script);});
}
function fail(error) {if(state.failed)return;state.failed=true;state.loading=false;state.launchIssue=String(error?.message||error);clearTimeout(preparationTimer);clearTimeout(launchTimer);rejectPreparation?.(error instanceof Error?error:Error(String(error)));if(state.started)parentMessage('stopped');announce('Browser engine error: '+state.launchIssue+'. Reload this experiment to retry.',true);log('ENGINE_ERROR '+state.launchIssue);refresh();}
function refreshLaunch(){
 const summary=stagedSummary(staged.values()),availability=launchAvailability({...state,hasExe:summary.hasExe,hasRoot:!!state.rootFile,memoryError:budgetError(summary.bytes,mobile,$('#memory-ack').checked),issue:state.launchIssue});
 $('#run-probe').disabled=!availability.enabled;$('#run-probe').textContent=availability.label;$('#launch-hint').textContent=availability.hint;
 $('#view-game').hidden=!state.loading&&!state.ready&&!state.started;
 const full=!!(document.fullscreenElement||document.webkitFullscreenElement||state.expanded);$('#fullscreen').textContent=full?'Exit fullscreen':'Fullscreen';$('#fullscreen').setAttribute('aria-pressed',String(full));document.body.classList.toggle('game-fullscreen',full&&(state.started||state.displayTest));refreshDisplay();
}
async function loadRuntime(){
 if(state.ready)return;if(preparation)return preparation;
 if(state.failed)throw Error('Reload this experiment before preparing the engine again.');
 if(!state.rootFile)throw Error('Choose the Wine system ZIP in Runtime setup first.');
 preparation=new Promise((resolve,reject)=>{resolvePreparation=resolve;rejectPreparation=reject;});preparation.catch(()=>{});
 state.loading=true;refresh();preparationTimer=setTimeout(()=>fail(Error('The engine did not finish preparing. Reload and retry, or check browser storage permissions.')),180000);
 initializeRuntime();return preparation;
}
async function initializeRuntime(){
  try {
    await assertGamePermission();
    await assertGamePermission('allowImports');
    if(typeof WebAssembly!=='object')throw Error('This browser does not support WebAssembly.');
    graphicsProbe=probeWebGL();const hasWebGL=graphicsProbe.available;if(graphicsProbe.error)log('WEBGL_PROBE '+graphicsProbe.error);
    state.headless=$('#loader-only').checked||!hasWebGL;
    $('#loader-only').checked=state.headless;$('#loader-only').disabled=true;
    if(!hasWebGL)log('GRAPHICS_NOTE: WebGL 2 is unavailable. Using the documented -novideo/-nosound CPU-only dependency probe; no game display or gameplay can be tested.');
    state.loading=true;refresh();$('#probe-runtime').hidden=false;
    announce('Verifying your local Wine system ZIP and loading the browser engine…');
    const rootBytes=await verifyWineRoot(state.rootFile);
    log('Loading pinned BoxedWine browser engine. No Windows PC or game streaming service is used.');
    await loadScript('fsfs.js');await loadScript('boxedwine-shell.js');
    presentationBridge=installPresentationBridge(Module,{canvas:$('#boxedwine-webgl-canvas-0'),onPresent:info=>displayMonitor.recordPresentation(info),onError:message=>{displayMonitor.recordPresentation(presentationBridge.snapshot());log('DISPLAY_ERROR '+message);}});displayMonitor.attachModule(Module);
    // Config.urlParams is the upstream shell's supported replacement parameter source.
    // Only fixed runtime options enter it; game filenames are passed through FS below.
    Config.urlParams=new URLSearchParams({root:'wine-root.zip',rootBase:runtimeBase.href,auto:'false',storage:'memory',rootfs:'memory',desktop:'false',registry:state.headless?'gdi,winxp':'gl,winxp','wine-override':'nomono',resolution:'640x480',bpp:'32',sound:state.headless?'false':'true',audioBackend:'sdl'}).toString();
    loadFile=localRootLoader(loadFile,'wine-root.zip',rootBytes);
    // Options must precede /bin/wine; later strings are guest-program arguments.
    const originalParams=getEmulatorParams;getEmulatorParams=function(){const values=originalParams();return state.headless?['-novideo','-nosound',...values]:values;};
    const originalReady=buildBrowserFileSystem;
    buildBrowserFileSystem=function(){originalReady();if(state.failed)return;try{if(FS.stat('/'+Config.rootZipFile).size!==rootBytes.length)throw Error('Wine system files could not be prepared in browser memory.');state.ready=true;state.loading=false;clearTimeout(preparationTimer);announce(state.headless?'CPU-only engine prepared. This mode has no game graphics or audio.':'Browser engine prepared. Start game is ready.');log('ENGINE_PREPARED: Wine root loaded; guest program has not started.');resolvePreparation();refresh();}catch(error){fail(error);}};
    const previousArchiveFailure=failArchiveSetup;failArchiveSetup=function(error){previousArchiveFailure(error);fail(error);};
    const previousPrint=Module.print,previousErr=Module.printErr;
    Module.print=(...args)=>{previousPrint?.(...args);log(args.join(' '));};
    Module.printErr=(...args)=>{previousErr?.(...args);log(args.join(' '));};
    const previousInitialized=Module.onRuntimeInitialized;Module.onRuntimeInitialized=()=>{previousInitialized?.();state.coreStarted=true;clearTimeout(launchTimer);log('WINE_RUNTIME_STARTED: guest output follows.');refreshLaunch();};
    const previousAbort=Module.onAbort;Module.onAbort=reason=>{previousAbort?.(reason);fail(Error(String(reason)));};
    // ST-JIT resolves its binary beside the retained engine JS, never from game paths.
    Module.locateFile=(filename)=>new URL(filename,runtimeBase).href;
    $('#dropzone').addEventListener('drop',event=>{event.preventDefault();event.stopImmediatePropagation();announce('Use the file or folder picker above so the memory limit is checked.',true);},true);
    $('#canvas').addEventListener('contextmenu',event=>event.preventDefault());
    $('#showConsole').addEventListener('change',()=>toggleConsole());
    await loadScript('boxedwine.js');
  }catch(error){fail(error);}
}
$('#load-runtime').addEventListener('click',async()=>{if(state.busy||state.started)return;try{await loadRuntime();}catch(error){if(!state.failed)fail(error);}});
$('#run-probe').addEventListener('click',async()=>{
  if(!state.authorized||state.started||state.failed||state.busy||state.loading)return;
  const summary=stagedSummary(staged.values()),error=budgetError(summary.bytes,mobile,$('#memory-ack').checked);
  if(error||!summary.hasExe){announce(error||'Select the original Oblivion.exe first.',true);return;}
  state.busy=true;state.launchIssue=null;state.displayTest=false;displayMonitor.showTest(false);displayMonitor.recordError('');$('#test-display').textContent='Test display';refresh();
  try {
    await inspectSelection();await loadRuntime();
    state.started=true;parentMessage('running');refresh();announce('Importing selected game files into browser memory…');
    let sinceYield=performance.now();
    for(const [index,record] of [...staged.values()].entries()) {
      const target='/d_drive'+record.path;FS.mkdirTree(target.slice(0,target.lastIndexOf('/')));
      FS.writeFile(target,new Uint8Array(await record.file.arrayBuffer()));
      announce(`Imported ${index+1} of ${summary.count}: ${record.file.name}`);
      if(performance.now()-sinceYield>80){await new Promise(resolve=>setTimeout(resolve,0));sinceYield=performance.now();}
    }
    state.profileInfo=await prepareSteamProfile(FS,staged.values(),{headless:state.headless,enableDlc:$('#steam-dlc').checked});
    Config.registryCommands.push(state.profileInfo.registryCommand);
    log('STEAM_PROFILE '+JSON.stringify(state.profileInfo));log('SELECTION_IMPORTED '+JSON.stringify(summary));
    if(!summary.hasBink)log('DEPENDENCY_NOTE: binkw32.dll was not selected; a Wine loader error is expected.');
    if(!summary.hasMaster||!summary.archives)log('DATA_NOTE: incomplete game data; process startup is not proof of gameplay.');
    announce(state.headless?'Starting a CPU-only dependency test. Graphics and gameplay cannot be tested in this mode.':'Starting Oblivion inside Wine. See the game display below.');
    launchTimer=setTimeout(()=>fail(Error('Wine did not finish starting. Check the diagnostic log, then reload to retry.')),180000);
    $('#probe-runtime').scrollIntoView({block:'start',behavior:'smooth'});
    execute('/Oblivion/Oblivion.exe');
  }catch(error){if(!state.failed)fail(error);}finally{state.busy=false;refresh();}
});
$('#view-game').addEventListener('click',()=>$('#probe-runtime').scrollIntoView({block:'start',behavior:'smooth'}));
$('#fullscreen').addEventListener('click',async()=>{
 if(fullscreenPending)return;fullscreenPending=true;
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else if(document.webkitFullscreenElement)document.webkitExitFullscreen();
  else if(state.expanded){state.expanded=false;parentMessage('restore-window');}
  else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});
  else if(document.documentElement.webkitRequestFullscreen)document.documentElement.webkitRequestFullscreen();
  else{state.expanded=true;parentMessage('expand-window');announce('This browser uses an expanded LiteOS game view. Tap Exit fullscreen to restore.');}
 }catch(error){log('FULLSCREEN_UNAVAILABLE '+(error?.message||error));if(parent!==window){state.expanded=true;parentMessage('expand-window');announce('Expanded the LiteOS game window. Browser fullscreen was unavailable.');}else announce('Fullscreen is unavailable in this browser: '+error.message,true);}
 fullscreenPending=false;refreshLaunch();
});
for(const name of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(name,refreshLaunch);
addEventListener('error',event=>{if((state.loading||state.started)&&!String(event.filename||'').startsWith('chrome-extension:')){log('RUNTIME_EXCEPTION '+(event.error?.stack||`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`));fail(event.error||Error(event.message||'A browser engine script stopped.'));}});
addEventListener('unhandledrejection',event=>{if(state.loading||state.started)fail(event.reason instanceof Error?event.reason:Error(String(event.reason)));});
function scheduleDisplay(){if(displayUpdateTimer)return;displayUpdateTimer=setTimeout(()=>{displayUpdateTimer=null;refreshDisplay();},250);}
function refreshDisplay(){
 if(!displayMonitor)return;$('#loading').hidden=!state.loading&&!state.ready&&!state.started;$('#controls').hidden=!state.ready&&!state.started;
 const info=displayMonitor.snapshot();if(presentationBridge){const actual=presentationBridge.snapshot();for(const key of ['softwareFrames','bitmapFrames','droppedFrames'])info[key]=actual[key];}const error=info.contextLost?'The browser lost the graphics context. Reload the experiment.':info.lastError||state.launchIssue;
 $('#display-status').textContent=displaySummary(info,state);$('#display-error').hidden=!error;$('#display-error').textContent=error||'';
 $('#display-metrics').textContent=`Canvas ${info.canvasBuffer.join(' × ')} pixels · Visible ${info.canvasDisplay.join(' × ')} · Main context ${info.mainContext||'not created'} · Overlay ${info.overlayContext||'not created'} / ${info.overlayVisibility} · Submissions ${info.softwareFrames} software, ${info.bitmapFrames} bitmap · Dropped ${info.droppedFrames} · Callbacks ${info.softwareCallbacks} software, ${info.bitmapCallbacks} bitmap`+(info.contextErrors.length?' · Context attempts unavailable: '+info.contextErrors.join(', '):'');
 $('#display-message').hidden=state.displayTest||(!state.headless&&!info.contextLost);$('#display-message').textContent=info.contextLost?'The graphics context was lost. Reload the experiment before restarting.':'Graphics are disabled in dependency-only mode. This mode can test loading, but cannot display Oblivion.';
}
displayMonitor=createDisplayDiagnostics({canvas:$('#canvas'),overlay:$('#boxedwine-webgl-canvas-0'),testCanvas:$('#display-test'),onChange:scheduleDisplay});
$('#test-display').addEventListener('click',()=>{try{state.displayTest=!state.displayTest;if(state.displayTest&&document.pointerLockElement)document.exitPointerLock();displayMonitor.showTest(state.displayTest);$('#test-display').textContent=state.displayTest?'Back to game':'Test display';$('#probe-runtime').hidden=false;refreshLaunch();$('#probe-runtime').scrollIntoView({block:'start',behavior:'smooth'});}catch(error){state.displayTest=false;displayMonitor.showTest(false);displayMonitor.recordError(error.message);$('#test-display').textContent='Test display';$('#probe-runtime').hidden=false;log('DISPLAY_TEST_ERROR '+error.message);announce(error.message,true);refreshLaunch();}});
$('#report-steam-error').addEventListener('click',()=>{log('USER_REPORTED Application load error 5:0000065434');refreshLaunch();});
$('#display-layer').addEventListener('change',event=>{displayMonitor.setLayer(event.target.value);refreshDisplay();});
log('Experimental Steam classic compatibility profile. No verified Oblivion gameplay support.');refresh();

function parentMessage(action){if(parent!==window)parent.postMessage({type:'liteos:oblivion',action,token:new URLSearchParams(location.search).get('token')||''},location.origin);}
let lastActivity=0;for(const type of ['pointerdown','keydown'])addEventListener(type,()=>{if(Date.now()-lastActivity>1000){lastActivity=Date.now();parentMessage('activity');}},true);
assertGamePermission().then(()=>{state.authorized=true;refresh();}).catch(e=>{state.authorized=false;refresh();announce(e.message,true);});

addEventListener('storage',async event=>{if(event.key==='liteos.storage-cleared'){location.reload();return;}if(event.key==='liteos.profile-update')try{await assertGamePermission();}catch(e){if(state.started)location.reload();else{state.authorized=false;refresh();announce(e.message,true);}}});
