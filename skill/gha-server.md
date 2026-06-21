---
name: gha-server
description: "MANDATORY: Read this skill BEFORE using any gha-* MCP tool (gha-shell, gha-browser, gha-android, etc.). ONLY use when a gha-* MCP tool is connected; if not connected, do NOT read this skill and tell the user to enable GHA MCP first. Covers the makeshift Ubuntu environment on GitHub Actions (browser, shell, android, file storage). Triggers on: 'gha', 'use gha', 'gha browser', 'gha shell', 'gha android', 'remote browser', 'remote android', 'remote computer', 'gha server', 'browser'."
---

# GHA Server — Remote Ubuntu via GitHub Actions

## 🚨 CHECK MCP CONNECTION FIRST

> **BEFORE reading this skill:** Verify that a `gha-*` MCP tool (e.g., `gha-shell`, `gha-browser`, `gha-android`) is **connected** in your environment.
>
> - ✅ **If connected** → Continue reading this skill normally.
> - ❌ **If NOT connected** → **STOP.** Do not read this skill. Instead, tell the user: *"GHA MCP tools (gha-shell / gha-browser / gha-android) are not connected. Please enable them first to use the remote GitHub Actions server."*
>
> This skill only applies when GHA MCP tools are active. Without them, nothing described here will work.

---

## ⚠️ READ THIS SKILL BEFORE USING gha-browser OR gha-shell

> **Mandatory:** Always read and understand this skill **before** invoking `gha-browser` (browser automation), `gha-shell` (remote terminal), or `gha-android` (Android emulator). These tools run on a remote GitHub Actions runner — behavior, paths, and limitations differ from local tools.

---

## 🖥️ Local vs GHA — Know the Difference

| Environment | What It Is | How to Access | Tools |
|-------------|-----------|---------------|-------|
| **Your Local Server / Terminal** | The machine you are currently chatting with — the AI's local environment. All `bash`, `read`, `write`, `edit` tools run here. | Direct — runs on your machine | `bash`, `read`, `write`, `edit`, `glob`, `grep` |
| **GHA Server** | A **remote Ubuntu machine** spun up via GitHub Actions — a separate, external computer. NOT your local machine. | Via MCP tools only — `gha-shell`, `gha-browser`, `gha-android` | `gha-shell` (terminal), `gha-browser` (browser), `gha-android` (Android), WebDAV (files) |

> ⚠️ **Key Point:** `gha-shell` runs on a **different machine** in the cloud. Files you create with `bash` (local) are NOT visible to `gha-shell` (remote), and vice versa. They are completely separate environments.

---

## What Is GHA?

GHA (GitHub Actions) is a **makeshift Ubuntu environment** running on a GitHub Actions runner. It is NOT a cloud service or local tool — it is a **jugaad** (hack) that turns GitHub's free CI/CD runners into a persistent remote computer with:

- 🎭 **A headless Chromium browser** (with stealth/anti-bot patches)
- 🖥️ **A persistent shell** (full Ubuntu terminal access)
- 📱 **An Android emulator** (Android 14 / API 34, pixel_6) with mobile-mcp automation
- 📂 **A WebDAV file server** (browse/download/upload files via browser or mount as network drive)

All three run on the **same Ubuntu machine**. Files created by the browser or shell are visible via WebDAV instantly.

### Key Facts

| Spec | Value |
|------|-------|
| OS | Ubuntu Latest |
| CPU | 4 cores |
| RAM | ~15 GB |
| Disk | ~90 GB free |
| Internet | Unrestricted |
| Uptime | Max 6 hours per run (auto-restarts every 4h) |
| Cost | **Free** (GitHub free tier) |

---

## 📸 Screenshots vs DOM Snapshots — When to Use What

| Approach | When to Use |
|----------|-------------|
| **`browser_snapshot`** (default) | ✅ **ALWAYS prefer this first** — page structure, text, elements, debugging |
| **`browser_take_screenshot`** | Only when user **explicitly asks** for a screenshot |

