import test from 'node:test';
import assert from 'node:assert/strict';
import {desktopArea,fitWindowBounds,snapBounds,applyWindowLayout,normalizePinnedApps,DEFAULT_START_PINS,calendarDays,localDateKey} from '../public/desktop-state.js';

test('window bounds stay on screen after shrinking, moving and invalid saved geometry',()=>{
 for(const [width,height] of [[1440,900],[768,500],[390,844],[320,568],[120,100]]){
  const area=desktopArea(width,height);
  for(const bounds of [{x:1800,y:900,w:1000,h:700},{x:-800,y:-400,w:10,h:10},{x:NaN,y:Infinity,w:Infinity,h:NaN}]){
   const result=fitWindowBounds(bounds,width,height);
   assert.ok(Object.values(result).every(Number.isFinite));
   assert.ok(result.x>=area.x&&result.y>=area.y);
   assert.ok(result.x+result.w<=area.x+area.w&&result.y+result.h<=area.y+area.h);
  }
 }
});

test('snap halves and quarters do not overlap or cover the taskbar',()=>{
 const area=desktopArea(1440,900),left=snapBounds('left',1440,900),right=snapBounds('right',1440,900);
 assert.equal(left.x,area.x);assert.equal(right.x+right.w,area.x+area.w);
 assert.ok(left.x+left.w<right.x);assert.equal(left.h,area.h);
 const top=snapBounds('top-right',1440,900),bottom=snapBounds('bottom-right',1440,900);
 assert.ok(top.y+top.h<bottom.y);assert.equal(bottom.y+bottom.h,area.y+area.h);
 assert.equal(snapBounds('left',390,844).layout,'max');
 assert.equal(snapBounds('top-left',900,300).layout,'max');
});

test('changing snap layouts and maximizing restores original geometry and unsaved document identity',()=>{
 const data={text:'Keep this unsaved note',saved:false},original={x:100,y:80,w:620,h:480};
 const win={...original,data,max:false};
 applyWindowLayout(win,'left',1440,900);applyWindowLayout(win,'bottom-right',1440,900);applyWindowLayout(win,'max',1440,900);
 assert.equal(win.max,true);assert.deepEqual(win.restoreBounds,original);
 applyWindowLayout(win,'restore',1440,900);assert.deepEqual({x:win.x,y:win.y,w:win.w,h:win.h},original);
 assert.equal(win.data,data);assert.equal(win.data.saved,false);assert.equal(win.restoreBounds,undefined);
 applyWindowLayout(win,'right',1440,900);applyWindowLayout(win,'restore',390,844);
 assert.ok(win.x+win.w<=380);assert.equal(win.data.text,'Keep this unsaved note');
});

test('Start pins are ordered, unique and restricted to real apps',()=>{
 const defaults=normalizePinnedApps();defaults.pop();assert.equal(DEFAULT_START_PINS.length,12);
 assert.deepEqual(normalizePinnedApps(['notes','notes','tasks','<script>','apphost',null,{},'google']),['notes','tasks','google']);
 assert.deepEqual(normalizePinnedApps([]),[]);
});

test('calendar has six Monday-first weeks and handles leap years and year boundaries',()=>{
 const days=calendarDays(2024,1);assert.equal(days.length,42);assert.equal(days[0].date.getDay(),1);
 assert.equal(new Set(days.map(d=>d.key)).size,42);
 assert.equal(days.filter(d=>d.current).length,29);assert.ok(days.some(d=>d.key==='2024-02-29'&&d.current));
 assert.ok(calendarDays(2026,0).some(d=>d.key.startsWith('2025-12-')&&!d.current));
 assert.equal(localDateKey(new Date(2026,10,21,23,59)),'2026-11-21');
});
