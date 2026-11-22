# LiteOS 0.6.0 — Beyond the horizon

**A little lighter. A lot more you.**

LiteOS is a Windows-inspired browser desktop for computers, tablets, and phones. This edition needs **no hosted database, R2 bucket, storage subscription, or billing setup for its files and accounts**. Files, profiles, passwords, settings, and family policies are saved in the browser's free IndexedDB storage. GitHub stores the source; a small Cloudflare Worker serves the application and optional AI endpoint.

## Included

- Centered or left-aligned taskbar, customizable Start pins, app/file/settings search, Task View (F9), half/quarter snap layouts, drag-to-edge snapping, Show desktop with restore, a calendar with quick notes, and notification center with Do not disturb.
- Task Manager shows actual LiteOS windows and stored file sizes. Close actions keep document save prompts. Backgrounds, light/dark themes, reduced motion, transparency, and touch layouts remain customizable.
- **Google inside LiteOS:** Google and Lite Browser open an actual Google webpage in an embedded browser window. The LiteOS address bar searches in that same frame. Focus, Start, minimize, and restore preserve the frame. This uses Google's currently frame-compatible `webhp?igu=1` / `search?igu=1` views, not a screenshot, proxy, or a replacement search launcher. Google can change these views or show a bot check. Some destinations and Google sign-in block framing; the help button offers a separately opened tab when needed. Native Chrome is not installed or executed.
- Lite Write, Sheets with formulas and CSV import/export, Notes, Files, Paint, Photos, Calculator, Mines, and Tic-tac-toe run inside LiteOS.
- Single-file HTML apps run in an isolated, offline sandbox. Compatible HTTPS web apps can also be embedded. An App Center includes a working Counter demo and an HTML app editor. Heroes III has a dedicated browser engine described below. Other Windows EXE/MSI files and Steam games can be stored and downloaded; general native execution requires a compatible remote Windows host.
- LiteFS folders, import, rename, preview, downloads, Recycle Bin, restore, permanent deletion, and batch-inspired LiteScript commands.
- Password-protected local parent and child profiles with separate file spaces. Passwords use salted PBKDF2-SHA256 hashes (210,000 iterations). There are no built-in passwords. Local profiles do not authenticate to GitHub or Google.
- Parent-approved group policy changes and a local audit log for security-tool exports. Children have AI, Share, external websites, and installed game runtimes disabled by default. These are LiteOS interface controls; someone who administers the browser or device can inspect or change local storage. They do not manage Windows Group Policy, antivirus, a firewall, or the rest of the device.
- **Settings → System → Danger** contains one button, **Clear Browser Data**. A same-family parent must enter their password. A one-use approval expires after 60 seconds. This removes **all LiteOS profiles, files, game libraries, and game saves on that browser**, plus its LiteOS preferences and cookies. It cannot clear other sites or the browser's entire history.

## LiteCraft

LiteCraft is an original single-player voxel sandbox, available from the desktop, Start, and Lite Apps. It uses the default Minecraft texture files supplied by the project owner in `26.3.x-Template.zip` and the MIT-licensed Three.js renderer. Grass, leaves and water receive biome color tints; animated water uses its first frame. Texture artwork is © Mojang / Microsoft, with source paths and checksums in `public/litecraft/textures/manifest.json`. LiteCraft is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft. It does not run Minecraft Java or import Minecraft worlds/mods.

Create a seeded open world in Creative or Survival. Terrain generates in 16 × 16 chunks as you travel, up to ±29,999,984 blocks horizontally, with a build range of Y −64 through 319. The cache holds at most 128 generated chunks (12 MiB of block bytes), while the renderer streams a smaller nearby region. Floating rendering coordinates preserve block precision far from the origin. Only edits and the seed are saved; previously visited unmodified terrain regenerates deterministically. Existing 96 × 96 × 48 island saves remain playable with their original boundaries; create a new world to use the streamed generator. Mine and place blocks, gather ores, craft building materials and a stone pickaxe, fly in Creative, and explore a ten-minute day/night cycle. Survival includes gravity, swimming, limited materials, and fall damage; this first prototype does not include mobs, farming, multiplayer, or Minecraft’s complete feature set.

WASD moves, Space jumps, held left click mines, right click places, 1–9 select a slot, E opens inventory/crafting, F toggles Creative flight, and Escape pauses. Phones use a movement pad, drag-to-look, and action buttons. Fullscreen depends on browser support. WebGL2 provides accelerated graphics. A lower-detail Canvas software renderer is used when WebGL2 is unavailable.