### Rule of Thumb
1. **Start with `browser_snapshot`** — it returns the page DOM as structured text (headings, buttons, forms, errors). Perfect for debugging, testing, and form interaction.
2. **Use `browser_take_screenshot` ONLY if the user explicitly asks for it.**

---

## Screenshots — Where & How

When using `browser_take_screenshot`, the save location depends on the `filename` parameter:

| Case | Save Location | Example |
|------|---------------|---------|
| **No filename given** | Auto-saves to `/tmp/storage/screenshots/` with timestamp | `page-2026-06-02T11-00-35-797Z.png` |
| **Only filename (no path)** | Saves to current working directory `/home/runner/work/REPO/REPO/` | `test-relative.png` |
| **Full path given** | Saves to exact specified path | `/tmp/storage/screenshots/test-full-path.png` |

### AI vs User — Who Sees What?

| Who | Method | How |
|-----|--------|-----|
| **AI (You)** | `browser_take_screenshot` with `type: "png"` | The image is returned as **attached media** in the tool result — the AI model "sees" it directly. ✅ |
| **User** | HTML `<img>` tag with **WebDAV URL** | The user sees the rendered image in the chat interface. No other method works for users. ✅ |

> ⚠️ **Critical:** `browser_take_screenshot` alone does **NOT** show the image to the user. The tool result attachment is only visible to the AI. To show the user, you **must** send an HTML `<img>` tag pointing to the WebDAV URL.

### How to Show Screenshots to the User

**Always use this exact pattern:**

```html
<img src="https://webdav-runner.YOUR_SUBDOMAIN.workers.dev/tmp/storage/screenshots/FILENAME.png" alt="Description" style="max-width:100%; border-radius:8px;">
```

**Step-by-step:**
1. Save screenshot to `/tmp/storage/screenshots/` (e.g., `filename: "/tmp/storage/screenshots/my-screenshot.png"`)
2. The file is instantly available at: `https://webdav-runner.YOUR_SUBDOMAIN.workers.dev/tmp/storage/screenshots/my-screenshot.png`
3. Send the HTML `<img>` tag in your response — the user will see the image rendered in chat

**Alternative ways (for reference):**
- **Direct WebDAV URL in chat:** Users can open the URL directly in browser
- **`webfetch` tool:** If the model supports image viewing, use `webfetch` with the WebDAV URL directly — no download needed! This works for any image stored in GHA:
  ```
  webfetch(url: "https://webdav-runner.YOUR_SUBDOMAIN.workers.dev/tmp/storage/screenshots/screenshot.png")
  ```
- **Download then view:** Use `curl` to download locally, then `read` tool to display
- **WebDAV browser:** Visit `https://webdav-runner.YOUR_SUBDOMAIN.workers.dev/` to browse all files

### Quick Reference
- **Screenshots dir:** `/tmp/storage/screenshots/`
- **WebDAV base:** `https://webdav-runner.YOUR_SUBDOMAIN.workers.dev/`
- **Working dir:** `/home/runner/work/REPO/REPO/`

---

## GHA Files → Local Terminal

To bring any file from the GHA server to your local terminal, simply **download it from the WebDAV URL** using `curl` or `wget`:

```bash
curl -o local-filename.png "https://webdav-runner.YOUR_SUBDOMAIN.workers.dev/tmp/storage/screenshots/screenshot.png"
```

That's it! Any file created on GHA (screenshots, downloads, logs) can be fetched this way.

---

## ⚠️ GHA Operations → Always Use `gha-shell`

If you need to run **any operation on the GHA server** (install packages, edit files, run scripts, process data), **always use `gha-shell`**, NOT your local terminal.

- `gha-shell` runs commands **inside** the GitHub Actions runner
- Local terminal runs commands on **your own machine**

Example — run this on GHA:
```
execute_command(command: "apt install -y ffmpeg", session: "main")
```

