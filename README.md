# Playwright MCP Server - GitHub Actions

🎭 **Full browser automation server** running on GitHub Actions with **tunnel** via bore.pub.

## 🚀 Quick Start

### 1. Set Secrets
Go to **Settings → Secrets and variables → Actions** and add:
- `AUTH_TOKEN` - Shared auth token for Worker ↔ Runner

### 2. Trigger Workflow
Go to **Actions → Playwright MCP Server → Run workflow**

### 3. Get Your URL
The workflow will output your **tunnel URL** via bore.pub.

## 📝 OpenCode Config

Add this to your `opencode.jsonc`:
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "playwright": {
      "type": "http",
      "url": "WORKER_URL/playwright/sse"
    }
  }
}
```

**URL updates per tunnel restart!** 🔥

## ⏰ Auto-Restart
The workflow auto-triggers every 5 hours to keep the server alive!

## 🛠️ Features
- ✅ All 23 Playwright MCP tools
- ✅ Headless Chromium browser
- ✅ Static URL (never changes)
- ✅ Auto-restart every 5 hours
- ✅ Network monitoring, screenshots, JS execution

## 📡 Available Tools
- `browser_navigate` - Open any URL
- `browser_click` - Click elements
- `browser_type` - Fill inputs
- `browser_take_screenshot` - Screenshots
- `browser_evaluate` - Run JavaScript
- `browser_network_requests` - Monitor network
- `browser_file_upload` - Upload files
- `browser_fill_form` - Form automation
- + 14 more tools!

## 🎯 How It Works

```
GitHub Actions Runner (Ubuntu, 6h max)
├── Playwright MCP Server (port 3002)
└── bore.pub Tunnel
    └── http://bore.pub:XXXXX
```

**Note:** GitHub Actions has a 6-hour limit. The workflow auto-restarts every 5 hours to maintain continuous uptime!

## 🔧 Manual Control

**Start:** Actions → Run workflow → `start`
**Stop:** Actions → Run workflow → `stop` (cancels running job)

## ⚠️ Limitations
- Max 6 hours per run (GitHub limit)
- Auto-restarts every 5 hours
- Need to re-trigger manually if Actions disabled

---

**Enjoy full browser automation!** 🎭🔥
# Triggered Sun May 31 14:39:55 UTC 2026
