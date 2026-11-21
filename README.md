# LiteOS

**A little lighter. A lot more you.**

LiteOS is a working browser desktop inspired by the Windows 10 interface. It has its own Lite apps, LiteFS virtual file structure, and a small batch-inspired language called LiteScript. It adapts to desktop, tablet, and phone screens.

This is a **browser OS prototype**, not a bootable kernel or a Windows virtual machine. GitHub stores the source; Cloudflare Workers runs the server. Do not use GitHub Pages or a static-only Cloudflare upload for the cloud features.

## What works

- Move, resize, minimize, and maximize desktop windows; taskbar, search, Start screen, quick settings, clock, lock screen, touch layouts, and keyboard shortcuts.
- Persistent device guest files, or private cloud files under password-protected accounts.
- Lite Files: folders, text documents, import, rename, preview, download, Recycle Bin, restore, permanent deletion, expiring download links, and share revocation.
- Lite Notes: edit and save plain text and `.lite` scripts, download documents, and protect unsaved work.
- Lite Assistant: server-connected Ollama, Groq, or Gemini, with local LiteOS help in guest mode. AI cannot silently access your files or act on your behalf.
- Lite Terminal: bounded LiteScript interpreter with quoted paths, variables, file operations, and app launching. No host shell or JavaScript eval.
- Lite Paint, Photos, Calculator, Mines, and pass-and-play Tic-tac-toe.
- Lite Store: install web shortcuts as `.liteapp` files. Open HTML apps inside an isolated sandbox.
- Settings: wallpapers, custom photos, light/dark/device theme, accent colors, transparency, large text, high contrast, reduced motion, lock duration, session management, family accounts, group policies, share expiry, upload limits, privacy information, network checks, and audit export.
- Parent and child accounts with separate private file spaces. Children cannot use cloud AI or create public shares by default.
- **Settings → System → Danger** has one button, **Clear Browser Data**, which requires password approval from a parent in the same family. It clears LiteOS data on this browser and signs out its session. It does not delete cloud files or another website’s data.

## Windows and Steam apps

Windows `.exe`, `.msi`, Steam files, and other native applications can be imported and downloaded. They **do not execute inside LiteOS**. Cloudflare does not host a Windows desktop or a GPU game server. Google and similar websites open in normal browser tabs because many sites block embedding. Remote Windows accepts a URL for a compatible, separately running browser streaming service. No streaming service is included; providers that require same-origin iframe privileges or block framing must be opened in a separate tab.

## Import this GitHub repository into Cloudflare

Use **Workers & Pages → Create application → Import a repository** and choose this repository as a **Worker**, not a Pages static site.

| Setting | Value |
| --- | --- |
| Branch | `main` |
| Root directory | Leave blank |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Runtime | Node.js 22 or newer for builds |

Wrangler automatically provisions the `DB` D1 database and `BUCKET` R2 bucket declared in `wrangler.jsonc`. The deploy script deploys the Worker and applies the committed SQL migrations. **Your Cloudflare account must have R2 enabled** for file imports. R2 activation may require a billing profile even while usage is inside its free allowance; this project does not claim that activation is available without one. Worker, D1, R2 and AI provider quotas remain account-specific.

