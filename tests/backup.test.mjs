import test from 'node:test';
import assert from 'node:assert/strict';
import {exportWorkspace,importWorkspace,mergeWorkspace,safePreferences} from '../public/workspace-backup.js';
const files=[{id:'folder',path:'/Home/Documents',name:'Documents',kind:'folder',size:0},{id:'a',path:'/Home/Documents/work.txt',name:'work.txt',kind:'file',content:'A private note',mime:'text/plain',size:14},{id:'b',path:'/Home/Documents/photo.bin',name:'photo.bin',kind:'file',blob:new Blob([Uint8Array.of(0,255,10)]),size:3}];
test('encrypted backup restores text, binary files and safe appearance without credentials',async()=>{
 const blob=await exportWorkspace(files,{theme:'dark',accent:'#347cf0',role:'parent'},'Backup-password-123');
 assert.ok(!(await blob.text()).includes('private note'));
 const data=await importWorkspace(blob,'Backup-password-123');
 assert.equal(data.files[1].content,'A private note');assert.deepEqual([...new Uint8Array(await data.files[2].blob.arrayBuffer())],[0,255,10]);
 assert.deepEqual(data.preferences,{theme:'dark',accent:'#347cf0'});
 await assert.rejects(()=>importWorkspace(blob,'Wrong-password-123'),/incorrect|damaged/);
 const envelope=JSON.parse(await blob.text());envelope.data=envelope.data.slice(0,-8)+'AAAAAAAA';
 await assert.rejects(()=>importWorkspace(new Blob([JSON.stringify(envelope)]),'Backup-password-123'),/incorrect|damaged/);
});
test('restore preserves existing files and renames collisions',async()=>{
 const result=mergeWorkspace(files,{files,preferences:{theme:'dark'},wallpaperPath:null});
 assert.equal(result.files.length,5);assert.equal(result.files.find(f=>f.path==='/Home/Documents/work.txt').content,'A private note');
 assert.ok(result.files.some(f=>f.path==='/Home/Documents/work (imported 1).txt'));
 assert.equal(new Set(result.files.map(f=>f.id)).size,5);
});
test('restore rejects traversal and ignores executable preference values',async()=>{
 const blob=await exportWorkspace([{path:'/Home/../secret',kind:'file',content:'bad',size:3}],{},'Backup-password-123');
 await assert.rejects(()=>importWorkspace(blob,'Backup-password-123'),/valid path/);
 assert.deepEqual(safePreferences({theme:'<script>',accent:'red;position:fixed',wallpaperFile:'../../evil',fontScale:'huge',role:'parent'}),{});
 assert.throws(()=>mergeWorkspace([],{files:[files[1]],preferences:{}}),/parent folder/);
});
test('backup size limits fail before reading oversized file content',async()=>{
 await assert.rejects(()=>exportWorkspace([{size:51*1048576}],{},'Backup-password-123'),/50 MB/);
});
test('desktop preferences survive encrypted backup without restoring unsafe app names or family permissions',async()=>{
 const blob=await exportWorkspace(files,{taskbarAlignment:'left',startPins:['notes','tasks','notes','apphost','javascript:alert(1)'],doNotDisturb:true,allowExternalApps:true},'Backup-password-123');
 const restored=await importWorkspace(blob,'Backup-password-123');
 assert.deepEqual(restored.preferences,{taskbarAlignment:'left',startPins:['notes','tasks'],doNotDisturb:true});
 assert.deepEqual(safePreferences({taskbarAlignment:'absolute',startPins:'notes',doNotDisturb:'false'}),{});
});
