// Classic Steam app 22330. No Steam authentication or executable changes.
export const STEAM_APP_ID=22330;
export const BASE_ARCHIVES=['Oblivion - Meshes.bsa','Oblivion - Textures - Compressed.bsa','Oblivion - Misc.bsa','Oblivion - Sounds.bsa','Oblivion - Voices1.bsa','Oblivion - Voices2.bsa'];
const DLC=['DLCShiveringIsles.esp','DLCHorseArmor.esp','DLCOrrery.esp','DLCVileLair.esp','DLCMehrunesRazor.esp','DLCSpellTomes.esp','DLCThievesDen.esp','DLCBattlehornCastle.esp','DLCFrostcrag.esp','Knights.esp'];
export function steamInstallation(records){
 const list=[...records],names=new Set(list.filter(r=>r.file.size>0).map(r=>r.path.toLowerCase()));
 const checks=[['Oblivion.exe',names.has('/oblivion/oblivion.exe')],['binkw32.dll',names.has('/oblivion/binkw32.dll')],['Data/Oblivion.esm',names.has('/oblivion/data/oblivion.esm')],...BASE_ARCHIVES.map(name=>['Data/'+name,names.has('/oblivion/data/'+name.toLowerCase())]),['Data/Shaders',list.some(r=>/^\/oblivion\/data\/shaders\/.+\.sdp$/i.test(r.path)&&r.file.size>0)]];
 return {checks,missing:checks.filter(c=>!c[1]).map(c=>c[0]),completeCandidate:checks.every(c=>c[1]),dlc:DLC.filter(name=>names.has('/oblivion/data/'+name.toLowerCase())),hasDefaults:names.has('/oblivion/oblivion_default.ini')};
}
export function adler32(bytes){let a=1,b=0;for(let at=0;at<bytes.length;){const end=Math.min(at+5552,bytes.length);for(;at<end;at++){a+=bytes[at];b+=a;}a%=65521;b%=65521;}return ((b<<16)|a)>>>0;}
export function inspectPEBytes(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),need=(at,n)=>{if(!Number.isSafeInteger(at)||at<0||at+n>bytes.length)throw Error('The selected EXE has an incomplete PE header.');};
 need(0,64);if(view.getUint16(0,true)!==0x5a4d)throw Error('Choose the original Windows Oblivion.exe.');const pe=view.getUint32(60,true);need(pe,24);if(view.getUint32(pe,true)!==0x4550)throw Error('The selected file is not a Windows PE executable.');
 const count=view.getUint16(pe+6,true),optionalSize=view.getUint16(pe+20,true),optional=pe+24;need(optional,optionalSize);if(view.getUint16(pe+4,true)!==0x14c||view.getUint16(optional,true)!==0x10b)throw Error('This preset requires the classic 32-bit x86 EXE. A 64-bit or Remastered EXE cannot use it.');if(count>96||optionalSize<112)throw Error('The selected EXE has an unsupported PE layout.');
 const sectionAt=optional+optionalSize;need(sectionAt,count*40);const sections=[];for(let i=0;i<count;i++){const at=sectionAt+i*40;sections.push({name:new TextDecoder().decode(bytes.subarray(at,at+8)).replace(/\0.*$/s,''),virtualSize:view.getUint32(at+8,true),rva:view.getUint32(at+12,true),size:view.getUint32(at+16,true),offset:view.getUint32(at+20,true)});}
 const offsetOf=rva=>{const section=sections.find(s=>rva>=s.rva&&rva<s.rva+s.size);if(!section)throw Error('The selected EXE has an invalid import address.');return section.offset+rva-section.rva;};
 const imports=[],importRva=view.getUint32(optional+104,true);if(importRva){let terminated=false;for(let i=0;i<256;i++){const at=offsetOf(importRva+i*20);need(at,20);if(!view.getUint32(at,true)&&!view.getUint32(at+12,true)&&!view.getUint32(at+16,true)){terminated=true;break;}const nameAt=offsetOf(view.getUint32(at+12,true));let end=nameAt;while(end<bytes.length&&end<nameAt+256&&bytes[end])end++;if(end===bytes.length||end===nameAt+256)throw Error('The selected EXE has an invalid DLL name.');const name=new TextDecoder().decode(bytes.subarray(nameAt,end));if(!/^[a-z0-9_.-]+$/i.test(name))throw Error('The selected EXE has an invalid DLL name.');imports.push(name.toLowerCase());}if(!terminated)throw Error('The EXE import table is too large.');}
 const checksum=adler32(bytes).toString(16).padStart(8,'0').toUpperCase();
 // xOBSE EXEChecksum.cpp recognizes this unmodified Steam compatibility build.
 return {architecture:'x86',checksum,knownSteamBuild:checksum==='A2408F04',steamImports:imports.filter(name=>/^(steam_api|steamclient)(64)?\.dll$/i.test(name)),imports,hasSteamSection:sections.some(s=>s.name==='.bind')};
}
export async function inspectSteamExecutable(file){if(!file||file.size<64||file.size>32*1024*1024)throw Error('Choose the original classic Oblivion.exe (up to 32 MB).');return inspectPEBytes(new Uint8Array(await file.arrayBuffer()));}
export function patchIni(source,updates){const lines=String(source).replace(/^\uFEFF/,'').split(/\r?\n/);for(const [section,values]of Object.entries(updates)){let start=lines.findIndex(line=>line.trim().toLowerCase()==='['+section.toLowerCase()+']');if(start<0){if(Object.values(values).every(value=>value===null))continue;lines.push('','['+section+']');start=lines.length-1;}let end=start+1;while(end<lines.length&&!/^\s*\[/.test(lines[end]))end++;for(const [key,value]of Object.entries(values)){const matches=[];for(let at=start+1;at<end;at++)if(lines[at].split('=')[0].trim().toLowerCase()===key.toLowerCase())matches.push(at);if(value===null){for(const at of matches.reverse()){lines.splice(at,1);end--;}continue;}if(matches.length){lines[matches[0]]=key+'='+value;for(const at of matches.slice(1).reverse()){lines.splice(at,1);end--;}}else{lines.splice(end,0,key+'='+value);end++;}}}return lines.join('\r\n');}
export function classicRegistry(){return 'Windows Registry Editor Version 5.00\r\n\r\n'+[
 ['HKEY_LOCAL_MACHINE\\Software\\Bethesda Softworks\\Oblivion',{'Installed Path':'D:\\Oblivion\\'}],
 ['HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders',{Personal:'D:\\LiteOSProfile\\Documents',AppData:'D:\\LiteOSProfile\\AppData\\Roaming','Local AppData':'D:\\LiteOSProfile\\AppData\\Local'}],
 ['HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders',{Personal:'D:\\LiteOSProfile\\Documents',AppData:'D:\\LiteOSProfile\\AppData\\Roaming','Local AppData':'D:\\LiteOSProfile\\AppData\\Local'}],
 ['HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides',{d3d9:'builtin'}]
 ].map(([key,values])=>'['+key+']\r\n'+Object.entries(values).map(([k,v])=>'"'+k+'"="'+v.replaceAll('\\','\\\\')+'"').join('\r\n')).join('\r\n\r\n')+'\r\n';}
export async function prepareSteamProfile(fs,records,{headless=false,enableDlc=true}={}){
 const list=[...records],check=steamInstallation(list),defaults=list.find(r=>r.path.toLowerCase()==='/oblivion/oblivion_default.ini');if(defaults?.file.size>2*1024*1024)throw Error('Oblivion_default.ini exceeds the 2 MB configuration limit.');
 const source=defaults?await defaults.file.text():'[General]\r\nsLanguage=ENGLISH\r\n',present=new Map(list.map(r=>[r.path.toLowerCase(),r.path.split('/').at(-1)]));
 const archiveList=BASE_ARCHIVES.map(name=>present.get('/oblivion/data/'+name.toLowerCase())).filter(Boolean);
 // Exact key/section pairs are present in the original 1.2.0416 EXE.
 // HDR belongs to BlurShaderHDR; the fullscreen key contains a space.
 const ini=patchIni(source,{General:{SLocalSavePath:'Saves\\',SCreditsMenuMovie:'',SMainMenuMovieIntro:'',SMainMenuMovie:'',SIntroSequence:''},Display:{bFullScreen:null,bDoHighDynamicRange:null,'bFull Screen':0,'iSize W':640,'iSize H':480,iAdapter:0,iMultiSample:0,bUseRefractionShader:0,bAllow30Shaders:0,bForce1XShaders:0,'bUse Shaders':1},BlurShaderHDR:{bDoHighDynamicRange:0},BlurShader:{bUseBlurShader:0},Water:{bUseWaterReflections:0},Audio:headless?{bSoundEnabled:0,bMusicEnabled:0}:{},Archive:archiveList.length?{sArchiveList:archiveList.join(', ')}:{}});
 const plugins=['Oblivion.esm',...(enableDlc?check.dlc:[])];
 const write=(path,bytes)=>{fs.mkdirTree(path.slice(0,path.lastIndexOf('/')));fs.writeFile(path,bytes);};
 write('/d_drive/LiteOSProfile/Documents/My Games/Oblivion/Oblivion.ini',ini);
 write('/d_drive/LiteOSProfile/AppData/Local/Oblivion/Plugins.txt',plugins.join('\r\n')+'\r\n');
 fs.mkdirTree('/d_drive/LiteOSProfile/AppData/Roaming');fs.mkdirTree('/d_drive/LiteOSProfile/Documents/My Games/Oblivion/Saves');
 const registry=classicRegistry(),bytes=new Uint8Array(2+registry.length*2),view=new DataView(bytes.buffer);view.setUint16(0,0xfeff,true);for(let i=0;i<registry.length;i++)view.setUint16(2+i*2,registry.charCodeAt(i),true);write('/d_drive/LiteOSProfile/install.reg',bytes);
 return {registryCommand:['reg','import','D:\\LiteOSProfile\\install.reg'],plugins,usedGameDefaults:!!defaults,resolution:'640 × 480',graphicsPreset:'windowed-hdr-off-bloom-off-sm3-off',startupMovies:false,documents:'D:\\LiteOSProfile\\Documents\\My Games\\Oblivion'};
}
export function classifyWineLine(line){
 const loadError=String(line).match(/application\s+load\s+error\s+(\d+:\d+)/i);
 if(loadError)return {kind:'steam-client',code:loadError[1],message:'Steam application load error '+loadError[1]+'. This installation could not start with Steam in the browser session. LiteOS does not provide a signed-in Steam client. Steam running on your Windows PC is outside this session. Launch this Steam installation through Steam on Windows; changing display settings or importing the same files again does not provide its Steam startup requirements.'};
 const missing=String(line).match(/import_dll Library (.+?) \(which is needed/);if(missing)return {kind:'dependency',message:'Windows loader stopped: '+missing[1]+'. Select that original DLL from your installed game and reload. In Steam, Properties → Installed Files → Verify integrity can repair missing game files.'};
 if(/(?:steam.*(?:must be running|not running|failed to initialize)|SteamAPI_Init.*fail|failed.*(?:steamclient|steam_api)|application load error)/i.test(line))return {kind:'steam-client',message:'This build requested Steam client services. Importing a game folder does not provide an authenticated Steam client inside the browser. Gameplay remains unverified.'};
 if(/(?:failed to create.*(?:d3d|direct3d)|wined3d.*(?:unsupported|failed)|no suitable.*(?:graphics|adapter))/i.test(line))return {kind:'graphics',message:'The game reached graphics initialization, but the experimental DirectX 9 browser path failed. Keep the diagnostic log; gameplay is unverified.'};
 return null;
}
