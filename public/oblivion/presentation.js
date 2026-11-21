// Both overlay callback types share a context; #canvas remains owned by GL.
const MAX_PIXELS = 16_777_216;
export function installPresentationBridge(module,{canvas,onPresent=()=>{},onError=()=>{}}){
 let context,image;
 const facts={softwareFrames:0,bitmapFrames:0,droppedFrames:0,lastError:null};
 function report(error){const message=String(error?.message||error),repeated=facts.lastError===message;facts.lastError=message;if(!repeated)try{onError(message);}catch{}}
 function acknowledge(state){if(state&&typeof Atomics!=='undefined')try{Atomics.store(state,0,0);}catch(error){report(error);}}
 function dimensions(width,height){if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>8192||height>8192||width*height>MAX_PIXELS)throw Error('The runtime supplied invalid or oversized display dimensions.');return width*height*4;}
 function surface(width,height){
  dimensions(width,height);if(!canvas)throw Error('The runtime display overlay is missing.');
  if(!context){context=canvas.getContext('2d',{alpha:false});if(!context)throw Error('The browser could not create the software display context. Reload the experiment.');}
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  canvas.parentElement?.style.setProperty('--boxedwine-canvas-width',String(width));canvas.parentElement?.style.setProperty('--boxedwine-canvas-height',String(height));return context;
 }
 function presented(kind){facts[kind+'Frames']++;facts.lastError=null;try{onPresent({...facts});}catch{}}
 module.boxedwinePresentSoftwareFrame=function(width,height,buffer,state){
  try{
   if(!buffer)return;const length=dimensions(width,height),bytes=ArrayBuffer.isView(buffer)?new Uint8Array(buffer.buffer,buffer.byteOffset,buffer.byteLength):new Uint8Array(buffer);
   if(bytes.byteLength<length)throw Error('The runtime supplied an incomplete software display frame.');
   const ctx=surface(width,height);
   // ImageData owns ordinary memory even when the source is shared/transferred.
   if(!image||image.width!==width||image.height!==height)image=ctx.createImageData(width,height);
   image.data.set(bytes.subarray(0,length));ctx.putImageData(image,0,0);presented('software');
  }catch(error){facts.droppedFrames++;report(error);}finally{acknowledge(state);}
 };
 module.boxedwinePresentFrame=function(bitmap,state,sx,sy,sw,sh){
  try{
   if(!bitmap)return;sx=Math.max(0,sx|0);sy=Math.max(0,sy|0);sw=Math.min(bitmap.width-sx,sw|0||bitmap.width);sh=Math.min(bitmap.height-sy,sh|0||bitmap.height);
   surface(sw,sh).drawImage(bitmap,sx,sy,sw,sh,0,0,sw,sh);presented('bitmap');
  }catch(error){facts.droppedFrames++;report(error);}finally{try{bitmap?.close?.();}catch(error){report(error);}acknowledge(state);}
 };
 return {snapshot:()=>({...facts})};
}
export function probeWebGL(createCanvas=()=>document.createElement('canvas')){
 let gl;try{gl=createCanvas().getContext('webgl2');return {available:!!gl,error:gl?null:'WebGL 2 could not be created.'};}
 catch(error){return {available:false,error:String(error?.message||error)};}
 finally{try{gl?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}}
}
