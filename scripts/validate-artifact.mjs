import assert from "node:assert/strict";
import {createHash} from 'node:crypto';
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
let workerModule;try{workerModule=await import(moduleUrl);}catch(error){console.error('Invalid Worker module: '+error.message);process.exit(1);}
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

console.log("Artifact is valid ESM and exports default.fetch");

// The app runner can execute inline code only inside its separate opaque sandbox.
// The desktop keeps its original script policy.
const sandboxResponse = await workerModule.default.fetch(new Request('https://liteos.test/sandbox.html'), {}, {});
const desktopResponse = await workerModule.default.fetch(new Request('https://liteos.test/'), {}, {});
assert.equal(sandboxResponse.status, 200);
assert.equal(desktopResponse.status, 200);
const sandboxCSP = sandboxResponse.headers.get('content-security-policy');
const desktopCSP = desktopResponse.headers.get('content-security-policy');
assert.match(sandboxCSP, /sandbox allow-scripts allow-downloads/);
assert.match(sandboxCSP, /connect-src 'none'/);
assert.ok(!sandboxCSP.includes('allow-same-origin'));
assert.match(sandboxCSP, /script-src 'unsafe-inline'/);
assert.ok(!/script-src[^;]*'unsafe-inline'/.test(desktopCSP));
assert.match(desktopCSP,/frame-src 'self' https: blob:/);
console.log('App sandbox and desktop script policies are isolated');

const gameResponse=await workerModule.default.fetch(new Request('https://liteos.test/game-mode'),{},{});const libraryResponse=await workerModule.default.fetch(new Request('https://liteos.test/heroes3/'),{},{});assert.equal(gameResponse.status,200);assert.equal(libraryResponse.status,200);assert.equal(gameResponse.headers.get('cross-origin-opener-policy'),'same-origin');assert.equal(gameResponse.headers.get('cross-origin-embedder-policy'),'require-corp');assert.equal(desktopResponse.headers.get('cross-origin-embedder-policy'),null);assert.match(libraryResponse.headers.get('content-security-policy'),/wasm-unsafe-eval/);console.log('Game workspace isolation is separate from normal web browsing.');

const gameAssetRequests=[];const runtimeEnv={GAME_ASSETS:{fetch:async request=>{gameAssetRequests.push(request.url);return new Response('/* pinned upstream script */');}}};
const profileRuntime=await workerModule.default.fetch(new Request('https://liteos.test/api/runtime/heroes3/vcmiclient.js?profile=guest&version=11111111-1111-1111-1111-111111111111'),runtimeEnv,{});
assert.equal(profileRuntime.status,200);assert.equal(profileRuntime.headers.get('cache-control'),'private,no-cache');assert.match(await profileRuntime.text(),/'liteos-games','heroes3',"guest"/);assert.equal(gameAssetRequests.length,0);assert.match(profileRuntime.headers.get('content-security-policy'),/wasm-unsafe-eval/);assert.equal(profileRuntime.headers.get('cross-origin-embedder-policy'),'require-corp');
const invalidProfile=await workerModule.default.fetch(new Request('https://liteos.test/api/runtime/heroes3/vcmiclient.js?profile=../bad&version=no'),runtimeEnv,{});assert.equal(invalidProfile.status,400);assert.equal(gameAssetRequests.length,0);
const rawLoader=await readFile(resolve(projectRoot,'.runtime-cache/heroes3/vcmiclient.js'),'utf8');const plainLoader=await workerModule.default.fetch(new Request('https://liteos.test/api/runtime/heroes3/vcmiclient.js'),{},{});assert.equal(await plainLoader.text(),rawLoader);
console.log('Profile-scoped worker script preserves the exact embedded loader without runtime cache or static-routing dependencies.');

for(const path of ['/oblivion/','/oblivion/index.html','/oblivion/runtime/boxedwine.wasm','/runtimes/sources/boxedwine-source.tar.gz']){
 const response=await workerModule.default.fetch(new Request('https://liteos.test'+path),{},{});
 assert.equal(response.status,404,`${path} must no longer be served`);
}
assert.ok(!source.includes('BoxedWine'));
assert.deepEqual((await readdir(resolve(projectRoot,'dist/client/runtimes'))).sort(),['heroes3','sources']);
assert.deepEqual((await readdir(resolve(projectRoot,'dist/client/runtimes/sources'))).sort(),Object.keys(JSON.parse(await readFile(resolve(projectRoot,'source-archives.json'),'utf8'))).sort());
for(const path of ['/desktop-ui.js','/desktop-state.js','/desktop.css']){
 const response=await workerModule.default.fetch(new Request('https://liteos.test'+path),{},{});
 assert.equal(response.status,200);assert.ok((await response.text()).length>100);
}
assert.match(await desktopResponse.text(),/href="\/desktop.css"/);
const status=await workerModule.default.fetch(new Request('https://liteos.test/api/status'),{},{});
assert.equal((await status.json()).version,'0.6.0');
console.log('Modern desktop assets are included; removed game routes and binaries are absent.');

for(const path of ['/litecraft/index.html','/litecraft/game.js','/litecraft/world.js','/litecraft/terrain.js','/litecraft/textures.js','/litecraft/software.js','/litecraft/vendor/three.module.js','/litecraft/vendor/three.core.js','/litecraft/textures/grass_top.png']){const r=await workerModule.default.fetch(new Request('https://liteos.test'+path),{},{});assert.equal(r.status,200);}
console.log('LiteCraft app, renderer, and texture assets are packaged.');

const textureManifest=JSON.parse(await readFile(resolve(projectRoot,'public/litecraft/textures/manifest.json'),'utf8'));
for(const [name,asset]of Object.entries(textureManifest.files)){
 const r=await workerModule.default.fetch(new Request('https://liteos.test/litecraft/textures/'+name),{},{});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');
 const bytes=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes.readUInt32BE(16),16);assert.equal(bytes.readUInt32BE(20),name==='water.png'?512:16);
}
console.log('All 17 supplied texture files match their source checksums and native pixel dimensions.');
