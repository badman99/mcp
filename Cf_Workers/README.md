# Cloudflare Workers — MCP Runner Proxies

These Cloudflare Workers act as **static URL reverse proxies** for the dynamic bore.pub tunnels created on GitHub Actions runners.

## Why Workers?

`bore.pub` assigns a **random port** each time (`bore.pub:38921` → next run `bore.pub:45102`). Cloudflare Workers provide a **static, predictable URL** that always points to the latest tunnel.

```
User → static URL (Worker) → Redis (latest bore port) → bore.pub:XXXXX → GitHub Actions
```

## Workers

| Worker | URL | Redis Key | KV Namespace |
|---|---|---|---|
| `playwright-runner` | `https://playwright-runner.badman993944.workers.dev` | `pw:TUNNEL_URL` | `882a7bf7...` |
| `terminal-runner` | `https://terminal-runner.badman993944.workers.dev` | `tm:TUNNEL_URL` | `958a52cd...` |
| `webdav-runner` | `https://webdav-runner.badman993944.workers.dev` | `wd:TUNNEL_URL` | `fdb43f99...` |
| `android-runner` | `https://android-runner.badman993944.workers.dev` | `an:TUNNEL_URL` | `aeb45ea2...` |

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/register` | POST | Runner registers its bore tunnel URL (auth required) |
| `/activate` | GET/POST | Triggers GitHub Actions workflow to start runner (auth required) |
| `/status` | GET | Check if runner is alive |
| `/health` | GET | Simple health check |
| `/sse` or `/mcp` | GET | SSE stream (MCP transport) — proxied to bore tunnel |
| `/*` | ANY | All other paths proxied to bore tunnel |

## Architecture

```
                    ┌─────────────────────┐
                    │  Cloudflare Worker   │
                    │  (static URL)        │
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────┐
                    │  Redis      │  ← bore tunnel URL saved here
                    │  (Upstash)  │     by runner on startup
                    └──────┬──────┘
                           │
                    ┌──────▼──────────────┐
                    │  bore.pub:XXXXX     │  ← dynamic port
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │  GitHub Actions      │
                    │  Ubuntu Runner       │
                    │  ├── Playwright :3002│
                    │  ├── Terminal   :3004│
                    │  ├── WebDAV     :3005│
                    │  └── Android    :3006│
                    └─────────────────────┘
```

## Storage: Redis + KV (Dual Layer)

- **Redis (Upstash)**: Fast reads, stores current bore tunnel URL
- **Cloudflare KV**: Persistent backup, same data

```js
// Read: Redis first, fallback to KV
getValue = redisGet(key) || env.KV.get(key)

// Write: Both simultaneously
setValue = redisSet(key) + env.KV.put(key)
```

## Deploy Your Own

1. **Install Wrangler:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Create KV namespace:**
   ```bash
   wrangler kv namespace create KV
   ```

4. **Update `wrangler.toml`** with your KV namespace ID

5. **Edit `index.js`** — replace these values:
   ```js
   const AUTH_TOKEN = "your-secret-token";
   const GITHUB_REPO = "yourusername/yourrepo";
   const WORKFLOW_FILE = "your-workflow.yml";
   const REDIS_URL = "your-upstash-redis-url";
   const REDIS_TOKEN = "your-redis-token";
   const GITHUB_PAT = "your-github-pat";
   ```

6. **Deploy:**
   ```bash
   cd Cf_Workers/playwright-runner
   wrangler deploy
   ```

## SSE Proxy Details

The Workers detect SSE connections via:
- `Accept: text/event-stream` header
- Path ending with `/sse` (Playwright, Terminal, Android)
- Path ending with `/mcp` (Android — mobile-mcp endpoint)

When SSE is detected, the Worker sets:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```
and removes `content-length` for proper streaming.

## WebDAV Worker

The `webdav-runner` worker additionally allows WebDAV-specific HTTP methods in CORS:
`PROPFIND, MKCOL, COPY, MOVE, LOCK, UNLOCK`

## Authentication

All management endpoints (`/register`, `/activate`) require:
- Header: `X-Auth-Token: mcp-runner-2026`
- Or query param: `?token=mcp-runner-2026`

Proxy endpoints (`/sse`, `/mcp`, `/*`) are open — no auth needed for MCP clients to connect.
