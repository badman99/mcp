# MCP Server - GitHub Actions

🎭 **Full remote automation suite** — browser, terminal, Android emulator, and file access — running on GitHub Actions via bore.pub tunnels + Cloudflare Workers.

## 🚀 Quick Start

### 1. Trigger Workflow
Go to **Actions → Playwright MCP Server → Run workflow**

Or hit the activate endpoint:
```
https://playwright-runner.badman993944.workers.dev/activate?token=mcp-runner-2026
```

### 2. Service URLs

| Service | URL | Description |
|---|---|---|
| 🎭 Playwright MCP | `https://playwright-runner.badman993944.workers.dev/sse` | Headless Chromium browser automation (stealth mode) |
| 🖥️ Terminal MCP | `https://terminal-runner.badman993944.workers.dev/sse` | Persistent shell on Ubuntu runner |
| 📂 WebDAV | `https://webdav-runner.badman993944.workers.dev/` | File system access (mountable as network drive) |
| 📱 Android MCP | `https://android-runner.badman993944.workers.dev/sse` | Android 14 emulator automation (mobile-mcp) |

## 📝 Configuration

### OpenCode
Add to your `opencode.jsonc`:
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "gha-browser": {
      "type": "remote",
      "enabled": true,
      "url": "https://playwright-runner.badman993944.workers.dev/sse"
    },
    "gha-shell": {
      "type": "remote",
      "enabled": true,
      "url": "https://terminal-runner.badman993944.workers.dev/sse"
    },
    "gha-android": {
      "type": "remote",
      "enabled": true,
      "url": "https://android-runner.badman993944.workers.dev/sse"
    }
  }
}
```

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "type": "sse",
      "url": "https://playwright-runner.badman993944.workers.dev/sse"
    },
    "terminal": {
      "type": "sse",
      "url": "https://terminal-runner.badman993944.workers.dev/sse"
    },
    "android": {
      "type": "sse",
      "url": "https://android-runner.badman993944.workers.dev/sse"
    }
  }
}
```

### Claude.ai (Web)
Settings → Custom Integrations → Add connector:
- **Playwright**: `https://playwright-runner.badman993944.workers.dev/sse`
- **Terminal**: `https://terminal-runner.badman993944.workers.dev/sse`
- **Android**: `https://android-runner.badman993944.workers.dev/sse`

## 🏗️ Architecture

```
OpenCode / Claude / Cursor (AI Client)
    ↓ MCP (SSE / Streamable HTTP)
Cloudflare Workers (static URLs, always online)
    ↓ Redis lookup (latest bore tunnel port)
bore.pub tunnel (auto-reconnect on disconnect)
    ↓
GitHub Actions Runner (Ubuntu, 4 cores, 15GB RAM)
    ├── Playwright MCP  :3002  →  playwright-runner.worker.dev
    ├── Terminal MCP    :3004  →  terminal-runner.worker.dev
    ├── WebDAV          :3005  →  webdav-runner.worker.dev
    └── Android MCP     :3006  →  android-runner.worker.dev
```

### How the Static URL Works

`bore.pub` assigns a **random port** each run (`bore.pub:38921` → next run `bore.pub:45102`). The Cloudflare Workers solve this:

1. **Runner starts** → creates bore tunnel → saves URL to Redis + KV
2. **Worker receives request** → reads latest tunnel URL from Redis → proxies request
3. **Bore crashes** → watchdog restarts it → updates Redis with new URL
4. **User always hits** the same static Cloudflare URL — no need to know the dynamic port

```
User → static URL (Worker) → Redis (latest bore port) → bore.pub:XXXXX → GitHub Actions
```

See [`Cf_Workers/README.md`](Cf_Workers/README.md) for full worker code and deployment instructions.

## 📁 Project Structure

```
mcp/
├── .github/workflows/
│   └── mcp-server.yml            # Main workflow — installs deps, starts 4 services, watchdog
├── Cf_Workers/                   # Cloudflare Worker source code
│   ├── playwright-runner/        # Browser MCP proxy (KV + Redis)
│   ├── terminal-runner/          # Terminal MCP proxy (KV + Redis)
│   ├── webdav-runner/            # WebDAV proxy (KV + Redis, WebDAV CORS methods)
│   ├── android-runner/           # Android MCP proxy (KV + Redis, SSE + /mcp support)
│   └── README.md                 # Worker deployment guide
├── agent_config/                 # Example AI agent config (fork & customize)
│   └── agent.jsonc               # OpenCode/Claude MCP config with YOUR_SUBDOMAIN placeholders
├── skill/                        # Example AI skill definition
│   └── gha-server.md             # Skill file — teaches AI how to use gha-* MCP tools
├── scripts/
│   └── stealth-init.js           # Anti-bot detection bypass patches (13 vectors)
├── prompts/
│   └── remote-playwright.md      # AI agent system prompt for using the services
├── stealth-config.json           # Playwright launch options (CloakBrowser, viewport, geo)
└── README.md                     # This file
```

## 🛠️ Features

