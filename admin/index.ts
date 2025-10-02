// Minimal Admin Console (Basic Auth + tiny HTML forms)
export interface Env {
  BACKEND_URL: string
  DEFAULT_TENANT?: string
  ADMIN_USER: string
  ADMIN_PASS: string
  ADMIN_JWT: string
}

function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="admin"' },
  })
}

function checkBasicAuth(req: Request, env: Env) {
  const hdr = req.headers.get("authorization") || ""
  if (!hdr.startsWith("Basic ")) return false
  const decoded = atob(hdr.slice(6))
  const [u, p] = decoded.split(":")
  return u === env.ADMIN_USER && p === env.ADMIN_PASS
}

const html = (body: string) =>
  new Response(
    `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">
<style>
  body{font:14px system-ui;margin:20px;max-width:780px}
  form{margin:12px 0;padding:12px;border:1px solid #ddd;border-radius:10px}
  input,button{padding:8px;margin:4px 0}
  code{background:#f6f8fa;padding:2px 6px;border-radius:6px}
  .ok{color:#137333}.err{color:#b00020}
</style>
<h2>Admin Console</h2>
${body}`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
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
          <input name="id"   placeholder="tenant id" required value="${t}">
          <input name="name" placeholder="display name (optional)">
          <button>Create</button>
          <p><small>Note: creation uses the Flags endpoint with defaults (managed mode).</small></p>
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

        <form method=get action="/yt/start">
          <h3>YouTube OAuth (Managed plan)</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <button>Connect YouTube</button>
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

        <form method=post action="/api/motm/open">
          <h3>MOTM: Open Voting</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="matchId" placeholder="match id" required>
          <input name="candidates" placeholder='[{"id":"p1","name":"Player 1"},{"id":"p2","name":"Player 2"}]' required>
          <button>Open</button>
        </form>

        <form method=post action="/api/motm/close">
          <h3>MOTM: Close Voting</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="matchId" placeholder="match id" required>
          <button>Close</button>
        </form>

        <form method=post action="/api/motm/tally">
          <h3>MOTM: Get Tally</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="matchId" placeholder="match id" required>
          <button>Get Tally</button>
        </form>

        <form method=post action="/api/events/create">
          <h3>Create Event</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="id" placeholder="event id (e.g. evt_123)" required>
          <input name="type" placeholder="type: training | match | social" required>
          <input name="title" placeholder="title" required>
          <input name="startUtc" placeholder="ISO datetime (e.g. 2025-10-15T18:00:00Z)" required>
          <button>Create Event</button>
        </form>

        <form method=post action="/api/live/open">
          <h3>Live Match: Open</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="matchId" placeholder="match id" required>
          <input name="title" placeholder="match title" required>
          <input name="home" placeholder="home team" required>
          <input name="away" placeholder="away team" required>
          <button>Open Match</button>
        </form>

        <form method=post action="/api/live/event">
          <h3>Live Match: Add Event</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="matchId" placeholder="match id" required>
          <select name="type" required>
            <option value="goal">Goal</option>
            <option value="yellow">Yellow Card</option>
            <option value="red">Red Card</option>
            <option value="sub">Substitution</option>
            <option value="ht">Half Time</option>
            <option value="ft">Full Time</option>
            <option value="note">Note</option>
          </select>
          <input name="minute" placeholder="minute" type="number">
          <input name="payload" placeholder='{"scorer":"Player","side":"home"}' required>
          <button>Add Event</button>
        </form>

        <form method=post action="/api/live/close">
          <h3>Live Match: Close</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="matchId" placeholder="match id" required>
          <button>Close Match</button>
        </form>

        <form method=post action="/api/chat/send">
          <h3>Chat: Send Message</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="roomId" placeholder="room id" required>
          <input name="userId" placeholder="user id" required>
          <input name="text" placeholder="message text" required>
          <button>Send Message</button>
        </form>

        <form method=post action="/api/albums/create">
          <h3>Gallery: Create Album</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="title" placeholder="album title" required>
          <input name="teamId" placeholder="team id (optional)">
          <button>Create Album</button>
        </form>

        <form method=post action="/api/albums/upload">
          <h3>Gallery: Request Upload URL</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="albumId" placeholder="album id" required>
          <input name="contentType" placeholder="image/jpeg" required value="image/jpeg">
          <button>Get Upload URL</button>
        </form>

        <form method=post action="/api/albums/commit">
          <h3>Gallery: Commit Photo</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="albumId" placeholder="album id" required>
          <input name="objectKey" placeholder="tenants/xxx/albums/xxx/photo_xxx.jpg" required>
          <input name="caption" placeholder="caption (optional)">
          <button>Commit Photo</button>
        </form>

        <form method=post action="/api/teams/create">
          <h3>Teams: Create Team</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="teamId" placeholder="team id (e.g. u13)" required>
          <input name="name" placeholder="team name (e.g. U13s)" required>
          <input name="ageGroup" placeholder="age group (e.g. U13)">
          <button>Create Team</button>
        </form>

        <form method=post action="/api/invites/create">
          <h3>Invites: Create Invite</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="teamId" placeholder="team id (for team-specific roles)">
          <select name="role" required>
            <option value="">Select role...</option>
            <option value="club_admin">Club Admin</option>
            <option value="team_manager">Team Manager</option>
            <option value="coach">Coach</option>
            <option value="parent">Parent</option>
            <option value="player">Player</option>
            <option value="volunteer">Volunteer</option>
          </select>
          <input name="maxUses" placeholder="max uses (default 50)" type="number">
          <input name="ttl_minutes" placeholder="ttl minutes (default 10080 = 7 days)" type="number">
          <button>Create Invite</button>
        </form>

        <form method=post action="/api/chatroom/create">
          <h3>Chat: Create Room</h3>
          <input name="tenant" placeholder="tenant id" required value="${t}">
          <input name="roomId" placeholder="room id (e.g. u13-parents)" required>
          <input name="teamId" placeholder="team id" required>
          <select name="type" required>
            <option value="">Select type...</option>
            <option value="parents">Parents</option>
            <option value="coaches">Coaches</option>
          </select>
          <button>Create Chat Room</button>
        </form>

        <p>Calls backend at <code>${env.BACKEND_URL}</code> using your ADMIN_JWT.</p>
        <p><small>Admin JWT (prefix): <code>${(env.ADMIN_JWT || "").slice(0,24)}...</code></small></p>
      `)
    }

    // Redirect user to Google OAuth via backend
    if (req.method === "GET" && url.pathname === "/yt/start") {
      const tenant = url.searchParams.get("tenant") || (env.DEFAULT_TENANT || "test-tenant")
      const backend = env.BACKEND_URL.replace(/\/$/, "")
      const auth = { authorization: `Bearer ${env.ADMIN_JWT}` }

      try {
        // Expect backend to respond with { success: true, data: { url: "https://accounts.google.com/..." } }
        const r = await fetch(`${backend}/api/v1/admin/yt/start?tenant=${encodeURIComponent(tenant)}`, { headers: auth })
        const data = await r.json().catch(() => ({}))

        if (!r.ok || !data?.success || !data?.data?.url) {
          const text = await r.text().catch(() => "Unknown error")
          return html(`<pre class="err">GET /admin/yt/start → ${r.status}\n${text}</pre><a href="/">Back</a>`)
        }

        return Response.redirect(data.data.url, 302)
      } catch (e: any) {
        return html(`<pre class="err">Error: ${e?.message || e}</pre><a href="/">Back</a>`)
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/")) {
      const form = await req.formData()
      const backend = env.BACKEND_URL.replace(/\/$/, "")
      const auth = {
        authorization: `Bearer ${env.ADMIN_JWT}`,
        "content-type": "application/json",
      } as const

      try {
        if (url.pathname === "/api/create") {
          // 👉 CREATE via flags endpoint (auto-creates if missing)
          const tenantId = String(form.get("id") || "").trim()
          const _display = String(form.get("name") || "").trim() // kept for future PATCH support
          if (!tenantId) return html(`<pre class="err">tenant id required</pre><a href="/">Back</a>`)

          // Use managed defaults (matches your platform’s default)
          const flags = { use_make: false, direct_yt: true }
          const body = JSON.stringify({ tenant: tenantId, flags })

          const r = await fetch(`${backend}/api/v1/admin/tenant/flags`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /tenant/flags (create) → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/flags") {
          const tenant = String(form.get("tenant"))
          const preset = String(form.get("preset"))
          const flags =
            preset === "make"
              ? { use_make: true, direct_yt: false }
              : { use_make: false, direct_yt: true }
          const body = JSON.stringify({ tenant, flags })
          const r = await fetch(`${backend}/api/v1/admin/tenant/flags`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /tenant/flags → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/webhook") {
          const tenant = String(form.get("tenant"))
          const urlv = String(form.get("url"))
          const body = JSON.stringify({ tenant, make_webhook_url: urlv })
          const r = await fetch(`${backend}/api/v1/admin/tenant/webhook`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /tenant/webhook → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/fixtures-refresh") {
          const tenant = String(form.get("tenant"))
          const body = JSON.stringify({ tenant })
          const r = await fetch(`${backend}/api/v1/admin/fixtures/refresh`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /fixtures/refresh → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/invite") {
          const tenant = String(form.get("tenant"))
          const ttl = Number(form.get("ttl") || "60")
          const body = JSON.stringify({ tenant, ttl_minutes: ttl })
          const r = await fetch(`${backend}/api/v1/admin/tenant/invite`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /tenant/invite → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/motm/open") {
          const tenant = String(form.get("tenant"))
          const matchId = String(form.get("matchId"))
          const candidates = JSON.parse(String(form.get("candidates") || "[]"))
          const body = JSON.stringify({ tenant, candidates, maxVotesPerUser: 1 })
          const r = await fetch(`${backend}/api/v1/admin/matches/${matchId}/motm/open`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /matches/${matchId}/motm/open → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/motm/close") {
          const tenant = String(form.get("tenant"))
          const matchId = String(form.get("matchId"))
          const body = JSON.stringify({ tenant })
          const r = await fetch(`${backend}/api/v1/admin/matches/${matchId}/motm/close`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /matches/${matchId}/motm/close → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/motm/tally") {
          const tenant = String(form.get("tenant"))
          const matchId = String(form.get("matchId"))
          const r = await fetch(`${backend}/api/v1/admin/matches/${matchId}/motm/tally?tenant=${tenant}`, {
            method: "GET",
            headers: auth,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">GET /matches/${matchId}/motm/tally → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/events/create") {
          const tenant = String(form.get("tenant"))
          const id = String(form.get("id"))
          const type = String(form.get("type"))
          const title = String(form.get("title"))
          const startUtc = String(form.get("startUtc"))
          const body = JSON.stringify({ tenant, id, type, title, startUtc })
          const r = await fetch(`${backend}/api/v1/admin/events`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /admin/events → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/live/open") {
          const tenant = String(form.get("tenant"))
          const matchId = String(form.get("matchId"))
          const title = String(form.get("title"))
          const home = String(form.get("home"))
          const away = String(form.get("away"))
          const body = JSON.stringify({ tenant, title, home, away })
          const r = await fetch(`${backend}/api/v1/admin/matches/${matchId}/live/open`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /matches/${matchId}/live/open → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/live/event") {
          const tenant = String(form.get("tenant"))
          const matchId = String(form.get("matchId"))
          const type = String(form.get("type"))
          const minute = Number(form.get("minute") || "0")
          const payload = JSON.parse(String(form.get("payload") || "{}"))
          const body = JSON.stringify({ tenant, type, minute, payload })
          const r = await fetch(`${backend}/api/v1/admin/matches/${matchId}/live/event`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /matches/${matchId}/live/event → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/live/close") {
          const tenant = String(form.get("tenant"))
          const matchId = String(form.get("matchId"))
          const body = JSON.stringify({ tenant })
          const r = await fetch(`${backend}/api/v1/admin/matches/${matchId}/live/close`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /matches/${matchId}/live/close → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/chat/send") {
          const tenant = String(form.get("tenant"))
          const roomId = String(form.get("roomId"))
          const userId = String(form.get("userId"))
          const text = String(form.get("text"))
          const body = JSON.stringify({ tenant, userId, text })
          const r = await fetch(`${backend}/api/v1/chat/${roomId}/send`, {
            method: "POST",
            headers: auth,
            body,
          })
          const respText = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /chat/${roomId}/send → ${r.status}\n${respText}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/albums/create") {
          const tenant = String(form.get("tenant"))
          const title = String(form.get("title"))
          const teamId = String(form.get("teamId") || "")
          const body = JSON.stringify({ tenant, title, teamId: teamId || undefined })
          const r = await fetch(`${backend}/api/v1/media/albums`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /media/albums → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/albums/upload") {
          const tenant = String(form.get("tenant"))
          const albumId = String(form.get("albumId"))
          const contentType = String(form.get("contentType"))
          const body = JSON.stringify({ tenant, contentType })
          const r = await fetch(`${backend}/api/v1/media/albums/${albumId}/upload-url`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /media/albums/${albumId}/upload-url → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/albums/commit") {
          const tenant = String(form.get("tenant"))
          const albumId = String(form.get("albumId"))
          const objectKey = String(form.get("objectKey"))
          const caption = String(form.get("caption") || "")
          const body = JSON.stringify({ tenant, objectKey, caption: caption || undefined })
          const r = await fetch(`${backend}/api/v1/media/albums/${albumId}/commit`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /media/albums/${albumId}/commit → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/teams/create") {
          const tenant = String(form.get("tenant"))
          const teamId = String(form.get("teamId"))
          const name = String(form.get("name"))
          const ageGroup = String(form.get("ageGroup") || "")
          const body = JSON.stringify({ tenant, teamId, name, ageGroup: ageGroup || undefined })
          const r = await fetch(`${backend}/api/v1/admin/teams`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /admin/teams → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/invites/create") {
          const tenant = String(form.get("tenant"))
          const teamId = String(form.get("teamId") || "")
          const role = String(form.get("role"))
          const maxUses = Number(form.get("maxUses") || "50")
          const ttl_minutes = Number(form.get("ttl_minutes") || "10080")
          const body = JSON.stringify({
            tenant,
            teamId: teamId || undefined,
            role,
            maxUses,
            ttl_minutes,
          })
          const r = await fetch(`${backend}/api/v1/admin/invites/create`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /admin/invites/create → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        if (url.pathname === "/api/chatroom/create") {
          const tenant = String(form.get("tenant"))
          const roomId = String(form.get("roomId"))
          const teamId = String(form.get("teamId"))
          const type = String(form.get("type"))
          const body = JSON.stringify({ tenant, roomId, teamId, type })
          const r = await fetch(`${backend}/api/v1/admin/chat/rooms`, {
            method: "POST",
            headers: auth,
            body,
          })
          const text = await r.text()
          return html(
            `<pre class="${r.ok ? "ok" : "err"}">POST /admin/chat/rooms → ${r.status}\n${text}</pre><a href="/">Back</a>`,
          )
        }

        return new Response("Not Found", { status: 404 })
      } catch (e: any) {
        return html(`<pre class="err">Error: ${e?.message || e}</pre><a href="/">Back</a>`)
      }
    }

    return new Response("Not Found", { status: 404 })
  },
}
