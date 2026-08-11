# MCP Server — GitHub Action

🎯 A **remote automation suite for CI/CD, AI code testing and application testing** — exposes a headless browser, a persistent Ubuntu terminal, an Android emulator and a WebDAV file system running on GitHub Actions, reachable from any MCP-compatible AI client (OpenCode, Claude, Cursor, etc.).

The dynamic `bore.pub` tunnel URLs of every service are saved into an Upstash **Redis** store so *anyone* (with the auth token) can fetch the latest live URL and connect — no IP allowlist, no port forwarding, no fixed domain required.

## 🚀 What it does

- 🎭 **Browser MCP** — headless Chromium (Playwright + CloakBrowser stealth) for end-to-end web testing, scraping and UI verification.
- 🖥️ **Terminal MCP** — a persistent root shell on the GitHub Actions Ubuntu runner — perfect for AI agents that need to run build/test commands, inspect logs, debug pipelines.
- 📱 **Android MCP** — Android 14 emulator (mobile-mcp) for mobile app QA, screenshot/element inspection, APK installs.
- 📂 **WebDAV** — the entire runner filesystem mountable as a network drive, useful for sharing artifacts between your AI agent and the runner.

Every run spawns fresh `bore.pub` tunnels with random ports (`bore.pub:38921` → next run `bore.pub:45102`, etc.). The runner writes each live tunnel URL into a shared Redis namespace (`pw:TUNNEL_URL`, `tm:TUNNEL_URL`, `wd:TUNNEL_URL`), so a client simply reads the latest value from Redis before connecting. Same auth token → same URL family → everyone can hook in.

```
AI client (OpenCode / Claude / Cursor)
    ↓ MCP (SSE / Streamable HTTP)
bore.pub:<latest port>   ← read from Redis
    ↓
GitHub Actions Runner (Ubuntu, 4 cores, 15 GB RAM)
    ├── Playwright MCP   :3002   → pw:TUNNEL_URL
    ├── Terminal MCP      :3004   → tm:TUNNEL_URL
    ├── WebDAV            :3005   → wd:TUNNEL_URL
    └── Android MCP       :3006   (mobile-mcp, via mcp-proxy)
```

## 🚀 Quick Start

### 1. Trigger the runner
Go to **Actions → MCP Server → Run workflow** (or push to `main`).

### 2. Read the latest tunnel URLs from Redis
Use the same Upstash Redis endpoint configured in the secrets:

```bash
# Playwright (browser) tunnel
curl -s "https://<your-upstash>.upstash.io/get/pw:TUNNEL_URL" \
  -H "Authorization: Bearer $REDIS_TOKEN"

# Terminal tunnel — key "tm:TUNNEL_URL"
# WebDAV tunnel   — key "wd:TUNNEL_URL"
```
Append the matching path (`/sse` for MCP services, `/` for WebDAV) to the returned value and connect your AI client (or any HTTP client) to it.

