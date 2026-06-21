---
name: wrangler
description: "Cloudflare Wrangler CLI skill — deploy workers, clone existing worker source code, debug common issues. Triggers on: 'wrangler', 'cloudflare worker', 'deploy worker', 'worker code download', 'worker clone', 'cf worker', 'cloudflare deploy'."
---

# Wrangler — Cloudflare Workers CLI

## 🚨 Common Gotchas & Where People Get Stuck

### 1. Worker Source Code Download — `content` endpoint fails with API token

**Problem:** `wrangler` has NO `download` or `pull` command. People try the Cloudflare API:
```bash
# ❌ This FAILS with "Method not allowed for this authentication scheme"
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/workers/scripts/WORKER_NAME/content"
```

**Fix:** Use the `/content/v2` endpoint instead (returns multipart):
```bash
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/workers/scripts/WORKER_NAME/content/v2" \
  -o worker.raw
```

Then extract JS from multipart:
```python
import re
with open("worker.raw", "rb") as f:
    data = f.read()
parts = data.split(b"--BOUNDARY_STRING")
for p in parts:
    if b"Content-Type: application/javascript" in p:
        idx = p.find(b"\r\n\r\n")
        if idx != -1:
            js = p[idx+4:].rstrip(b"\r\n-")
            with open("index.js", "wb") as o:
                o.write(js)
            print(f"Extracted {len(js)} bytes")
```

The boundary string is in the first line of the response — parse it dynamically:
```bash
BOUNDARY=$(head -c 200 worker.raw | grep -oP '(?<=--)[a-f0-9]{40,}')
```

### 2. `wrangler login` doesn't work in CI/headless

**Problem:** `wrangler login` opens a browser — impossible in Docker/CI/SSH.

**Fix:** Use environment variables:
```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
wrangler deploy
```

Get the token from: Cloudflare Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template.

### 3. `GITHUB_PAT` secret name is reserved

**Problem:** Setting a GitHub Actions secret named `GITHUB_PAT` fails with 422:
```
{"message":"Secret name 'GITHUB_PAT' is not allowed"}
```

**Fix:** Use a different name like `WORKER_PAT` or `GH_TOKEN`. GitHub reserves any name starting with `GITHUB_`.

### 4. Worker deploy fails — "Could not detect a directory containing static files"

**Problem:** Running `wrangler deploy` from the parent directory of multiple workers.

**Fix:** You must `cd` into each worker's directory (where `wrangler.toml` lives) before deploying:
```bash
# ❌ Won't work from parent
wrangler deploy --cwd Cf_Workers/playwright-runner

# ✅ cd into the worker dir first
cd Cf_Workers/playwright-runner
wrangler deploy
```

### 5. `wrangler.toml` vs `wrangler.jsonc` — KV namespace ID wrong

**Problem:** Worker deploys but KV operations fail — `wrangler.toml` has wrong KV ID.

**Fix:** List your KV namespaces and copy the exact ID:
```bash
wrangler kv namespace list
```
Then update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV"
id = "exact-id-here"
```

### 6. `compatibility_flags` — `nodejs_compat` missing

**Problem:** Worker fails with `require is not defined` or `process is not defined`.

**Fix:** Add `nodejs_compat` flag in `wrangler.toml`:
```toml
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
```

### 7. SSE / streaming responses break through Worker proxy

**Problem:** Worker proxies an SSE endpoint but response is buffered / cut off.

**Fix:** Don't set `content-length` on SSE responses, and pass the body as a stream:
```js
if (isSSE) {
  respHeaders.set("Content-Type", "text/event-stream");
  respHeaders.set("Cache-Control", "no-cache");
  respHeaders.set("Connection", "keep-alive");
  respHeaders.delete("content-length");  // CRITICAL for streaming
}
return new Response(response.body, {  // Pass body as stream, not buffered
  status: response.status,
  headers: respHeaders,
});
```

### 8. `::add-mask::` for hiding secrets in GitHub Actions logs

**Problem:** Bore tunnel URLs or dynamic values show up in GitHub Actions logs.

**Fix:** Use `::add-mask::` to mask values dynamically:
```bash
TUNNEL_URL="http://bore.pub:38921"
echo "::add-mask::$TUNNEL_URL"
echo "Tunnel is ready"  # Shows "Tunnel is ready" not the URL
```

### 9. `wrangler tail` shows no logs

**Problem:** `wrangler tail worker-name` connects but shows nothing.

**Causes:**
- Worker isn't receiving traffic
- Observability not enabled
- Wrong account context

**Fix:** Enable observability:
```bash
wrangler deploy  # re-deploy with observability config
```
Or in `wrangler.toml`:
```toml
[observability]
enabled = true
```

### 10. Worker versions vs deployments confusion

**Problem:** `wrangler versions list` shows many versions, but which is live?

**Fix:** Check deployments, not versions:
```bash
wrangler deployments list --name worker-name
```
Deployments show what's actually serving traffic. Versions are just uploaded code snapshots.

### 11. Secret text bindings vs environment variables

**Problem:** Setting `const MY_SECRET = "value"` in worker code — not actually secret!

**Fix:** Use Wrangler secrets (encrypted at rest):
```bash
wrangler secret put MY_SECRET --name worker-name
# Paste value when prompted
```
Then in code:
```js
const value = env.MY_SECRET;  // Available in request handler
```

### 12. Multiple workers — can't deploy all at once

**Problem:** Have 4 workers, running `wrangler deploy` 4 times manually.

**Fix:** Loop script:
```bash
for worker in playwright-runner terminal-runner webdav-runner android-runner; do
  echo "=== Deploying $worker ==="
  cd "Cf_Workers/$worker"
  CLOUDFLARE_API_TOKEN=$TOKEN CLOUDFLARE_ACCOUNT_ID=$ACCT_ID wrangler deploy
  cd -
