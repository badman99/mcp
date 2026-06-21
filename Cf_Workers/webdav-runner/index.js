const AUTH_TOKEN = "mcp-runner-2026";
const GITHUB_REPO = "badman99/mcp";
const WORKFLOW_FILE = "mcp-server.yml";
const REDIS_URL = "https://regular-parrot-113383.upstash.io";
const REDIS_TOKEN = "gQAAAAAAAbrnAAIgcDIwY2Y5NWJhMzliNDI0ZjcxOTA2ZmZkMzJhOWZkYTliNQ";
const KEY_PREFIX = "wd";
const SERVICE_NAME = "webdav";
const GITHUB_PAT = "REPLACE_WITH_GITHUB_PAT";

async function redisGet(key) {
  try {
    const resp = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const data = await resp.json();
    return data.result;
  } catch {
    return null;
  }
}

async function redisSet(key, value) {
  try {
    await fetch(`${REDIS_URL}/set/${key}/${encodeURIComponent(value)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
  } catch {}
}

async function getValue(env, key) {
  return (await redisGet(key)) || (await env.KV.get(key));
}

async function setValue(env, key, value) {
  await redisSet(key, value);
  try {
    await env.KV.put(key, value);
  } catch {}
}

function checkAuth(request) {
  const token =
    request.headers.get("X-Auth-Token") ||
    new URL(request.url).searchParams.get("token");
  return token === AUTH_TOKEN;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function offlinePage() {
  return `<!DOCTYPE html>
  <html>
    <head><title>WebDAV Runner Offline</title></head>
    <body style="font-family:sans-serif;text-align:center;padding:50px">
      <h1>\u{1F534} WebDAV Runner is offline</h1>
      <p>GitHub Actions runner is not active right now.</p>
      <a href="/activate?token=${AUTH_TOKEN}"
         style="background:#0066cc;color:white;padding:10px 20px;border-radius:5px;text-decoration:none">
        \u{1F680} Start Runner
      </a>
    </body>
  </html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PATCH, PUT, PROPFIND, MKCOL, COPY, MOVE, LOCK, UNLOCK",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    if (path === "/register" && request.method === "POST") {
      if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      const { tunnelUrl } = body;
      if (!tunnelUrl) return json({ error: "tunnelUrl required" }, 400);
      await setValue(env, `${KEY_PREFIX}:TUNNEL_URL`, tunnelUrl);
      await setValue(env, `${KEY_PREFIX}:REGISTERED_AT`, new Date().toISOString());
      return json({ ok: true, tunnelUrl });
    }

    if (path === "/activate") {
      if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
      const ghResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GITHUB_PAT}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "webdav-runner-worker",
          },
          body: JSON.stringify({ ref: "main" }),
        }
      );
      return ghResponse.ok || ghResponse.status === 204
        ? json({ ok: true, message: "\u{1F680} Workflow triggered!" })
        : json({ error: `GitHub API failed: ${await ghResponse.text()}` }, 500);
    }

    if (path === "/status") {
      const tunnelUrl = await getValue(env, `${KEY_PREFIX}:TUNNEL_URL`);
      const registeredAt = await getValue(env, `${KEY_PREFIX}:REGISTERED_AT`);
      if (!tunnelUrl) return json({ active: false, message: "No runner registered" });
      try {
        const check = await fetch(`${tunnelUrl}/`, {
          signal: AbortSignal.timeout(5000),
        });
        return json({ active: check.ok, tunnelUrl, registeredAt });
      } catch {
        return json({ active: false, tunnelUrl, registeredAt, message: "Runner not responding" });
      }
    }

    if (path === "/health") {
      const tunnelUrl = await getValue(env, `${KEY_PREFIX}:TUNNEL_URL`);
      const registeredAt = await getValue(env, `${KEY_PREFIX}:REGISTERED_AT`);
      return json({ ok: true, service: SERVICE_NAME, tunnelUrl, registeredAt });
    }

    const tunnelUrl = await getValue(env, `${KEY_PREFIX}:TUNNEL_URL`);
    if (!tunnelUrl) {
      return new Response(offlinePage(), {
        status: 503,
        headers: { "Content-Type": "text/html" },
      });
    }

    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set("Host", new URL(tunnelUrl).host);
    proxyHeaders.delete("Origin");
    proxyHeaders.delete("accept-encoding");

    try {
      const proxyReq = new Request(tunnelUrl + path + url.search, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
      });
      const response = await fetch(proxyReq);
      const respHeaders = new Headers(response.headers);
      respHeaders.set("Access-Control-Allow-Origin", "*");
      respHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PATCH, PUT, PROPFIND, MKCOL, COPY, MOVE, LOCK, UNLOCK");
      respHeaders.set("Access-Control-Allow-Headers", "*");
      return new Response(response.body, { status: response.status, headers: respHeaders });
    } catch (err) {
      return json({ error: "Runner unreachable", detail: err.message, path }, 502);
    }
  },
};