Official references: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [automatic provisioning](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [R2](https://developers.cloudflare.com/r2/).

The hosted review copy already has the previously supplied Ollama key installed as an encrypted server secret. A live check confirmed that the key is valid, but Ollama currently returns HTTP 402 because that account has no inference credits. LiteOS falls back to clearly labeled built-in help; cloud AI becomes usable when the existing provider account has credits. No new key is needed. **Secrets are not copied by GitHub import.** On your separate Cloudflare Worker, reuse that same key as the `OLLAMA_API_KEY` secret; a new key is not necessary. `AI_MODEL` defaults to `gemma4:31b`. An existing Groq or Gemini key is also supported as `GROQ_API_KEY` or `GEMINI_API_KEY`, with a matching `AI_MODEL` value. Never put a key in GitHub, a `.lite` file, an app manifest, a URL, or browser code.

When using Wrangler locally, install a secret without putting it on a command line:

```sh
npx wrangler secret put OLLAMA_API_KEY
```

Paste the existing key at the hidden prompt. The cloud provider key is shared by authenticated LiteOS users on that deployment; each user is limited to 20 AI requests per hour. Sharing a deployment with many people can consume the provider’s quota.

## Run locally

Install [Node.js 22+](https://nodejs.org/) and run:

```sh
npm ci
npm run dev
```

The development command creates a local D1 database, applies migrations, builds the app, and starts Wrangler at `http://localhost:3000`. It watches `public/` and `worker/`. For local AI only, put `OLLAMA_API_KEY` in an ignored `.dev.vars` file; never commit that file. Production secrets remain separate.

```sh
npm test
npm run build
npm run validate
```

## First use

Guest mode works immediately and stores files in IndexedDB. Choose the profile icon to create a cloud account; this starts a new family with a parent. Create child accounts through **Settings → Accounts → Family**. Each family member uses a globally unique username. Names, passwords, and files do not come from your GitHub account. There is no hardcoded default password, email verification, email password recovery, or shared guest password. Save your password; password recovery is not included in this prototype.

Family policies are stored on the server. AI, file-import, and public-sharing restrictions are checked on every corresponding request; disabling sharing also disables existing links. Terminal and external-app restrictions govern the LiteOS interface and cannot restrict the phone’s browser or the underlying operating system. Family roles do not grant parents read access to another member’s private files.

## LiteFS

| Path | Purpose |
| --- | --- |
| `L:/Home/Desktop` | Personal desktop files |
| `L:/Home/Documents` | Text and scripts |
| `L:/Home/Downloads` | Imported downloads |
| `L:/Home/Pictures` | Photos and paintings |
| `L:/Home/Projects` | Project folders |
| `L:/Home/Apps` | Web app manifests |

Folder entries and small text are stored in D1. Imported file bytes are stored in R2. A cloud account has a 250 MB prototype file allowance and up to 20 MB per imported file, reducible by a parent. Browser guest storage depends on available browser quota and can be evicted by the browser. A preference cookie stores only theme/wallpaper identifiers; the authenticated session cookie is HttpOnly, Secure on HTTPS, SameSite=Strict, with an opaque random token stored as a SHA-256 hash on the server. Passwords use per-user salts and PBKDF2-HMAC-SHA256 at 100,000 iterations, compatible with Workers WebCrypto. TLS protects transport; this is not end-to-end encrypted storage.

## LiteScript

```bat
@echo off
rem A first script
set NAME=friend
echo Hello, %NAME%!
mkdir Projects/Demo
write "Projects/Demo/My note.txt" Made with LiteScript
type "Projects/Demo/My note.txt"
open notes
```

Supported: `HELP`, `ECHO`, `SET`, `DIR`, `CD`, `PWD`, `MKDIR`, `TYPE`, `WRITE`, `APPEND`, `COPY`, `MOVE`, `DEL`, `OPEN`, `DATE`, `WHOAMI`, `VER`, `CLEAR`, `CLS`, `REM`. Quotes preserve spaces. Variables use `%NAME%`. `DEL` moves a file to Recycle Bin. Commands run within `L:/Home`; scripts cannot access host files, run Windows commands, execute JavaScript, change server policies, or bypass permissions. There are no loops, network commands, or executable installers. Scripts have a 200-line limit per execution.

## Web apps

Save a JSON manifest under `L:/Home/Apps/My app.liteapp`:

```json
{"name":"My app","url":"https://example.com","mode":"external"}
```

`external` opens a separate tab. `embedded` runs an HTTPS site in a sandbox without same-origin access to LiteOS; the site must support embedding. Imported HTML runs with scripts and forms in an opaque sandbox, with no same-origin access, popups, or top-level navigation. Not all third-party apps are compatible.

## Security integration and prototype limits

Parents can download up to 200 recent family events as structured JSON from Lite Security or Settings → Security → Audit log. Integrate that export with your own SIEM. No antivirus engine, host group-policy editor, firewall control, continuous SIEM delivery, or device-level parental filtering is included. The audit log records cloud actions; it does not monitor another website or the host OS.

The account API rejects cross-origin state-changing requests, rate-limits sign-in attempts, checks file ownership, and uses one-use short-lived parent approvals. The test suite covers authentication, cross-account access, child policies, share revocation, parent approval boundaries, password changes, path traversal, and LiteScript sandbox boundaries. This is a prototype, without a production security audit, MFA, account recovery, backups, or storage malware scanning.

## Source map

- `public/`: browser interface, styles, icons, generated LiteOS wallpaper, LiteScript interpreter.
- `worker/`: Cloudflare-compatible API, session, permissions, and file logic.
- `drizzle/`: schema migrations and migration journal.
- `scripts/`: deterministic packaging, local development, deployment.
- `tests/`: real-SQL security and interpreter checks.
- `wrangler.jsonc`: Cloudflare Worker and logical storage bindings.

The build embeds static assets in the Worker module for a portable deployment. No external front-end CDN is required. The LiteOS wallpaper is an original generated asset; the interface uses original SVG icons and Lite branding.