done
```

---

## 📥 How to Clone an Existing Worker's Source Code

Wrangler has NO native "clone" or "download" command. Here's the working method:

### Step 1: Get your account ID and API token

```bash
# Verify token
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/user/tokens/verify"
```

```bash
# Get account ID
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts" | jq '.result[0].id'
```

### Step 2: List all workers

```bash
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/workers/scripts" \
  | jq '.result[].id'
```

### Step 3: Download worker source (the working way)

```bash
# Download as multipart
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/workers/scripts/WORKER_NAME/content/v2" \
  -o worker.raw

# Extract JS from multipart response
python3 -c "
data = open('worker.raw','rb').read()
parts = data.split(b'--' + data.split(b'--')[1].split(b'\r\n')[0])
for p in parts:
    if b'application/javascript' in p:
        idx = p.find(b'\r\n\r\n')
        if idx != -1:
            js = p[idx+4:].rstrip(b'\r\n-')
            open('index.js','wb').write(js)
            print(f'Extracted {len(js)} bytes -> index.js')
"
```

### Step 4: Check bindings (KV, secrets, env vars)

```bash
# Get latest version ID
VERSION_ID=$(curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/workers/scripts/WORKER_NAME/versions" \
  | jq -r '.result[-1].id')

# View version details (bindings, secrets, KV)
wrangler versions view $VERSION_ID --name WORKER_NAME
```

### Step 5: Recreate locally

```bash
mkdir my-worker && cd my-worker
# Copy extracted index.js here
cat > wrangler.toml << 'EOF'
name = "my-worker"
main = "index.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"
EOF

# Set secrets
wrangler secret put AUTH_TOKEN --name my-worker
wrangler secret put API_KEY --name my-worker

# Deploy
wrangler deploy
```

---

## 🚀 Quick Deploy Cheat Sheet

```bash
# Install
npm install -g wrangler

# Login (interactive) or use env vars (headless)
wrangler login
# OR
export CLOUDFLARE_API_TOKEN="token"
export CLOUDFLARE_ACCOUNT_ID="account-id"

# Create KV namespace
wrangler kv namespace create KV

# Deploy worker
cd my-worker/
wrangler deploy

# Set secret
wrangler secret put MY_SECRET --name my-worker

# View logs
wrangler tail my-worker

# List deployments (what's live)
wrangler deployments list --name my-worker

# List versions (code snapshots)
wrangler versions list --name my-worker

# View version details
wrangler versions view VERSION_ID --name my-worker

# Rollback to previous deployment
wrangler rollback --name my-worker

# Delete worker
wrangler delete my-worker
```

---

## 🔑 Token Permissions

For full worker management, create an API token with these permissions:

| Permission | Level |
|---|---|
| Account → Workers Scripts | Edit |
| Account → Workers KV Storage | Edit |
| Account → Workers Routes | Edit |
| Zone → Workers Routes | Edit (if using custom domains) |

Minimal token: Use "Edit Cloudflare Workers" template — covers most use cases.

---

## ⚠️ Push Protection — GitHub blocks tokens in worker code

**Problem:** Pushing worker code with hardcoded `GITHUB_PAT` or tokens → GitHub blocks the push:
```
remote: error: GH013: Repository rule violations found
remote: - GITHUB PUSH PROTECTION
remote:   — GitHub Personal Access Token —
remote:    locations:
remote:      - commit: xxx
remote:        path: worker/index.js:2
```

**Fix:** Use `REPLACE_WITH_*` placeholders in committed code, set real values as Cloudflare Worker secrets:
```bash
wrangler secret put GITHUB_PAT --name worker-name
```
Then in code:
```js
const GITHUB_PAT = env.GITHUB_PAT;  // From secret binding, not hardcoded
```
