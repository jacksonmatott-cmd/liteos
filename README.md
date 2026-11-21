# LiteOS 0.3.3 — Games on your device

**A little lighter. A lot more you.**

LiteOS is a Windows-inspired browser desktop for computers, tablets, and phones. This edition needs **no hosted database, R2 bucket, storage subscription, or billing setup for its files and accounts**. Files, profiles, passwords, settings, and family policies are saved in the browser's free IndexedDB storage. GitHub stores the source; a small Cloudflare Worker serves the application and optional AI endpoint.

## Included

- Desktop windows, Start screen, taskbar, search, lock screen, touch layout, custom backgrounds, themes, and accessibility settings.
- **Google inside LiteOS:** Google and Lite Browser open an actual Google webpage in an embedded browser window. The LiteOS address bar searches in that same frame. Focus, Start, minimize, and restore preserve the frame. This uses Google's currently frame-compatible `webhp?igu=1` / `search?igu=1` views, not a screenshot, proxy, or a replacement search launcher. Google can change these views or show a bot check. Some destinations and Google sign-in block framing; the help button offers a separately opened tab when needed. Native Chrome is not installed or executed.
- Lite Write, Sheets with formulas and CSV import/export, Notes, Files, Paint, Photos, Calculator, Mines, and Tic-tac-toe run inside LiteOS.
- Single-file HTML apps run in an isolated, offline sandbox. Compatible HTTPS web apps can also be embedded. An App Center includes a working Counter demo and an HTML app editor. Heroes III has a dedicated browser engine described below. Original Oblivion has an experimental dependency probe. Other Windows EXE/MSI files and Steam games can be stored and downloaded; general native execution requires a compatible remote Windows host.
- LiteFS folders, import, rename, preview, downloads, Recycle Bin, restore, permanent deletion, and batch-inspired LiteScript commands.
- Password-protected local parent and child profiles with separate file spaces. Passwords use salted PBKDF2-SHA256 hashes (210,000 iterations). There are no built-in passwords. Local profiles do not authenticate to GitHub or Google.
- Parent-approved group policy changes and a local audit log for security-tool exports. Children have AI, Share, external websites, and installed game runtimes disabled by default. These are LiteOS interface controls; someone who administers the browser or device can inspect or change local storage. They do not manage Windows Group Policy, antivirus, a firewall, or the rest of the device.
- **Settings → System → Danger** contains one button, **Clear Browser Data**. A same-family parent must enter their password. A one-use approval expires after 60 seconds. This removes **all LiteOS profiles, files, game libraries, and game saves on that browser**, plus its LiteOS preferences and cookies. It cannot clear other sites or the browser's entire history.

## Heroes III inside LiteOS

Open **Heroes III** from the desktop or Lite Apps. Choose your installed **Heroes III Complete / Shadow of Death** folder, or a standard ZIP of it. The engine needs `Data/H3bitmap.lod`, `Data/H3sprite.lod`, `Data/Heroes3.snd`, and the rest of the matching game installation. Maps and campaigns are imported; music is optional. A Windows installer, an EXE by itself, and the Steam **HD Edition** are not compatible game data.

**Play Heroes III** enters an isolated LiteOS game workspace when needed. Save open documents first. The real VCMI 1.7.5 WebAssembly engine supports local scenarios, campaigns, random maps, and hotseat. Online multiplayer is disabled. Game files use origin-private browser storage (OPFS), separated by LiteOS profile; they never upload to a server. Reimporting an installation stages and verifies the new files before switching, and keeps existing saves. Only one window can use a profile's installation at a time. Imports support 10,000 compatible files / 4 GB total / 2 GB per file, subject to available device quota. ZIP imports reject traversal, encryption, unsupported compression, and checksum failures.

On a phone, export **game ZIP** from your computer, transfer it to the phone's Files app, and choose that ZIP in LiteOS. The game toolbar offers Right click, Esc, and Fullscreen. The layout adapts to phones, but actual game performance and browser memory limits depend on the device. Use a current browser with OPFS, Web Locks, OffscreenCanvas, WebAssembly threads, and cross-origin isolation. iOS browser features and available memory can differ from desktop browsers. Google browsing remains available in normal desktop mode; save and close games before leaving the isolated workspace.

Save normally inside the game. **Download save backup** creates a `.h3save` file (up to 2,000 files / 64 MB); **Restore saves** merges it and renames collisions. Game saves and installations are separate from `.litebackup` workspace backups. Clearing LiteOS data or browser site storage removes them. Download backups before clearing.