| Feature | Details |
|---|---|
| 🎭 Browser automation | 23+ Playwright MCP tools, CloakBrowser stealth mode |
| 🖥️ Terminal access | Persistent shell session, full root on Ubuntu |
| 📱 Android automation | Android 14 (API 34) emulator, 18+ mobile-mcp tools |
| 📂 File access | WebDAV server, mountable as network drive (Win/Mac/Linux) |
| 🥷 Stealth | navigator.webdriver, plugins, WebGL, Canvas fingerprint, fonts |
| 🔄 Auto-restart | Watchdog every 5s — crashes + bore disconnects auto-recovered |
| 🔒 Secrets | All credentials in GitHub Actions secrets, not in logs |
| 🌐 Static URLs | Cloudflare Workers + Redis — URL never changes |

## ⚙️ GitHub Actions Secrets

The workflow uses these secrets (set in repo Settings → Secrets and variables → Actions):

| Secret | Description |
|---|---|
| `REDIS_URL` | Upstash Redis URL (stores bore tunnel ports) |
| `REDIS_TOKEN` | Upstash Redis auth token |
| `AUTH_TOKEN` | Worker auth token for /register and /activate |
| `PLAYWRIGHT_WORKER` | Playwright Cloudflare Worker URL |
| `TERMINAL_WORKER` | Terminal Cloudflare Worker URL |
| `WEBDAV_WORKER` | WebDAV Cloudflare Worker URL |
| `ANDROID_WORKER` | Android Cloudflare Worker URL |
| `WORKER_PAT` | GitHub PAT for workflow trigger from Workers |

## 📱 Android MCP Tools

Available via `mobile-mcp` on the Android emulator:

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

- Max **6 hours** per run (GitHub Actions limit)
- Runner auto-restarts every 4 hours (schedule, currently disabled)
- Files in `/tmp` are lost on restart — use WebDAV to persist
- Android emulator uses KVM acceleration (may not work on all runner types)

## 🔧 Tech Stack

| Component | Technology |
|---|---|
| CI/CD | GitHub Actions (Ubuntu runner) |
| Tunnels | bore.pub (Rust TCP tunnel) |
| Static URLs | Cloudflare Workers + KV |
| State | Upstash Redis (serverless) |
| Browser | Playwright MCP + CloakBrowser |
| Terminal | terminal-mcp-server + mcp-proxy |
| Android | mobile-mcp + mcp-proxy (SSE → Streamable HTTP) |
| Files | rclone WebDAV |
| Stealth | Custom JS init script (13 anti-bot patches) |

## 🍴 Fork & Deploy Your Own

Want your own free remote automation server? Fork this repo and follow these steps:

### 1. Fork the repo
Click **Fork** on GitHub — you'll get `yourusername/mcp`.

### 2. Set up Cloudflare Workers
```bash
npm install -g wrangler
wrangler login

# Deploy 4 workers (see Cf_Workers/README.md for details)
cd Cf_Workers/playwright-runner && wrangler deploy
cd ../terminal-runner && wrangler deploy
cd ../webdav-runner && wrangler deploy
cd ../android-runner && wrangler deploy
```
Each worker will get a URL like `https://playwright-runner.YOUR_SUBDOMAIN.workers.dev`.

### 3. Edit worker code
In each `Cf_Workers/*/index.js`, replace:
- `AUTH_TOKEN` — your secret token
- `GITHUB_REPO` — your forked repo (`yourusername/mcp`)
- `WORKFLOW_FILE` — keep as `mcp-server.yml`
- `REDIS_URL` / `REDIS_TOKEN` — your Upstash Redis credentials
- `GITHUB_PAT` — your GitHub PAT for workflow triggers

### 4. Set GitHub Actions secrets
In your forked repo → Settings → Secrets and variables → Actions, add:
- `REDIS_URL`, `REDIS_TOKEN`, `AUTH_TOKEN`
- `PLAYWRIGHT_WORKER`, `TERMINAL_WORKER`, `WEBDAV_WORKER`, `ANDROID_WORKER`
- `WORKER_PAT` (GitHub PAT, cannot use `GITHUB_PAT` name — reserved)

### 5. Configure your AI agent
Copy [`agent_config/agent.jsonc`](agent_config/agent.jsonc), replace `YOUR_SUBDOMAIN` with your Cloudflare subdomain, and add to your OpenCode/Claude config.

Copy [`skill/gha-server.md`](skill/gha-server.md) to your AI's skills directory so it knows how to use the GHA tools.

### 6. Trigger the workflow
Push to `main` or manually trigger via GitHub Actions — or hit your worker's `/activate` endpoint:
```
https://playwright-runner.YOUR_SUBDOMAIN.workers.dev/activate?token=YOUR_AUTH_TOKEN
```

### 7. Enjoy! 🎉
Your AI agent now has:
- 🎭 Remote headless browser
- 🖥️ Remote Ubuntu terminal
- 📱 Remote Android emulator
- 📂 Remote file system

All for **free** on GitHub Actions!

---

**Enjoy full remote automation!** 🎭🔥
