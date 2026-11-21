import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
const workerModule = await import(moduleUrl);
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
console.log('App sandbox and desktop script policies are isolated');

const gameResponse=await workerModule.default.fetch(new Request('https://liteos.test/game-mode'),{},{});const libraryResponse=await workerModule.default.fetch(new Request('https://liteos.test/heroes3/'),{},{});assert.equal(gameResponse.status,200);assert.equal(libraryResponse.status,200);assert.equal(gameResponse.headers.get('cross-origin-opener-policy'),'same-origin');assert.equal(gameResponse.headers.get('cross-origin-embedder-policy'),'require-corp');assert.equal(desktopResponse.headers.get('cross-origin-embedder-policy'),null);assert.match(libraryResponse.headers.get('content-security-policy'),/wasm-unsafe-eval/);console.log('Game workspace isolation is separate from normal web browsing.');

const experiment=await workerModule.default.fetch(new Request('https://liteos.test/oblivion/index.html'),{},{});
assert.equal(experiment.status,200);assert.equal(experiment.headers.get('cross-origin-embedder-policy'),'require-corp');assert.match(experiment.headers.get('content-security-policy'),/wasm-unsafe-eval/);
assert.match(await experiment.text(),/Choose Wine system ZIP/);
const sourceHead=await workerModule.default.fetch(new Request('https://liteos.test/runtimes/sources/boxedwine-source.tar.gz',{method:'HEAD'}),{},{});assert.equal(sourceHead.status,200);assert.equal(sourceHead.headers.get('content-length'),'23678177');
const absentRoot=await workerModule.default.fetch(new Request('https://liteos.test/api/runtime/oblivion/wine-root.zip'),{},{});assert.equal(absentRoot.status,404);
console.log('Experimental engine isolation, source access, and local-only Wine root are valid.');

const gameAssetRequests=[];const runtimeEnv={GAME_ASSETS:{fetch:async request=>{gameAssetRequests.push(request.url);return new Response('/* pinned upstream script */');}}};
const profileRuntime=await workerModule.default.fetch(new Request('https://liteos.test/api/runtime/heroes3/vcmiclient.js?profile=guest&version=11111111-1111-1111-1111-111111111111'),runtimeEnv,{});
assert.equal(profileRuntime.status,200);assert.equal(profileRuntime.headers.get('cache-control'),'private,no-cache');assert.match(await profileRuntime.text(),/'liteos-games','heroes3',"guest"/);assert.equal(gameAssetRequests.length,0);assert.match(profileRuntime.headers.get('content-security-policy'),/wasm-unsafe-eval/);assert.equal(profileRuntime.headers.get('cross-origin-embedder-policy'),'require-corp');
const invalidProfile=await workerModule.default.fetch(new Request('https://liteos.test/api/runtime/heroes3/vcmiclient.js?profile=../bad&version=no'),runtimeEnv,{});assert.equal(invalidProfile.status,400);assert.equal(gameAssetRequests.length,0);
const rawLoader=await readFile(resolve(projectRoot,'.runtime-cache/heroes3/vcmiclient.js'),'utf8');const plainLoader=await workerModule.default.fetch(new Request('https://liteos.test/api/runtime/heroes3/vcmiclient.js'),{},{});assert.equal(await plainLoader.text(),rawLoader);
console.log('Profile-scoped worker script preserves the exact embedded loader without runtime cache or static-routing dependencies.');

const steamPage=await workerModule.default.fetch(new Request('https://liteos.test/oblivion/index.html'),{},{});const steamHTML=await steamPage.text();assert.match(steamHTML,/Steam app 22330/);assert.match(steamHTML,/Check installation/);assert.match(steamHTML,/Start game/);const steamModule=await workerModule.default.fetch(new Request('https://liteos.test/oblivion/steam-profile.js'),{},{});assert.equal(steamModule.status,200);assert.match(steamModule.headers.get('content-type'),/javascript/);assert.match(await steamModule.text(),/STEAM_APP_ID=22330/);console.log('Classic Steam profile, preflight and launch controls are packaged.');

assert.equal((steamHTML.match(/id="run-probe"/g)||[]).length,1);assert.match(steamHTML,/id="fullscreen"/);assert.match(steamHTML,/Oblivion launch controls/);

assert.match(steamHTML,/id="test-display"/);assert.match(steamHTML,/id="display-test"/);const displayModule=await workerModule.default.fetch(new Request('https://liteos.test/oblivion/display.js'),{},{});assert.equal(displayModule.status,200);assert.match(await displayModule.text(),/createDisplayDiagnostics/);console.log('Separate display test and graphics diagnostics are packaged.');