Validation for this release: folder/ZIP planning, malformed archives, export round trips, memory/path limits, profile permissions, and the real WASM binaries are tested. A real browser imported/exported synthetic test files and reached VCMI's native initialization; those synthetic files cannot establish successful gameplay. A full playthrough, graphics/audio, in-game saving, and performance with commercial game data are not verified in this environment.

## Classic Steam Oblivion experiment

**Lite Apps → Oblivion experiment** now targets classic Steam Oblivion GOTY, app **22330**, with the original 32-bit 1.2.0416 executable. In Steam, choose **Oblivion → Properties → Installed Files → Browse**. Import that installed `steamapps/common/Oblivion` folder. A larger Steam library selection is reduced to one Oblivion subtree; unrelated Steam client/account files and redistributable installers are skipped. Two different installations, duplicate paths and traversal are rejected. Folder selection replaces the staged selection; Choose files can add individual missing files for a small dependency probe.

**Check installation** examines the EXE's PE32 import table without modifying it and reports bundled DLLs, the master, six base BSAs and shader packages. It recognizes the known Steam compatibility EXE with Adler32 `A2408F04`, as identified by xOBSE's maintained checksum table. The user's supplied EXE matches that build and directly imports `binkw32.dll` and `d3dx9_27.dll`. It does not directly import `steam_api.dll`, so that DLL is not a universal requirement. A matching checksum or complete set of filenames does not establish successful gameplay.

The compatibility preset mounts the selected installation at `D:\Oblivion`, imports the genuine 32-bit Bethesda `Installed Path` registry key, and creates an isolated documents/application-data profile on the temporary Wine D: drive. It derives a 640×480 windowed INI from the selected `Oblivion_default.ini`, preserving other settings. The graphics preset uses the original executable’s exact INI keys: `[Display] bFull Screen=0`, `[BlurShaderHDR] bDoHighDynamicRange=0`, and `[BlurShader] bUseBlurShader=0`. It also disables MSAA, shader-model-3 allowance, refraction and startup/menu movies, while retaining game shaders. Earlier misspelled or misplaced fullscreen/HDR overrides are removed. When the default INI is absent, it creates a small fallback. It configures Wine's builtin Direct3D 9 adapter for the browser graphics path. Only owned, present Bethesda DLC plugins are enabled, with a checkbox to disable them. Non-Bethesda mods are not automatically activated. Game EXEs and DLLs stay byte-for-byte unchanged. The runtime does not provide a Steam client or an authenticated session, synthesize Steam entitlement keys, or replace Steam libraries.

The pinned BoxedWine ST-JIT engine uses a locally selected Wine system ZIP. Download the official 97 MB ZIP from the experiment's link once, select it locally, then load the engine. Its complete SHA-256 is checked before loading; LiteOS does not mirror or upload that system ZIP. Select your installation and choose **Start game** in the pinned launch bar. Start prepares the engine automatically before dispatching the selected EXE. The Runtime setup link scrolls to the system ZIP picker; the launch bar explains any remaining prerequisite. The whole setup page scrolls inside its LiteOS window. **Fullscreen** expands the setup and switches to a canvas-focused game view after Start; use **Exit fullscreen** or Esc to return. Browsers without element fullscreen use an expanded LiteOS window. Engine preparation and startup errors/timeouts appear in the visible launch controls. The graphics path needs WebGL 2. **Loader-only mode** uses documented `-novideo` / `-nosound` options and GDI, and is selected automatically when WebGL 2 is absent. That mode cannot test graphics or gameplay.

**Test display** draws a clearly labeled color pattern on a separate canvas, without claiming a context on either runtime canvas. It works before starting Wine and in fullscreen. **Display troubleshooting** reports canvas dimensions, created context types, context loss and display-callback counts; a manual layer selector compares direct graphics and the software overlay while Automatic preserves upstream control. The exported diagnostic log includes those observations. WineD3D backend-selection messages and MIPS instruction counts are not rendered frames or FPS. Lite Assistant now routes Oblivion/black-screen questions to this help instead of its LiteScript example.

The experiment distinguishes missing-file, Steam-client and Direct3D initialization diagnostics and exports a diagnostic log with the selected compatibility profile. If Steam client services are requested, importing files alone cannot supply them. Use Steam's **Verify integrity of game files** to repair a missing original `binkw32.dll` or other bundled dependency, then select the repaired installation. No game files are included or uploaded to LiteOS servers.

Selected game bytes are copied into temporary RAM; there is no lazy loading or persistent Oblivion save integration. Selection limits remain 6 GB on desktop and 1 GB on touch devices, with acknowledgement over 512 MB. A complete installation can exceed practical browser memory even on desktop. Use a desktop for full-install tests. Oblivion Remastered uses a different engine and is outside this preset.

