/**
 * Playwright Runner Worker
 * 
 * Endpoints:
 *   POST /register  — Runner apna tunnel URL register karta hai
 *   GET  /activate  — GitHub Actions workflow trigger karta hai
 *   GET  /status    — Runner active hai ya nahi check karo
 *   /*              — Baaki sab runner ko proxy ho jaata hai
 * 
 * KV:
 *   TUNNEL_URL  — Current runner ka trycloudflare URL
 *   REGISTERED_AT — Last registration timestamp
 */

const AUTH_HEADER = 'X-Auth-Token';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ─── /register ───────────────────────────────────────────────
    if (path === '/register' && request.method === 'POST') {
      if (!checkAuth(request, env)) {
        return json({ error: 'Unauthorized' }, 401);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }

      const { tunnelUrl } = body;
      if (!tunnelUrl) return json({ error: 'tunnelUrl required' }, 400);

      await env.KV.put('TUNNEL_URL', tunnelUrl);
      await env.KV.put('REGISTERED_AT', new Date().toISOString());

      console.log(`✅ Runner registered: ${tunnelUrl}`);
      return json({ ok: true, tunnelUrl });
    }

    // ─── /activate ───────────────────────────────────────────────
    if (path === '/activate') {
      if (!checkAuth(request, env)) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const ghResponse = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${env.WORKFLOW_FILE}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.GITHUB_PAT}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'playwright-runner-worker',
          },
          body: JSON.stringify({ ref: 'main' }),
        }
      );

      if (ghResponse.ok || ghResponse.status === 204) {
        return json({ ok: true, message: '🚀 Workflow triggered!' });
      } else {
        const err = await ghResponse.text();
        return json({ error: `GitHub API failed: ${err}` }, 500);
      }
    }

    // ─── /status ─────────────────────────────────────────────────
    if (path === '/status') {
      const tunnelUrl = await env.KV.get('TUNNEL_URL');
      const registeredAt = await env.KV.get('REGISTERED_AT');

      if (!tunnelUrl) {
        return json({ active: false, message: 'No runner registered' });
      }

      // Check if runner is actually alive
      try {
        const check = await fetch(`${tunnelUrl}/playwright/health`, {
          signal: AbortSignal.timeout(5000),
        });
        return json({
          active: check.ok,
          tunnelUrl,
          registeredAt,
        });
      } catch {
        return json({ active: false, tunnelUrl, registeredAt, message: 'Runner not responding' });
      }
    }

    // ─── /* Proxy ─────────────────────────────────────────────────
    const tunnelUrl = await env.KV.get('TUNNEL_URL');

    if (!tunnelUrl) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Runner Offline</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px">
            <h1>🔴 Runner is offline</h1>
            <p>GitHub Actions runner is not active right now.</p>
            <p>
              <a href="/activate?token=${env.AUTH_TOKEN}" 
                 style="background:#0066cc;color:white;padding:10px 20px;border-radius:5px;text-decoration:none">
                🚀 Start Runner
              </a>
            </p>
          </body>
        </html>`,
        { status: 503, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // ─── MCP path rewrite ─────────────────────────────────────────
    // Playwright MCP server /sse ke baad /message pe POST karta hai,
    // par router sirf /playwright/* ko port 3002 pe bhejta hai.
    // Isliye /message, /mcp, /sse ko /playwright/... rewrite karna zaroori hai.
    let proxyPath = path;
    if (path === '/sse' || path.startsWith('/message') || path === '/mcp') {
      proxyPath = '/playwright' + path;
    }
    // Build target URL
    const targetUrl = tunnelUrl + proxyPath + url.search;

    // SSE ke liye special handling
    const isSSE = request.headers.get('Accept') === 'text/event-stream';

    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set('Host', new URL(tunnelUrl).host);
    // CORS fix
    proxyHeaders.delete('Origin');

    try {
      const proxyReq = new Request(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
        // SSE ke liye streaming zaroori hai
        ...(isSSE && { duplex: 'half' }),
      });

      const response = await fetch(proxyReq);

      // Response headers copy karo + CORS add karo
      const respHeaders = new Headers(response.headers);
      respHeaders.set('Access-Control-Allow-Origin', '*');
      respHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      respHeaders.set('Access-Control-Allow-Headers', '*');

      return new Response(response.body, {
        status: response.status,
        headers: respHeaders,
      });
    } catch (err) {
      console.error(`Proxy error: ${err.message}`);
      return json({ error: 'Runner unreachable', detail: err.message }, 502);
    }
  },
};

// ─── Helpers ─────────────────────────────────────────────────────

function checkAuth(request, env) {
  const token = request.headers.get(AUTH_HEADER)
    || new URL(request.url).searchParams.get('token');
  return token === env.AUTH_TOKEN;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