Example — NOT on local terminal:
```bash
apt install -y ffmpeg  # ❌ This runs on YOUR machine, not GHA!
```

---

## Available MCP Tools

These appear in OpenCode as MCP servers. **Always read this skill before using them.**

### 🎭 gha-browser (Playwright MCP)

**URL:** `https://playwright-runner.YOUR_SUBDOMAIN.workers.dev/sse`

Full headless Chromium with stealth patches. 23+ browser automation tools:

| Tool | What It Does |
|------|------|
| `browser_navigate` | Open any URL |
| `browser_click` | Click elements |
| `browser_type` | Type into inputs |
| `browser_take_screenshot` | Take screenshot (saves to `/tmp/storage/screenshots/`) |
| `browser_evaluate` | Run JavaScript in page |
| `browser_fill_form` | Fill entire forms |
| `browser_network_requests` | Monitor network traffic |
| `browser_file_upload` | Upload files to page |
| `browser_snapshot` | Get page DOM snapshot |
| `browser_wait` | Wait for elements |

**Stealth features:** Patches `navigator.webdriver`, fakes plugins/chrome object, WebGL/Canvas fingerprint noise, realistic user-agent, geolocation (NYC), custom viewport (1920x1080).

### 🖥️ gha-shell (Terminal MCP)

**URL:** `https://terminal-runner.YOUR_SUBDOMAIN.workers.dev/sse`

Persistent shell session on the runner. State persists between commands — `cd`, env vars, background processes all survive.

```
execute_command(command: "ls /tmp/storage", session: "main")
execute_command(command: "cd /tmp && pwd", session: "main")
execute_command(command: "apt list --installed 2>/dev/null | head", session: "main")
```

**You have full root access.** Install packages, run scripts, download files, anything Ubuntu can do.

### 📱 gha-android (Android MCP via mobile-mcp)

**URL:** `https://android-runner.YOUR_SUBDOMAIN.workers.dev/sse`

Android emulator (API 34, pixel_6, google_apis x86_64) running headless on the runner. Full mobile automation via `mobile-mcp` — tap, swipe, type, install APKs, take screenshots, and interact with any app.

**Available tools:**

| Tool | What It Does |
|------|------|
| `mobile_list_available_devices` | List connected devices/emulators |
| `mobile_get_screen_size` | Get screen size in pixels |
| `mobile_get_orientation` / `mobile_set_orientation` | Get/set portrait/landscape |
| `mobile_list_apps` | List all installed apps |
| `mobile_launch_app` | Launch app by package name |
| `mobile_terminate_app` | Stop a running app |
| `mobile_install_app` | Install APK from file path (`.apk`) |
| `mobile_uninstall_app` | Uninstall app by package name |
| `mobile_take_screenshot` | Screenshot the emulator screen |
| `mobile_save_screenshot` | Save screenshot to a file |
| `mobile_list_elements_on_screen` | List UI elements with coordinates |
| `mobile_click_on_screen_at_coordinates` | Tap at x,y coordinates |
| `mobile_double_tap_on_screen` | Double-tap at coordinates |
| `mobile_long_press_on_screen_at_coordinates` | Long press at coordinates |
| `mobile_swipe_on_screen` | Swipe up/down/left/right |
| `mobile_type_keys` | Type text into focused element |
| `mobile_press_button` | Press HOME, BACK, VOLUME_UP/DOWN, ENTER |
| `mobile_open_url` | Open URL in device browser |

**Key details:**
- Emulator runs **headless** (no GUI window) — use `mobile_take_screenshot` to see screen
- Animations are disabled for speed
- APK files can be uploaded via WebDAV first, then installed with `mobile_install_app`
- Use `mobile_list_elements_on_screen` to find element coordinates before tapping
- Screenshots can be shared with user via WebDAV URLs (same as browser screenshots)

### 📂 WebDAV (File Access)

**URL:** `https://webdav-runner.YOUR_SUBDOMAIN.workers.dev/`

