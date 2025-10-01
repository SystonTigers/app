// Minimal Admin Console (Basic Auth + tiny HTML forms)
export interface Env {
  BACKEND_URL: string
  DEFAULT_TENANT?: string
  ADMIN_USER: string
  ADMIN_PASS: string
  ADMIN_JWT: string
}

function unauthorized() {
  return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="admin"' }})
}

function checkBasicAuth(req: Request, env: Env) {
  const hdr = req.headers.get("authorization") || ""
  if (!hdr.startsWith("Basic ")) return false
  const decoded = atob(hdr.slice(6))
  const [u, p] = decoded.split(":")
  return u === env.ADMIN_USER && p === env.ADMIN_PASS
}

const html = (body: string) => new Response(
  `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">
  <style>body{font:14px system-ui;margin:20px;max-width:780px}form{margin:12px 0;padding:12px;border:1px solid #ddd;border-radius:10px}input,button{padding:8px;margin:4px 0}code{background:#f6f8fa;padding:2px 6px;border-radius:6px}</style>
  <h2>Admin Console</h2>
  ${body}`, { headers: { "content-type": "text/html; charset=utf-8" } }
)

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url)
    if (!checkBasicAuth(req, env)) return unauthorized()

    // Home page with forms
    if (req.method === "GET" && url.pathname === "/") {
      const t = env.DEFAULT_TENANT || "test-tenant"
      return html(`
        <form method=post action="/api/create">
          <h3>Create Tenant</h3>
          <input name="id" placeholder="tenant id" required value="${t}">
          <input name="name" placeholder="display name (optional)">
          <button>Create</button>
        </form>

        <form method=post action="/api/flags">
          <h3>Set Flags</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <label><input type=radio name="preset" value="managed" checked> Managed (use_make=false, direct_yt=true)</label><br>
          <label><input type=radio name="preset" value="make"> BYO-Make (use_make=true, direct_yt=false)</label><br>
          <button>Apply</button>
        </form>

        <form method=post action="/api/webhook">
          <h3>Set Make Webhook</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="url" placeholder="https://hook.make.com/...." required>
          <button>Save Webhook</button>
        </form>

        <form method=post action="/api/fixtures-refresh">
          <h3>Refresh Fixtures Cache</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <button>Refresh</button>
        </form>

        <form method=post action="/api/invite">
          <h3>Generate Tenant Setup Link</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="ttl" placeholder="ttl minutes (default 60)">
          <button>Generate</button>
        </form>

        <p>Calls backend at <code>${env.BACKEND_URL}</code> using your ADMIN_JWT.</p>
      `)
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/")) {
      const form = await req.formData()
      const backend = env.BACKEND_URL.replace(/\/$/, "")
      const auth = { "authorization": `Bearer ${env.ADMIN_JWT}`, "content-type": "application/json" }

      try {
        if (url.pathname === "/api/create") {
          const body = JSON.stringify({ id: String(form.get("id")), name: String(form.get("name")||"") })
          const r = await fetch(`${backend}/api/v1/admin/tenant/create`, { method:"POST", headers: auth, body })
          const text = await r.text()
          return html(`<pre>POST /tenant/create → ${r.status}\n${text}</pre><a href="/">Back</a>`)
        }

        if (url.pathname === "/api/flags") {
          const tenant = String(form.get("tenant"))
          const preset = String(form.get("preset"))
          const flags = preset === "make" ? { use_make: true,  direct_yt: false }
                                          : { use_make: false, direct_yt: true  }
          const body = JSON.stringify({ tenant, flags })
          const r = await fetch(`${backend}/api/v1/admin/tenant/flags`, { method:"POST", headers: auth, body })
          const text = await r.text()
          return html(`<pre>POST /tenant/flags → ${r.status}\n${text}</pre><a href="/">Back</a>`)
        }

        if (url.pathname === "/api/webhook") {
          const tenant = String(form.get("tenant"))
          const urlv = String(form.get("url"))
          const body = JSON.stringify({ tenant, make_webhook_url: urlv })
          const r = await fetch(`${backend}/api/v1/admin/tenant/webhook`, { method:"POST", headers: auth, body })
          const text = await r.text()
          return html(`<pre>POST /tenant/webhook → ${r.status}\n${text}</pre><a href="/">Back</a>`)
        }

        if (url.pathname === "/api/fixtures-refresh") {
          const tenant = String(form.get("tenant"))
          const body = JSON.stringify({ tenant })
          const r = await fetch(`${backend}/api/v1/admin/fixtures/refresh`, { method:"POST", headers: auth, body })
          const text = await r.text()
          return html(`<pre>POST /fixtures/refresh → ${r.status}\n${text}</pre><a href="/">Back</a>`)
        }

        if (url.pathname === "/api/invite") {
          const tenant = String(form.get("tenant"))
          const ttl = Number(form.get("ttl") || "60")
          const body = JSON.stringify({ tenant, ttl_minutes: ttl })
          const r = await fetch(`${backend}/api/v1/admin/tenant/invite`, { method:"POST", headers: auth, body })
          const text = await r.text()
          return html(`<pre>POST /tenant/invite → ${r.status}\n${text}</pre><a href="/">Back</a>`)
        }

        return new Response("Not Found", { status: 404 })
      } catch (e: any) {
        return html(`<pre>Error: ${e?.message || e}</pre><a href="/">Back</a>`)
      }
    }

    return new Response("Not Found", { status: 404 })
  }
}
