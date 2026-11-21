import test from 'node:test';
import assert from 'node:assert/strict';
import {planOblivionImport} from '../public/oblivion/probe-files.js';
import {BASE_ARCHIVES,steamInstallation,inspectPEBytes,adler32,prepareSteamProfile,patchIni,classifyWineLine} from '../public/oblivion/steam-profile.js';
import {launchAvailability} from '../public/oblivion/launch-state.js';
const file=(path,text='fixture')=>Object.assign(new Blob([text]),{name:path.split('/').at(-1),webkitRelativePath:path});
const steamFiles=()=>['Oblivion.exe','binkw32.dll','Oblivion_default.ini','Data/Oblivion.esm',...BASE_ARCHIVES.map(n=>'Data/'+n),'Data/Shaders/shaderpackage001.sdp','Data/Video/intro.bik','Data/Music/Explore/song.mp3','Data/Knights.esp','Data/Knights.bsa'].map(p=>file('SteamLibrary/steamapps/common/Oblivion/'+p));
test('Steam folder selection preserves loose assets and isolates one game subtree',()=>{
 const input=[...steamFiles(),file('SteamLibrary/config/loginusers.vdf'),file('SteamLibrary/steamapps/common/AnotherGame/a.bin'),file('SteamLibrary/steamapps/common/Oblivion/_CommonRedist/DirectX/setup.exe')],plan=planOblivionImport(input);
 assert.equal(plan.root,'SteamLibrary/steamapps/common/Oblivion');assert.equal(plan.skipped,3);
 assert.ok(plan.records.some(r=>r.path==='/Oblivion/Data/Shaders/shaderpackage001.sdp'));
 assert.ok(plan.records.some(r=>r.path==='/Oblivion/Data/Video/intro.bik'));
 assert.ok(!plan.records.some(r=>/loginusers|AnotherGame|CommonRedist/.test(r.path)));
 for(const record of plan.records)assert.ok(input.includes(record.file),'original selected file object is retained');
 assert.throws(()=>planOblivionImport([...input,file('Backup/Oblivion.exe')]),/Several/);
});
test('partial Steam selections canonicalize standalone data and reject unsafe or ambiguous paths',()=>{
 const plan=planOblivionImport([file('Oblivion.exe'),file('Oblivion(1).esm'),file('Oblivion - Misc.bsa'),file('binkw32.dll')]);
 assert.ok(plan.records.some(r=>r.path==='/Oblivion/Data/Oblivion.esm'));
 assert.ok(plan.records.some(r=>r.path==='/Oblivion/Data/Oblivion - Misc.bsa'));
 assert.throws(()=>planOblivionImport([file('../private.txt')]),/Invalid/);
 assert.throws(()=>planOblivionImport([file('Data/a.txt'),file('data/A.txt')]),/Duplicate/);
 assert.throws(()=>planOblivionImport([file('OblivionRemastered/OblivionRemastered.exe')]),/Remastered/);
});
test('Steam game checklist needs the actual base archives and shaders without inventing a Steam API dependency',()=>{
 const check=steamInstallation(planOblivionImport(steamFiles()).records);assert.equal(check.completeCandidate,true);assert.deepEqual(check.dlc,['Knights.esp']);assert.equal(check.hasDefaults,true);
 const partial=steamInstallation(planOblivionImport([file('Oblivion.exe'),file('Oblivion(1).esm')]).records);assert.equal(partial.completeCandidate,false);assert.ok(partial.missing.includes('binkw32.dll'));assert.ok(!partial.missing.includes('steam_api.dll'));
});
function mockPE(){const bytes=new Uint8Array(1024),v=new DataView(bytes.buffer);v.setUint16(0,0x5a4d,true);v.setUint32(60,0x80,true);v.setUint32(0x80,0x4550,true);v.setUint16(0x84,0x14c,true);v.setUint16(0x86,1,true);v.setUint16(0x94,0xe0,true);v.setUint16(0x98,0x10b,true);v.setUint32(0x98+104,0x1000,true);const section=0x98+0xe0;bytes.set(new TextEncoder().encode('.rdata'),section);v.setUint32(section+8,0x200,true);v.setUint32(section+12,0x1000,true);v.setUint32(section+16,0x200,true);v.setUint32(section+20,0x200,true);v.setUint32(0x20c,0x1050,true);bytes.set(new TextEncoder().encode('binkw32.dll'),0x250);return bytes;}
test('classic EXE inspection bounds PE addresses and reads real import tables without patching bytes',()=>{
 const bytes=mockPE(),before=bytes.slice(),r=inspectPEBytes(bytes);assert.deepEqual(r.imports,['binkw32.dll']);assert.equal(r.architecture,'x86');assert.equal(r.knownSteamBuild,false);assert.deepEqual(bytes,before);
 const x64=bytes.slice();new DataView(x64.buffer).setUint16(0x84,0x8664,true);assert.throws(()=>inspectPEBytes(x64),/32-bit/);
 const damaged=bytes.slice();new DataView(damaged.buffer).setUint32(0x20c,0xffffffff,true);assert.throws(()=>inspectPEBytes(damaged),/import address/);
 assert.throws(()=>inspectPEBytes(bytes.subarray(0,100)),/incomplete/);assert.equal(adler32(new TextEncoder().encode('hello')),0x062c0215);
});
test('windowed Steam profile imports genuine installation metadata and only owned DLC into an isolated Wine profile',async()=>{
 const records=planOblivionImport(steamFiles()).records,defaults=records.find(r=>r.path.endsWith('Oblivion_default.ini'));defaults.file=file('Oblivion_default.ini','[General]\nsLanguage=GERMAN\n[Display]\nbFullScreen=1\niSize W=1920\niSize H=1080\ncustomOption=keep\n[Archive]\nsArchiveList=old\n');
 const writes=new Map(),dirs=[],fs={mkdirTree:p=>dirs.push(p),writeFile:(p,b)=>writes.set(p,b)},profile=await prepareSteamProfile(fs,records,{headless:true});
 assert.deepEqual(profile.registryCommand,['reg','import','D:\\LiteOSProfile\\install.reg']);assert.deepEqual(profile.plugins,['Oblivion.esm','Knights.esp']);assert.equal(profile.usedGameDefaults,true);
 const ini=writes.get('/d_drive/LiteOSProfile/Documents/My Games/Oblivion/Oblivion.ini');assert.match(ini,/sLanguage=GERMAN/);assert.match(ini,/customOption=keep/);assert.match(ini,/bFullScreen=0/);assert.match(ini,/iSize W=640/);assert.match(ini,/bSoundEnabled=0/);assert.match(ini,/sArchiveList=Oblivion - Meshes.bsa/);
 const reg=new TextDecoder('utf-16le').decode(writes.get('/d_drive/LiteOSProfile/install.reg'));assert.match(reg,/HKEY_LOCAL_MACHINE\\Software\\Bethesda Softworks\\Oblivion/);assert.ok(reg.includes('"Installed Path"="D:\\\\Oblivion\\\\"'));assert.ok(!/Valve|SteamApp|license/i.test(reg));assert.ok(![...writes.keys()].some(p=>/Oblivion\.exe|steam_appid\.txt$/i.test(p)));
 assert.equal(writes.get('/d_drive/LiteOSProfile/AppData/Local/Oblivion/Plugins.txt'),'Oblivion.esm\r\nKnights.esp\r\n');assert.ok(dirs.some(p=>p.endsWith('/Saves')));
 const withoutDlc=await prepareSteamProfile(fs,records,{enableDlc:false});assert.deepEqual(withoutDlc.plugins,['Oblivion.esm']);
});
test('INI changes preserve unrelated settings and remove conflicting duplicate targeted keys',()=>{
 const ini=patchIni('[Display]\nbFullScreen=1\nBFULLSCREEN=1\nvalue=unchanged\n[Other]\nvalue=2',{Display:{bFullScreen:0,'iSize W':640}});assert.equal((ini.match(/bfullscreen/gi)||[]).length,1);assert.match(ini,/value=unchanged/);assert.match(ini,/\[Other\]\r\nvalue=2/);
});
test('Wine diagnostics distinguish missing bundled files, Steam client failures and graphics failures',()=>{
 assert.equal(classifyWineLine('0108:err:module:import_dll Library binkw32.dll (which is needed by Oblivion.exe) not found').kind,'dependency');
 assert.equal(classifyWineLine('Fatal error: SteamAPI_Init() failed.').kind,'steam-client');assert.equal(classifyWineLine('wined3d: failed to initialize renderer').kind,'graphics');assert.equal(classifyWineLine('Launching Oblivion.exe'),null);
});
test('a selected EXE and Wine ZIP permit one-click Start before manual engine preparation',()=>{
 const selected={authorized:true,hasExe:true,hasRoot:true,ready:false};
 assert.equal(launchAvailability(selected).enabled,true);assert.match(launchAvailability(selected).hint,/prepare the engine/);
 assert.equal(launchAvailability({...selected,ready:true,hasRoot:false}).enabled,true);
 assert.equal(launchAvailability({...selected,loading:true}).enabled,false);assert.equal(launchAvailability({...selected,busy:true}).enabled,false);
 assert.equal(launchAvailability({...selected,authorized:false}).enabled,false);
 assert.match(launchAvailability({...selected,hasRoot:false}).hint,/Wine system ZIP/);
 assert.match(launchAvailability({...selected,memoryError:'Acknowledge the memory requirement.'}).hint,/Acknowledge/);
});
test('launch controls expose startup failures and distinguish a start request from guest output',()=>{
 const state={authorized:true,hasExe:true,hasRoot:true,started:true};
 assert.match(launchAvailability(state).hint,/Starting Wine/);
 assert.match(launchAvailability({...state,coreStarted:true}).hint,/Wine is running/);
 assert.equal(launchAvailability({...state,issue:'Direct3D failed'}).hint,'Direct3D failed');
 assert.equal(launchAvailability({...state,failed:true}).enabled,false);assert.match(launchAvailability({...state,failed:true}).hint,/Reload/);
});