**⚠️ CRITICAL: All GHA services (browser, shell, android, WebDAV) run on the SAME Ubuntu machine and share the SAME disk.**

When you open `https://webdav-runner.YOUR_SUBDOMAIN.workers.dev/` in a browser, it shows an **HTML page** with the GitHub Actions runner's **entire root filesystem (`/`)** — you can browse, download, upload, and delete files just like a file manager.

**For AI/Models:** You can scrape the WebDAV URL using `webfetch` in **markdown mode** to explore the filesystem programmatically:
```
webfetch(url: "https://webdav-runner.YOUR_SUBDOMAIN.workers.dev/tmp/storage/screenshots/", format: "markdown")
```

**For Users:** Open the URL in any browser to see an HTML file manager interface.

#### Mount as Network Drive

**Windows:**
```
net use Z: https://webdav-runner.YOUR_SUBDOMAIN.workers.dev /persistent:no
```

**Mac (Finder → Go → Connect to Server):**
```
https://webdav-runner.YOUR_SUBDOMAIN.workers.dev
```

**Linux:**
```bash
sudo mount -t davfs https://webdav-runner.YOUR_SUBDOMAIN.workers.dev /mnt/runner
```

After mounting, the runner's filesystem works like a local drive — drag & drop, copy-paste.

---

## Important Rules

1. **All services share the same machine AND disk.** gha-browser, gha-shell, gha-android, and WebDAV all run on the same Ubuntu machine. A screenshot taken by gha-browser or gha-android is instantly visible via WebDAV. A file created by gha-shell is instantly visible in the browser. The entire filesystem (`/`) is shared across all services.

2. **Use `session: "main"` for gha-shell.** This keeps one persistent session across all commands.

3. **Screenshots auto-save.** `browser_take_screenshot` saves to `/tmp/storage/screenshots/`. Use WebDAV to retrieve them.

4. **Uptime is limited.** The runner auto-restarts every 4 hours. After restart, files in `/tmp` are lost. Store important files elsewhere or download them via WebDAV before restart.

5. **Runner may be offline.** If MCP tools fail, the runner might be down. Visit the worker URL in a browser — an offline page with a "Start Runner" button will appear.

6. **Security.** The WebDAV server exposes the entire filesystem (`/`). Anyone with the URL can read/write files. The runner resets on restart, so damage is temporary.

---

## 🔄 Runner Down? Here's What To Do

The GitHub Actions runner has a **6-hour max uptime**. After that (or if it crashes), MCP tools will fail. Here's the exact recovery procedure:

### Signs the Runner is Down

| Symptom | Meaning |
|---|---|
| MCP tool call → `502 Bad Gateway` or `Runner unreachable` | Runner is offline / bore tunnel dead |
| MCP tool call → `503` with offline HTML page | No runner registered — needs to be started |
| MCP tool call → `Invalid session` or `Session not found` | Old dead session ID — runner restarted, new session needed |
| MCP tool call → timeout / no response | Bore tunnel disconnected or service crashed |
| `browser_navigate` → connection refused | Playwright MCP process dead |

### Recovery Steps

**Step 1: Identify which service is down**

Check which MCP tool is failing:
- `gha-browser` tools failing → `playwright-runner.YOUR_SUBDOMAIN.workers.dev`
- `gha-shell` tools failing → `terminal-runner.YOUR_SUBDOMAIN.workers.dev`
- `gha-android` tools failing → `android-runner.YOUR_SUBDOMAIN.workers.dev`
- WebDAV failing → `webdav-runner.YOUR_SUBDOMAIN.workers.dev`

**Step 2: Check runner status**

```
curl https://SERVICE-runner.YOUR_SUBDOMAIN.workers.dev/status
```

If `active: false` → runner is down, go to Step 3.
If `active: true` → runner is up but session is stale, go to Step 4.

**Step 3: Start the runner (call /activate)**

