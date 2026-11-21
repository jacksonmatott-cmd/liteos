import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {unpackOblivionRuntime} from '../scripts/hydrate-games.mjs';
const manifest=JSON.parse(await readFile(new URL('../oblivion-runtime-manifest.json',import.meta.url),'utf8'));
const archive=Buffer.concat(await Promise.all(manifest.archive.parts.map(name=>readFile(new URL('../'+name,import.meta.url)))));
test('repository engine bundle contains every original asset with the pinned bytes',()=>{
 const files=unpackOblivionRuntime(archive,manifest);assert.equal(Object.keys(files).length,manifest.files.length);
 for(const spec of manifest.files){const bytes=files[spec.path.split('/').at(-1)];assert.equal(bytes.length,spec.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),spec.sha256);}
});
test('damaged repository bundles fail before extracting or fetching anything',()=>{
 const changed=Buffer.from(archive);changed[100]^=1;assert.throws(()=>unpackOblivionRuntime(changed,manifest),/archive checksum/);
});
test('individual engine files are checked even if an enclosing archive was repacked',()=>{
 const tar=gunzipSync(archive);tar[512]^=1;const changed=gzipSync(tar),repacked={...manifest,archive:{...manifest.archive,bytes:changed.length,sha256:createHash('sha256').update(changed).digest('hex')}};
 assert.throws(()=>unpackOblivionRuntime(changed,repacked),/file checksum/);
});
