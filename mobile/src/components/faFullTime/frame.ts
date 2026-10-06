/**
 * FA Full-Time code snippets. The FA blocks automated reading of Full-Time,
 * but gives clubs snippets to show their league table, fixtures and results.
 * We load the FA's own script inside an isolated frame / web view.
 */
import { API_BASE_URL } from '../../config';

export type FaSnippetKind = 'table' | 'fixtures' | 'results' | 'team';
export type FaSnippets = Partial<Record<FaSnippetKind, string>>;

export const FA_HOME = 'https://fulltime.thefa.com/';
const CODE = /^\d{6,12}$/;

export function isSnippetCode(code: unknown): code is string {
  return typeof code === 'string' && CODE.test(code);
}

/** The club's snippet codes from GET /public/:club/fa-full-time ({} when none or offline). The FA's fixture lists only come back to members (`token`). */
export async function fetchFaSnippets(club: string, token?: string | null): Promise<FaSnippets> {
  if (!club) return {};
  try {
    // Signed in, so the FA's fixture lists (times and grounds) come back too
    const res = await fetch(`${API_BASE_URL}/public/${encodeURIComponent(club)}/fa-full-time`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    if (!res.ok) return {};
    const body = await res.json();
    return body?.success && body.data ? (body.data as FaSnippets) : {};
  } catch {
    return {};
  }
}

export type FrameMessage = { height?: number; rows?: number; done?: boolean; changed?: boolean; stage?: 'script-error' | 'data-error' | 'data-loaded' };

/** What to tell people when the FA's table doesn't load. */
export const FAILURES: Record<string, string> = {
  'script-error': "We couldn't reach FA Full-Time just now.",
  'data-error': "FA Full-Time's security check stopped it loading here.",
  timeout: "FA Full-Time didn't answer in time.",
};

export function parseFrameMessage(data: unknown): FrameMessage | null {
  try {
    const value = typeof data === 'string' ? JSON.parse(data) : data;
    return value && typeof value === 'object' && (value as { bh?: string }).bh === 'fa' ? (value as FrameMessage) : null;
  } catch {
    return null;
  }
}

export interface FramePalette {
  text: string;
  muted: string;
  line: string;
  head: string;
  brand: string;
}

const colour = (value: string, fallback: string) => (/^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback);

/** The page inside the frame: the FA's snippet restyled, reporting its height and whether data arrived. */
export function frameDocument(code: string, palette: FramePalette, highlight: string): string {
  const mine = highlight.replace(/[^a-z0-9 ]/gi, '').toLowerCase();
  const p = {
    text: colour(palette.text, '#111827'),
    muted: colour(palette.muted, '#6b7280'),
    line: colour(palette.line, '#e5e7eb'),
    head: colour(palette.head, '#f9fafb'),
    brand: colour(palette.brand, '#16a34a'),
  };
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<style>
html,body{margin:0;background:transparent;color:${p.text};font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#lrep${code}{width:100%!important;overflow-x:auto}
#lrep${code} table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
#lrep${code} th,#lrep${code} td{padding:9px 6px;border-bottom:1px solid ${p.line};text-align:left;vertical-align:top}
#lrep${code} th{background:${p.head};color:${p.muted};font-size:11px;text-transform:uppercase;letter-spacing:.05em}
#lrep${code} tr.bh-mine td{background:${p.brand}22;font-weight:700}
#lrep${code} a{color:${p.brand};text-decoration:none}
</style></head><body>
<div id="lrep${code}"></div>
<script>
(function(){
  var box=document.getElementById('lrep${code}'),mine='${mine}',sent=-1,tries=0;
  function send(o){o.bh='fa';var s=JSON.stringify(o);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s);}else{parent.postMessage(s,'*');}}
  function report(){
    var rows=box.querySelectorAll('tr');
    if(mine){for(var i=0;i<rows.length;i++){if((rows[i].textContent||'').toLowerCase().indexOf(mine)>-1&&rows[i].className.indexOf('bh-mine')<0)rows[i].className+=' bh-mine';}}
    var h=box.innerHTML?document.documentElement.scrollHeight:0;
    if(h!==sent){sent=h;send({height:h,rows:rows.length});}
  }
  // The FA's script adds a second one that fetches the data: watch it so we can say what went wrong
  new MutationObserver(function(muts){muts.forEach(function(m){m.addedNodes.forEach(function(n){
    if(n.tagName==='SCRIPT'&&String(n.src).indexOf('cs1.html')>-1){n.addEventListener('error',function(){send({stage:'data-error'});});n.addEventListener('load',function(){send({stage:'data-loaded'});});}
  });});}).observe(document.head,{childList:true});
  new MutationObserver(report).observe(box,{childList:true,subtree:true});
  window.lrcode='${code}';
  var s=document.createElement('script');s.src='https://fulltime.thefa.com/client/api/cs1.js';
  s.onerror=function(){send({stage:'script-error'});};
  document.head.appendChild(s);
  var t=setInterval(function(){tries++;report();if(tries>=40){clearInterval(t);send({done:true,rows:box.querySelectorAll('tr').length,changed:!!(box.textContent||'').trim()});}},500);
  report();
})();
</script></body></html>`;
}
