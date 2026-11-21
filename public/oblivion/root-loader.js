export const WINE_ROOT = Object.freeze({bytes:96509852,sha256:'d950fe71d6c078e7218a143f675fde80f80e5c451a8c07a43d6425302be900c0'});
export async function verifyWineRoot(file,spec=WINE_ROOT){
  if(!file||file.size!==spec.bytes)throw Error('Choose the original TinyCore15Wine11.0-web.zip from the download link. Its expected size is 97 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==spec.sha256)throw Error('The Wine system ZIP checksum does not match. Download a fresh copy from the official link.');
  return bytes;
}
// Keep the vendor shell's load contract, substituting only its fixed root ZIP.
export function localRootLoader(original,rootName,bytes){return function(prefix,name,callback){
  if(name===rootName)return Promise.resolve().then(()=>callback(bytes));
  return original(prefix,name,callback);
};}
