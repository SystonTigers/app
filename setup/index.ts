export interface Env {
  BACKEND_URL: string
  API_VERSION: string
}

const page = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">
<style>
body{font:16px system-ui;margin:20px;max-width:720px}
input,button{padding:10px;margin:6px 0;width:100%}
.card{border:1px solid #ddd;padding:12px;border-radius:10px;margin:12px 0}
small{color:#666}
</style>
<h2>Team Setup</h2>
<div class=card>
  <p>Paste your Make.com Webhook URL and enable BYO-Make. Click <b>Save</b>, then <b>Send Test</b>.</p>
  <input id=hook placeholder="https://hook.make.com/....">
  <button id=save>Save Webhook</button>
  <button id=enable>Enable BYO-Make</button>
  <button id=test>Send Test</button>
  <div id=out><small>Waiting&</small></div>
</div>
<script>
const out = (h) => document.getElementById('out').innerHTML = h
const token = new URL(location.href).searchParams.get('token')
const base = "%BACKEND%/api/%V%"

if (!token) { out("<b>Error:</b> missing ?token param"); }

async function call(path, method="GET", body=null) {
  const h = { "authorization": "Bearer " + token }
  let fetchOpts = { method, headers: h }
  if (body) {
    h["content-type"] = "application/json"
    fetchOpts.body = JSON.stringify(body)
  }
  const r = await fetch(base + path, fetchOpts)
  const t = await r.text()
  return { status: r.status, text: t }
}

document.getElementById('save').onclick = async () => {
  const u = document.getElementById('hook').value.trim()
  if (!u) return out("<b>Please paste your Make webhook URL.</b>")
  const r = await call("/tenant/self/webhook", "POST", { make_webhook_url: u })
  out("<pre>"+r.status+"\\n"+r.text+"</pre>")
}

document.getElementById('enable').onclick = async () => {
  const r = await call("/tenant/self/flags", "POST", { use_make: true, direct_yt: false })
  out("<pre>"+r.status+"\\n"+r.text+"</pre>")
}

document.getElementById('test').onclick = async () => {
  const r = await call("/tenant/self/test-webhook", "POST")
  out("<pre>"+r.status+"\\n"+r.text+"</pre>")
}
</script>`.replaceAll("%BACKEND%","%BACKEND_URL%").replaceAll("%V%","%API_VERSION%")

export default {
  async fetch(req: Request, env: Env) {
    const html = page.replace("%BACKEND_URL%", env.BACKEND_URL).replace("%API_VERSION%", env.API_VERSION)
    return new Response(html, { headers: { "content-type":"text/html; charset=utf-8" }})
  }
}