Trigger the GitHub Actions workflow via the worker's activate endpoint:

```bash
curl "https://SERVICE-runner.YOUR_SUBDOMAIN.workers.dev/activate?token=YOUR_AUTH_TOKEN"
```

Or use `gha-shell` if it's still working:
```
execute_command(command: "curl -s 'https://SERVICE-runner.YOUR_SUBDOMAIN.workers.dev/activate?token=YOUR_AUTH_TOKEN'", session: "main")
```

Or tell the user: *"The remote runner is down. I've triggered a restart. Please wait 2-3 minutes for it to boot, then reconnect the MCP server."*

The workflow takes ~2-3 minutes to:
1. Boot the Ubuntu runner
2. Install dependencies
3. Start all 4 services
4. Create bore tunnels
5. Register tunnel URLs to Redis

**Step 4: Tell the user to reconnect MCP (CRITICAL!)**

> ⚠️ **This step is MANDATORY.** Even after the runner restarts, MCP tool calls will fail with `Invalid session` if you don't reconnect.

After the runner is back online, you MUST tell the user:

*"The runner has restarted. Please reconnect the MCP server so I can get a fresh session ID:*

*1. Go to MCP settings*
*2. Toggle the MCP server OFF, then ON again*
*   — OR —*
*3. Remove the MCP server and re-add it*
*4. Wait for it to show 'connected'*

*Until you do this, my old session ID is stale and all MCP calls will fail with 'Invalid session' or 'Session not found'."*

### Why Reconnect is Needed

```
Before restart:                          After restart:
┌─────────────┐                         ┌─────────────┐
│ AI Agent    │                         │ AI Agent    │
│ sessionId=  │    ← stale session      │ sessionId=  │
│   abc-123   │    ← runner doesn't     │   abc-123   │
│             │      know this ID       │             │
└──────┬──────┘                         └──────┬──────┘
       ↓ MCP call                              ↓ MCP call
┌─────────────┐                         ┌─────────────┐
│ Worker      │                         │ Worker      │
│ (proxy)     │                         │ (proxy)     │
└──────┬──────┘                         └──────┬──────┘
       ↓                                      ↓
┌─────────────┐                         ┌─────────────┐
│ bore tunnel │                         │ bore tunnel │
│ abc-123     │                         │ xyz-789     │ ← NEW session!
│ (DEAD)      │                         │ (FRESH)     │
└─────────────┘                         └─────────────┘
```

When the runner restarts:
- Bore tunnel gets a **new port** → Worker proxies to new URL
- MCP server (SSE) creates **new session IDs** → old `abc-123` is gone
- AI agent still holds **old session ID** → every call = `Session not found`
- Reconnecting MCP = AI agent opens **new SSE stream** → gets **fresh session ID** → calls work again

### Quick Recovery Checklist

1. ✅ Detect failure (tool error / timeout / invalid session)
2. ✅ Check `/status` endpoint
3. ✅ Call `/activate?token=YOUR_AUTH_TOKEN` if down
4. ✅ Wait 2-3 min for runner to boot
5. ✅ Tell user to **reconnect MCP** (toggle off/on or remove+add)
6. ✅ Test with a simple tool call after reconnect

---

## Architecture

```
OpenCode (AI)
    ↓ MCP (SSE)
Cloudflare Workers (static URLs, always online)
    ↓ bore.pub tunnel (auto-reconnect)
GitHub Actions Runner (Ubuntu, 6h max)
    ├── Playwright MCP :3002  →  playwright-runner.worker.dev
    ├── Terminal MCP   :3004  →  terminal-runner.worker.dev
    ├── WebDAV         :3005  →  webdav-runner.worker.dev
    └── Android MCP    :3006  →  android-runner.worker.dev
```

Each service has its own Cloudflare Worker + bore tunnel — one crashing doesn't affect the others. A watchdog monitors all services every 5 seconds and auto-restarts crashed processes + reconnects dead tunnels.
