import {assertGamePermission} from '/heroes3/profile-access.js';
import {verifyWineRoot,localRootLoader} from './root-loader.js';
import {normalizeOblivionPath,stagedSummary,budgetError,SIZE_ACK_BYTES} from './probe-files.js';
const $ = selector => document.querySelector(selector);
const staged = new Map();
const state = {authorized:false,loading:false,ready:false,started:false,failed:false,headless:false,rootFile:null,log:[]};
const mobile = matchMedia('(pointer: coarse)').matches && innerWidth < 1100;
const runtimeBase = new URL('./runtime/', location.href);

function log(value) {
  const line = typeof value === 'string' ? value : String(value);
  state.log.push(line.slice(0,8000));
  if (state.log.length > 500) state.log.splice(0,state.log.length-500);
  $('#probe-log').textContent = state.log.join('\n');
  $('#probe-log').scrollTop = $('#probe-log').scrollHeight;
  const missing=line.match(/import_dll Library (.+?) \(which is needed/);
  if(missing)announce('Windows loader stopped: '+missing[1]+'. Include that DLL from your installed original game, then reload this experiment. Gameplay remains unverified.',true);
}
function announce(message,error=false) { $('#probe-status').textContent=message;$('#probe-status').classList.toggle('error',error); }
function formatBytes(value) { return value < 1024*1024 ? (value/1024).toFixed(1)+' KB' : value < 1024**3 ? (value/1024**2).toFixed(1)+' MB' : (value/1024**3).toFixed(2)+' GB'; }
function refresh() {
  const summary=stagedSummary(staged.values());
  $('#selection-summary').textContent=summary.count ? `${summary.count} selected files · ${formatBytes(summary.bytes)}` : 'No game files selected';
  $('#selection-detail').textContent=summary.count ? [summary.hasExe?'Original game EXE selected':'Oblivion.exe is missing',summary.hasBink?'binkw32.dll selected':'binkw32.dll is missing',summary.hasMaster?'Master selected':'Master not selected',summary.archives+ ' BSA archives selected'].join(' · ') : 'Start with Oblivion.exe and its bundled DLLs for a small dependency probe.';
  $('#memory-ack-row').hidden=summary.bytes<=SIZE_ACK_BYTES;
  const error=budgetError(summary.bytes,mobile,$('#memory-ack').checked);
  $('#selection-error').textContent=error;
  $('#run-probe').disabled=!state.authorized||!state.ready||state.started||state.failed||!summary.hasExe||!!error;
  $('#load-runtime').disabled=!state.authorized||!state.rootFile||state.loading||state.ready||state.failed;
  $('#pick-root').disabled=!state.authorized||state.loading||state.ready||state.failed;
  $('#clear-selection').disabled=state.started||!summary.count;
  $('#pick-files').disabled=!state.authorized||state.started;
  $('#pick-folder').disabled=!state.authorized||state.started;
  $('#selection-list').replaceChildren();
  for(const record of [...staged.values()].slice(0,12)) {
    const row=document.createElement('li');row.textContent=record.path+' · '+formatBytes(record.file.size);$('#selection-list').appendChild(row);
  }
  if(summary.count>12){const row=document.createElement('li');row.textContent=`…and ${summary.count-12} more files`;$('#selection-list').appendChild(row);}
}
function stageFiles(files) {
  if(!state.authorized||state.started)return;
  try {
    const incoming=[...files];
    if(staged.size+incoming.length>12000)throw Error('This probe accepts at most 12,000 selected files.');
    const additions=incoming.map(file=>({file,path:normalizeOblivionPath(file.webkitRelativePath||file.name)}));
    for(const record of additions)staged.set(record.path,record);
    $('#memory-ack').checked=false;
    announce('Selection staged. No game bytes have been imported into the engine.');refresh();
  }catch(error){announce(error.message,true);}
}
$('#pick-files').addEventListener('click',()=>$('#file-picker').click());
$('#pick-folder').addEventListener('click',()=>$('#folder-picker').click());
$('#file-picker').addEventListener('change',event=>{stageFiles(event.target.files);event.target.value='';});
$('#folder-picker').addEventListener('change',event=>{stageFiles(event.target.files);event.target.value='';});
$('#pick-root').addEventListener('click',()=>$('#root-picker').click());
$('#root-picker').addEventListener('change',event=>{state.rootFile=event.target.files[0]||null;$('#root-summary').textContent=state.rootFile?state.rootFile.name+' · checksum checked when loading':'Wine system ZIP needed.';refresh();});
$('#memory-ack').addEventListener('change',refresh);
$('#clear-selection').addEventListener('click',()=>{staged.clear();refresh();announce('Selection cleared.');});
$('#reload-probe').addEventListener('click',()=>location.reload());
$('#download-log').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({application:'LiteOS Oblivion dependency probe',runtime:'BoxedWine ST-JIT bf831736',verifiedGameSupport:false,graphicsMode:state.headless?'loader-only-no-display':'webgl2',selection:stagedSummary(staged.values()),messages:state.log},null,2)],{type:'application/json'});
  if(parent!==window){parent.postMessage({type:'liteos:oblivion',action:'download',token:new URLSearchParams(location.search).get('token')||'',blob},location.origin);return;}
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='LiteOS-Oblivion-diagnostic.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
});
function loadScript(name) {
  return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(name,runtimeBase).href;script.onload=resolve;script.onerror=()=>reject(Error('Could not load the pinned browser engine: '+name));document.head.appendChild(script);});
}
function fail(error) { state.failed=true;state.loading=false;announce('Browser engine error: '+(error?.message||error)+'. Reload this probe to retry.',true);log('ENGINE_ERROR '+(error?.message||error));refresh(); }
$('#load-runtime').addEventListener('click',async()=>{
  if(!state.authorized||!state.rootFile||state.loading||state.ready||state.failed)return;
  try {
    await assertGamePermission();
    await assertGamePermission('allowImports');
    if(typeof WebAssembly!=='object')throw Error('This browser does not support WebAssembly.');
    const canvas=document.createElement('canvas'),hasWebGL=!!canvas.getContext('webgl2');
    state.headless=$('#loader-only').checked||!hasWebGL;
    $('#loader-only').checked=state.headless;$('#loader-only').disabled=true;
    if(!hasWebGL)log('GRAPHICS_NOTE: WebGL 2 is unavailable. Using the documented -novideo/-nosound CPU-only dependency probe; no game display or gameplay can be tested.');
    state.loading=true;refresh();$('#probe-runtime').hidden=false;
    announce('Verifying your local Wine system ZIP and loading the browser engine…');
    const rootBytes=await verifyWineRoot(state.rootFile);
    log('Loading pinned BoxedWine browser engine. No Windows PC or game streaming service is used.');
    await loadScript('fsfs.js');await loadScript('boxedwine-shell.js');
    // Config.urlParams is the upstream shell's supported replacement parameter source.
    // Only fixed runtime options enter it; game filenames are passed through FS below.
    Config.urlParams=new URLSearchParams({root:'wine-root.zip',rootBase:runtimeBase.href,auto:'false',storage:'memory',rootfs:'memory',desktop:'false',registry:state.headless?'gdi,winxp':'gl,winxp','wine-override':'nomono',resolution:'640x480',bpp:'32',sound:state.headless?'false':'true',audioBackend:'sdl'}).toString();
    loadFile=localRootLoader(loadFile,'wine-root.zip',rootBytes);
    // Options must precede /bin/wine; later strings are guest-program arguments.
    const originalParams=getEmulatorParams;getEmulatorParams=function(){const values=originalParams();return state.headless?['-novideo','-nosound',...values]:values;};
    const originalReady=buildBrowserFileSystem;
    buildBrowserFileSystem=function(){originalReady();state.ready=true;state.loading=false;announce(state.headless?'CPU-only browser engine prepared. The dependency probe will have no graphics or audio.':'Browser engine prepared. Run the dependency probe when your selected files are ready.');log('ENGINE_PREPARED: Wine root loaded; guest program has not started.');refresh();};
    const previousArchiveFailure=failArchiveSetup;failArchiveSetup=function(error){previousArchiveFailure(error);fail(error);};
    const previousPrint=Module.print,previousErr=Module.printErr;
    Module.print=(...args)=>{previousPrint?.(...args);log(args.join(' '));};
    Module.printErr=(...args)=>{previousErr?.(...args);log(args.join(' '));};
    const previousAbort=Module.onAbort;Module.onAbort=reason=>{previousAbort?.(reason);fail(Error(String(reason)));};
    // ST-JIT resolves its binary beside the retained engine JS, never from game paths.
    Module.locateFile=(filename)=>new URL(filename,runtimeBase).href;
    $('#dropzone').addEventListener('drop',event=>{event.preventDefault();event.stopImmediatePropagation();announce('Use the file or folder picker above so the memory limit is checked.',true);},true);
    $('#canvas').addEventListener('contextmenu',event=>event.preventDefault());
    $('#showConsole').addEventListener('change',()=>toggleConsole());
    await loadScript('boxedwine.js');
  }catch(error){fail(error);}
});
$('#run-probe').addEventListener('click',async()=>{
  if(!state.authorized||!state.ready||state.started||state.failed)return;
  const summary=stagedSummary(staged.values()),error=budgetError(summary.bytes,mobile,$('#memory-ack').checked);
  if(error||!summary.hasExe){announce(error||'Select the original Oblivion.exe first.',true);return;}
  try{await assertGamePermission();await assertGamePermission('allowImports');}catch(e){announce(e.message,true);return;}
  state.started=true;parentMessage('running');refresh();announce('Importing explicitly selected files into temporary browser memory…');
  try {
    for(const [index,record] of [...staged.values()].entries()) {
      const target='/d_drive'+record.path;FS.mkdirTree(target.slice(0,target.lastIndexOf('/')));
      FS.writeFile(target,new Uint8Array(await record.file.arrayBuffer()));
      announce(`Imported ${index+1} of ${summary.count}: ${record.file.name}`);
    }
    log('SELECTION_IMPORTED '+JSON.stringify(summary));
    if(!summary.hasBink)log('DEPENDENCY_NOTE: binkw32.dll was not selected; a Wine loader error is expected.');
    if(!summary.hasMaster||!summary.archives)log('DATA_NOTE: the complete game data has not been supplied. Process startup is not proof of playable Oblivion.');
    announce(state.headless?'Starting the actual EXE in CPU-only dependency mode. No graphics, audio or gameplay support is being tested.':'Starting the actual EXE inside BoxedWine. Results remain unverified until gameplay is tested.');
    execute('/Oblivion/Oblivion.exe');
  }catch(error){fail(error);}
});
log('Experimental dependency probe. No verified Oblivion gameplay support.');refresh();

function parentMessage(action){if(parent!==window)parent.postMessage({type:'liteos:oblivion',action,token:new URLSearchParams(location.search).get('token')||''},location.origin);}
let lastActivity=0;for(const type of ['pointerdown','keydown'])addEventListener(type,()=>{if(Date.now()-lastActivity>1000){lastActivity=Date.now();parentMessage('activity');}},true);
assertGamePermission().then(()=>{state.authorized=true;refresh();}).catch(e=>{state.authorized=false;refresh();announce(e.message,true);});

addEventListener('storage',async event=>{if(event.key==='liteos.storage-cleared'){location.reload();return;}if(event.key==='liteos.profile-update')try{await assertGamePermission();}catch(e){if(state.started)location.reload();else{state.authorized=false;refresh();announce(e.message,true);}}});