Worlds autosave in IndexedDB per LiteOS profile. Open-world backups use version 2 and store sparse block edits, with a 32 MB import limit; classic island version 1 backups are still accepted. Six worlds per profile are supported. Download a `.liteworld` backup from the pause menu and import it from the world menu; imports create a new copy. Guest storage stays local. The family game-runtime policy gates play; import and share policies gate restore/download. Parent-approved Clear Browser Data also clears LiteCraft worlds. Saves are separate from workspace `.litebackup` files.

## Desktop controls

Use **Ctrl+Space** for Start, **Ctrl+K** for search, and **F9** for Task View. In Start, choose **All apps** to pin or unpin apps, or **Edit pins** to remove favorites. Right-click an empty desktop area for Personalize, Display settings, and Task Manager. On desktop, the title-bar Snap layouts button offers halves and quarters; dragging to the top or side edge also snaps. Restore returns to the earlier window size. On phones, app windows fill the workspace and Task View switches between them.

Click the taskbar clock to browse months or open a dated draft in Notes. Do not disturb keeps notifications in the notification center while suppressing ordinary pop-ups. Preferences and Start pins are saved per local profile and included in encrypted workspace backups.

## Heroes III inside LiteOS

Open **Heroes III** from the desktop or Lite Apps. Choose your installed **Heroes III Complete / Shadow of Death** folder, or a standard ZIP of it. The engine needs `Data/H3bitmap.lod`, `Data/H3sprite.lod`, `Data/Heroes3.snd`, and the rest of the matching game installation. Maps and campaigns are imported; music is optional. A Windows installer, an EXE by itself, and the Steam **HD Edition** are not compatible game data.

**Play Heroes III** enters an isolated LiteOS game workspace when needed. Save open documents first. The real VCMI 1.7.5 WebAssembly engine supports local scenarios, campaigns, random maps, and hotseat. Online multiplayer is disabled. Game files use origin-private browser storage (OPFS), separated by LiteOS profile; they never upload to a server. Reimporting an installation stages and verifies the new files before switching, and keeps existing saves. Only one window can use a profile's installation at a time. Imports support 10,000 compatible files / 4 GB total / 2 GB per file, subject to available device quota. ZIP imports reject traversal, encryption, unsupported compression, and checksum failures.

On a phone, export **game ZIP** from your computer, transfer it to the phone's Files app, and choose that ZIP in LiteOS. The game toolbar offers Right click, Esc, and Fullscreen. The layout adapts to phones, but actual game performance and browser memory limits depend on the device. Use a current browser with OPFS, Web Locks, OffscreenCanvas, WebAssembly threads, and cross-origin isolation. iOS browser features and available memory can differ from desktop browsers. Google browsing remains available in normal desktop mode; save and close games before leaving the isolated workspace.

Save normally inside the game. **Download save backup** creates a `.h3save` file (up to 2,000 files / 64 MB); **Restore saves** merges it and renames collisions. Game saves and installations are separate from `.litebackup` workspace backups. Clearing LiteOS data or browser site storage removes them. Download backups before clearing.

Validation for this release: folder/ZIP planning, malformed archives, export round trips, memory/path limits, profile permissions, and the real WASM binaries are tested. A real browser imported/exported synthetic test files and reached VCMI's native initialization; those synthetic files cannot establish successful gameplay. A full playthrough, graphics/audio, in-game saving, and performance with commercial game data are not verified in this environment.

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

The build downloads the public, open-source Heroes III engine and verifies their pinned sizes and SHA-256 hashes. The Worker stays small; engine binaries and corresponding source archives are deployed as Cloudflare static assets (each file below 25 MB). No commercial game files are part of the repository or build. Keep the build command configured so these assets exist before deployment. The deploy command publishes the Worker directly. It does not provision storage, apply database migrations, or access R2. No database IDs or bucket names are required. This removes the prior `liteos-files` missing-bucket (10085) dependency. If you manually added DB/BUCKET bindings in the Cloudflare dashboard, remove those bindings from this Worker; you can retain the underlying resources. Worker hosting quotas still belong to your Cloudflare account. See [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/).

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

GitHub Actions runs these checks on pushes. `runtime-manifest.json` and `source-archives.json` pin the runtime downloads. `.runtime-cache` and generated `dist` assets are ignored by Git. Engine credits, licenses, and corresponding-source links are available under `public/open-source` and on each game launcher.

The build packages the frontend and server together; the frontend itself can also run from static hosting with local profiles and built-in help. The optional AI route requires the Worker. The app is a browser desktop prototype, not a bootable kernel or a native Windows virtual machine.
