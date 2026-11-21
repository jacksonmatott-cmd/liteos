# LiteOS 0.2 — Device edition

**A little lighter. A lot more you.**

LiteOS is a Windows-inspired browser desktop for computers, tablets, and phones. This edition needs **no hosted database, R2 bucket, storage subscription, or billing setup for its files and accounts**. Files, profiles, passwords, settings, and family policies are saved in the browser's free IndexedDB storage. GitHub stores the source; a small Cloudflare Worker serves the application and optional AI endpoint.

## Included

- Desktop windows, Start screen, taskbar, search, lock screen, touch layout, custom backgrounds, themes, and accessibility settings.
- **Google inside LiteOS:** Google and Lite Browser open an actual Google webpage in an embedded browser window. The LiteOS address bar searches in that same frame. Focus, Start, minimize, and restore preserve the frame. This uses Google's currently frame-compatible `webhp?igu=1` / `search?igu=1` views, not a screenshot, proxy, or a replacement search launcher. Google can change these views or show a bot check. Some destinations and Google sign-in block framing; the help button offers a separately opened tab when needed. Native Chrome is not installed or executed.
- Lite Write, Sheets with formulas and CSV import/export, Notes, Files, Paint, Photos, Calculator, Mines, and Tic-tac-toe run inside LiteOS.
- Single-file HTML apps run in an isolated, offline sandbox. Compatible HTTPS web apps can also be embedded. An App Center includes a working Counter demo and an HTML app editor. Windows EXE/MSI files and Steam games can be stored and downloaded; they need a compatible remote Windows host to execute.
- LiteFS folders, import, rename, preview, downloads, Recycle Bin, restore, permanent deletion, and batch-inspired LiteScript commands.
- Password-protected local parent and child profiles with separate file spaces. Passwords use salted PBKDF2-SHA256 hashes (210,000 iterations). There are no built-in passwords. Local profiles do not authenticate to GitHub or Google.
- Parent-approved group policy changes and a local audit log for security-tool exports. Children have AI, Share, and external websites disabled by default. These are LiteOS interface controls; someone who administers the browser or device can inspect or change local storage. They do not manage Windows Group Policy, antivirus, a firewall, or the rest of the device.
- **Settings → System → Danger** contains one button, **Clear Browser Data**. A same-family parent must enter their password. A one-use approval expires after 60 seconds. This removes **all LiteOS profiles and files on that browser**, plus its LiteOS preferences and cookies. It cannot clear other sites or the browser's entire history.

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

The deploy command publishes the Worker directly. It does not provision storage, apply database migrations, or access R2. No database IDs or bucket names are required. This removes the prior `liteos-files` missing-bucket (10085) dependency. If you manually added DB/BUCKET bindings in the Cloudflare dashboard, remove those bindings from this Worker; you can retain the underlying resources. Worker hosting quotas still belong to your Cloudflare account. See [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/).

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

GitHub Actions runs these checks on pushes. The build packages the frontend and server together; the frontend itself can also run from static hosting with local profiles and built-in help. The optional AI route requires the Worker. The app is a browser desktop prototype, not a bootable kernel or a native Windows virtual machine.
