import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
export function unpackRuntime(tar,manifest){
 const files={};
 for(let at=0;at+512<=tar.length;){const name=tar.subarray(at,at+100).toString().replace(/\0.*$/s,'');if(!name)break;const size=parseInt(tar.subarray(at+124,at+136).toString().replace(/\0.*$/s,'').trim(),8);if(!Number.isSafeInteger(size)||size<0||at+512+size>tar.length)throw Error('Invalid runtime archive.');const leaf=name.split('/').at(-1);if(name==='homm3-browser/dist/'+leaf&&manifest.files[leaf]){const bytes=tar.subarray(at+512,at+512+size),spec=manifest.files[leaf];if(size!==spec.size||createHash('sha256').update(bytes).digest('hex')!==spec.sha256)throw Error('Runtime integrity check failed: '+leaf);files[leaf]=bytes;}at+=512+Math.ceil(size/512)*512;}
 if(Object.keys(files).length!==Object.keys(manifest.files).length)throw Error('Runtime archive is incomplete.');return files;
}
export async function hydrate(){const manifest=JSON.parse(await readFile('runtime-manifest.json','utf8')),dir='.runtime-cache/heroes3';await mkdir(dir,{recursive:true});
 let ready=true;for(const [name,spec]of Object.entries(manifest.files)){try{const bytes=await readFile(dir+'/'+name);if(bytes.length!==spec.size||createHash('sha256').update(bytes).digest('hex')!==spec.sha256)ready=false;}catch{ready=false;}}
 if(ready)return;
 const response=await fetch(manifest.archive,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Could not download the Heroes III runtime: HTTP '+response.status);const archive=Buffer.from(await response.arrayBuffer());if(createHash('sha256').update(archive).digest('hex')!==manifest.archiveSha256)throw Error('Runtime archive checksum failed.');
 for(const[name,bytes]of Object.entries(unpackRuntime(gunzipSync(archive),manifest)))await writeFile(dir+'/'+name,bytes);console.log('Verified Heroes III browser runtime.');
}
export async function hydrateSources(){
 const manifest=JSON.parse(await readFile('source-archives.json','utf8')),dir='.runtime-cache/sources';await mkdir(dir,{recursive:true});
 for(const [name,spec]of Object.entries(manifest)){let bytes;try{bytes=await readFile(dir+'/'+name);}catch{}if(bytes?.length===spec.bytes&&createHash('sha256').update(bytes).digest('hex')===spec.sha256)continue;const response=await fetch(spec.url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Could not download engine source: '+name);bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==spec.bytes||createHash('sha256').update(bytes).digest('hex')!==spec.sha256)throw Error('Engine source checksum failed: '+name);await writeFile(dir+'/'+name,bytes);}
}
