export const DEFAULT_START_PINS=Object.freeze(['files','browser','notes','write','sheets','photos','paint','calc','settings','assistant','apps','games']);
const PINNABLE=new Set([...DEFAULT_START_PINS,'home','heroes3','store','terminal','security','remote','tasks','bin','google']);
export function normalizePinnedApps(value){
 if(!Array.isArray(value))return [...DEFAULT_START_PINS];
 return [...new Set(value.filter(app=>typeof app==='string'&&PINNABLE.has(app)))].slice(0,24);
}
export function desktopArea(width,height){
 width=Number.isFinite(width)?Math.max(1,Math.round(width)):1024;
 height=Number.isFinite(height)?Math.max(1,Math.round(height)):768;
 const x=Math.min(10,Math.floor(width/10)),y=Math.min(10,Math.floor(height/10));
 return {x,y,w:Math.max(1,width-x*2),h:Math.max(1,height-y-Math.min(72,Math.floor(height/3)))};
}
export function fitWindowBounds(bounds,width,height){
 const area=desktopArea(width,height),finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
 const w=Math.round(Math.min(area.w,Math.max(Math.min(340,area.w),finite(bounds.w,700))));
 const h=Math.round(Math.min(area.h,Math.max(Math.min(260,area.h),finite(bounds.h,520))));
 return {x:Math.round(Math.max(area.x,Math.min(area.x+area.w-w,finite(bounds.x,area.x)))),y:Math.round(Math.max(area.y,Math.min(area.y+area.h-h,finite(bounds.y,area.y)))),w,h};
}
export function snapBounds(layout,width,height){
 const area=desktopArea(width,height),gap=8,half=Math.floor((area.w-gap)/2),halfH=Math.floor((area.h-gap)/2);
 const layouts={left:[0,0,half,area.h],right:[half+gap,0,area.w-half-gap,area.h],
  'top-left':[0,0,half,halfH],'top-right':[half+gap,0,area.w-half-gap,halfH],
  'bottom-left':[0,halfH+gap,half,area.h-halfH-gap],'bottom-right':[half+gap,halfH+gap,area.w-half-gap,area.h-halfH-gap]};
 const rect=layouts[layout];
 if(!rect||rect[2]<340||rect[3]<220)return {...area,layout:'max'};
 return {x:area.x+rect[0],y:area.y+rect[1],w:rect[2],h:rect[3],layout};
}
export function applyWindowLayout(win,layout,width,height){
 if(layout==='restore'){
  Object.assign(win,fitWindowBounds(win.restoreBounds||win,width,height),{max:false,snap:null});
  delete win.restoreBounds;return win;
 }
 if(!win.max&&!win.snap&&!win.restoreBounds)win.restoreBounds=fitWindowBounds(win,width,height);
 const rect=snapBounds(layout,width,height);
 Object.assign(win,{x:rect.x,y:rect.y,w:rect.w,h:rect.h,max:rect.layout==='max',snap:rect.layout==='max'?null:rect.layout});
 return win;
}
export function localDateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function calendarDays(year,month){
 const first=new Date(year,month,1,12),offset=(first.getDay()+6)%7,normalized=first.getMonth();
 return Array.from({length:42},(_,index)=>{const date=new Date(first.getFullYear(),normalized,index-offset+1,12);return {key:localDateKey(date),day:date.getDate(),current:date.getMonth()===normalized,date};});
}
