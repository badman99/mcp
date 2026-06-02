# MCP Server - GitHub Actions

🎭 **Full browser automation + terminal + file access** running on GitHub Actions via bore.pub tunnels.

## 🚀 Quick Start

### 1. Trigger Workflow
Go to **Actions → Playwright MCP Server → Run workflow**

### 2. Service URLs

| Service | URL |
|---|---|
| 🎭 Playwright MCP | `https://playwright-runner.badman993944.workers.dev/sse` |
| 🖥️ Terminal MCP | `https://terminal-runner.badman993944.workers.dev/sse` |
| 📂 WebDAV | `https://webdav-runner.badman993944.workers.dev/` |

## 📝 OpenCode Config

Add this to your `opencode.jsonc`:
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "playwright": {
      "type": "http",
      "url": "https://playwright-runner.badman993944.workers.dev/sse"
    },
    "terminal": {
      "type": "http",
      "url": "https://terminal-runner.badman993944.workers.dev/sse"
    }
  }
}
```

## ⏰ Auto-Restart
The workflow auto-triggers every 4 hours to keep the server alive!

## 🛠️ Features
- ✅ All 23 Playwright MCP tools
- ✅ Headless Chromium browser (stealth mode)
- ✅ Terminal MCP (persistent shell access)
- ✅ WebDAV file server (mountable as network drive)
- ✅ Each service has its own bore tunnel + Cloudflare Worker
- ✅ Auto-restart crashed services (watchdog every 5s)
- ✅ Auto-reconnect bore tunnels on disconnect

## 🎯 How It Works

```
GitHub Actions Runner (Ubuntu)
├── Playwright MCP :3002 → bore.pub → playwright-runner.worker.dev
├── Terminal MCP   :3004 → bore.pub → terminal-runner.worker.dev
└── WebDAV         :3005 → bore.pub → webdav-runner.worker.dev
```

Each service is independent — one crashing doesn't affect others!

## ⚠️ Limitations
- Max 6 hours per run (GitHub limit)
- Auto-restarts every 4 hours
- Need to re-trigger manually if Actions disabled

---

**Enjoy full remote automation!** 🎭🔥