### 3. Point your AI client at the live URL
Replace the `url` field below with the `bore.pub:<port>/sse` returned by Redis:

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "gha-browser": { "type": "remote", "enabled": true, "url": "https://bore.pub:<port>/sse" },
    "gha-shell":   { "type": "remote", "enabled": true, "url": "https://bore.pub:<port>/sse" },
    "gha-android": { "type": "remote", "enabled": true, "url": "https://bore.pub:<port>/sse" }
  }
}
```

## 📁 Project Structure

```
mcp/
├── .github/workflows/
│   └── mcp-server.yml          # Main workflow — installs deps, starts 4 services, watchdog
├── agent_config/
│   └── agent.jsonc             # Example AI agent config (fork & customize)
├── skill/
│   └── gha-server.md           # AI skill file — teaches gha-* MCP tool usage
├── scripts/
│   ├── anydesk-setup.sh         # Optional AnyDesk remote desktop setup (AOSP image)
│   └── stealth-init.js          # 13-vector anti-bot detection bypass patches
├── prompts/
│   └── remote-playwright.md    # AI agent system prompt for using the services
├── stealth-config.json         # Playwright launch options (CloakBrowser, viewport, geo)
└── README.md                   # This file
```

## 🛠️ Features

| Feature | Details |
|---|---|
| 🎭 Browser automation | 23+ Playwright MCP tools, CloakBrowser stealth mode |
| 🖥️ Terminal access | Persistent shell session, full root on Ubuntu runner |
| 📱 Android automation | Android 14 (API 34) emulator, 18+ mobile-mcp tools |
| 📂 File access | WebDAV server, mountable as network drive (Win/Mac/Linux) |
| 🥷 Stealth | navigator.webdriver, plugins, WebGL, Canvas fingerprint, fonts |
| 🔄 Auto-restart | Watchdog loop every 5 s — crashed services + bore disconnects auto-recovered |
| 🔒 Secrets | All credentials kept in GitHub Actions secrets, never in repo/logs |
| 📡 Shared discovery | Latest tunnel URLs pushed to a shared Upstash Redis — anyone with the auth token can connect |
| 🧪 Built for testing | Designed for CI/CD pipelines and AI agents that need to test code or applications end-to-end |

## ⚙️ GitHub Actions Secrets

The workflow reads these from the repo's **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `REDIS_URL` | Upstash Redis URL (stores latest bore tunnel URLs for everyone) |
| `REDIS_TOKEN` | Upstash Redis auth bearer token |
| `AUTH_TOKEN` | Shared token for `/activate` and `/register` endpoints |
| `PLAYWRIGHT_WORKER` | Service URL used by the runner's startup banner / clients (can be the live bore URL or any proxy in front) |
| `TERMINAL_WORKER` | Same, for the Terminal MCP service |
| `WEBDAV_WORKER` | Same, for the WebDAV service |
| `ANDROID_WORKER` | Same, for the Android MCP service |
| `WORKER_PAT` | GitHub PAT for triggering the workflow from external integrations |

## 📱 Android MCP Tools

Available via `mobile-mcp` on the emulator:

| Tool | Description |
|---|---|
| `mobile_list_available_devices` | List connected devices |
| `mobile_take_screenshot` | Screenshot emulator screen |
| `mobile_list_elements_on_screen` | List UI elements with coordinates |
| `mobile_click_on_screen_at_coordinates` | Tap at x,y |
| `mobile_swipe_on_screen` | Swipe up/down/left/right |
| `mobile_type_keys` | Type text into focused element |
| `mobile_press_button` | HOME, BACK, VOLUME, ENTER |
| `mobile_launch_app` | Launch app by package name |
| `mobile_install_app` | Install APK from file path |
| `mobile_open_url` | Open URL in device browser |
| `mobile_get_screen_size` | Get screen dimensions |
| `mobile_set_orientation` | Portrait / landscape |

## ⚠️ Limitations

- Max **6 hours** per run (GitHub Actions limit).
- Runner auto-restart schedule is currently disabled — trigger manually or on push to `main`.
- Anything under `/tmp` is lost on restart — use WebDAV to persist artifacts.
- Android emulator uses KVM acceleration (works on standard `ubuntu-latest` runners).
- After a runner restart, the bore port changes and the new URL is overwritten in Redis — clients must re-fetch it before reconnecting.

## 🔧 Tech Stack

| Component | Technology |
|---|---|
| Compute | GitHub Actions (Ubuntu runner, 4 cores / 15 GB RAM) |
| Tunnels | bore.pub (Rust TCP tunnel, random port per start) |
| Discovery | Upstash Redis (latest tunnel URL for every service) |
| Browser | Playwright MCP + CloakBrowser |
| Terminal | terminal-mcp-server + mcp-proxy |
| Android | mobile-mcp + mcp-proxy (SSE → Streamable HTTP) |
| Files | rclone WebDAV |
| Stealth | Custom JS init script (13 anti-bot patches) |

## 🍴 Fork & Run Your Own

1. **Fork** the repo → you get `yourusername/mcp`.
2. Create an **Upstash Redis** account → note the `REDIS_URL` and `REDIS_TOKEN`.
3. Add all secrets (see the table above) under repo → Settings → Secrets and variables → Actions.
4. (Optional) Customize [`agent_config/agent.jsonc`](agent_config/agent.jsonc) and drop [`skill/gha-server.md`](skill/gha-server.md) into your AI client's skills directory.
5. Trigger **Actions → MCP Server → Run workflow**.
6. Once live, read the tunnel URLs from Redis and point your AI agent at them — start running **CI/CD-side code tests and application tests** from your assistant. 🎉

---

Built for AI-assisted **continuous integration testing** and **application QA** — connect any MCP client and let your agent drive a real Ubuntu box, browser, Android device and filesystem. 🔥