Verification: the supplied EXE is identified as the classic Steam compatibility build; import layouts, archive checks, PE bounds, INI/registry generation, DLC selection and diagnostic classification are tested. An earlier limited browser test stopped at a missing bundled DLL; the user’s later full-install log reaches the WebGL WineD3D backend and reports CPU activity, but the picture remains black. The corrected profile and page display test address configuration and canvas diagnostics; they do not establish a working DirectX game renderer. Working Steam authentication, menus, graphics, audio, saves and gameplay remain unverified.

## Sharing and moving between devices

Lite Files → Share sends a copy through the device's file share sheet when supported, with Download as a fallback. LiteOS does not upload the file or create a public share link. Copies sent to other people cannot be revoked. Local policies govern the Share action, not the device's Downloads folder or other apps.

**Settings → Privacy → Your data** exports and restores `.litebackup` workspace files. Backups contain files and appearance settings encrypted with AES-256-GCM and a separate password you choose. They exclude account credentials and family permissions. Keep that password: there is no recovery service. Restore merges into the current workspace and renames conflicting files instead of overwriting them. Backups support 2,000 entries / 50 MB; download larger files separately. Per-file imports are limited to 20 MB (or the family's smaller limit); each profile has a 250 MB application allowance, also subject to the browser's own quota.

Local profiles and passwords exist only on their current browser and website origin. They **do not automatically sync to other devices**. Private-browsing modes, storage eviction, clearing site data, or changing the website's domain can make local data unavailable. Export backups of important work. Existing guest files in `liteos-local` remain compatible. Earlier D1/R2 accounts do not automatically become local profiles: export their files from the earlier version before switching if needed. Deployment does not delete the old cloud database or bucket.

## Import the repository into Cloudflare

Choose **Workers & Pages → Create application → Import a repository**, select this repository as a Worker, and use:

| Setting | Value |
| --- | --- |
| Branch | `main` |
| Root | Leave blank |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Node.js | 22 or newer |

The build downloads public, open-source engine/system runtimes and verifies their pinned sizes and SHA-256 hashes. The Worker stays small; engine binaries and corresponding source archives are deployed as Cloudflare static assets (about 80 MB of public build downloads, each file below 25 MB). Wine system ZIPs are supplied locally by the user and are not part of the build. No commercial game files are part of the repository or build. Keep the build command configured so these assets exist before deployment. The deploy command publishes the Worker directly. It does not provision storage, apply database migrations, or access R2. No database IDs or bucket names are required. This removes the prior `liteos-files` missing-bucket (10085) dependency. If you manually added DB/BUCKET bindings in the Cloudflare dashboard, remove those bindings from this Worker; you can retain the underlying resources. Worker hosting quotas still belong to your Cloudflare account. See [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/).

## Optional connected AI

Built-in LiteOS help works locally without an API or payment. Connected AI is optional and subject to the provider's own quota or charges. The previously supplied Ollama key remains a server secret in the hosted review copy; its last live response was HTTP 402 because the provider account has no inference credits. No key is included in this public repository.

On a separate Cloudflare deployment, reuse an existing `OLLAMA_API_KEY` (or `GROQ_API_KEY` / `GEMINI_API_KEY`) secret. Set a private `AI_ACCESS_CODE` secret as well: local profiles are not trusted server identities, so the shared provider key stays disabled until that code exists. Sign into a local profile and choose **Connect optional AI** in Lite Assistant to enter the code for the current session. The access code stays in memory and is cleared on sign-out. `AI_MODEL` defaults to `gemma4:31b`; change it for other providers.

Install secrets through hidden Wrangler prompts, never in source or command-line values:

```sh
npx wrangler secret put OLLAMA_API_KEY
npx wrangler secret put AI_ACCESS_CODE
```

The Worker accepts same-origin AI requests with the access code, fixes provider destinations, bounds request size, and applies best-effort throttling of 20 requests per IP/hour per Worker instance. This throttle is not a durable spending cap; configure spending limits with the AI provider if you enable it. Accounts and files never go to the AI server automatically.

## Development

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. There are no migrations or local cloud database dependencies. Optional development secrets belong in ignored `.dev.vars` files.

```sh
npm test
npm run build
npm run validate
```

GitHub Actions runs these checks on pushes. `runtime-manifest.json`, `oblivion-runtime-manifest.json`, and `source-archives.json` pin the runtime downloads. `.runtime-cache` and generated `dist` assets are ignored by Git. Engine credits, licenses, and corresponding-source links are available under `public/open-source` and on each game launcher.

The build packages the frontend and server together; the frontend itself can also run from static hosting with local profiles and built-in help. The optional AI route requires the Worker. The app is a browser desktop prototype, not a bootable kernel or a native Windows virtual machine.
