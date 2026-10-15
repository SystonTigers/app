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

/** Our row in the FA's table: its column headings and cells, as shown. */
export interface FrameStanding { headers: string[]; cells: string[] }

export type FrameMessage = {
  height?: number; rows?: number; done?: boolean; changed?: boolean; stage?: 'script-error' | 'data-error' | 'data-loaded';
  /** Table: someone tapped this team */
  team?: string;
  /** Table: our row, once found */
  standing?: FrameStanding;
  /** Results filtered to one team: how many matches, and each match's cells */
  matched?: number;
  matches?: string[][];
};

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
  /** Text on the club colour (our row); dark if not given */
  onBrand?: string;
}

export interface FrameOptions {
  /** Tapping a team posts { team } instead of opening FA Full-Time */
  teamTaps?: boolean;
  /** Show only the rows (matches) with this team in them */
  filter?: string;
}

const colour = (value: string, fallback: string) => (/^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback);

/** The page inside the frame: the FA's snippet restyled, reporting its height and whether data arrived. */
export function frameDocument(code: string, palette: FramePalette, highlight: string, options: FrameOptions = {}): string {
  const mine = highlight.replace(/[^a-z0-9 ]/gi, '').toLowerCase();
  // Team names go into the page as JSON, so quotes or tags in a name can't break out of the script
  const filter = JSON.stringify((options.filter || '').slice(0, 120)).replace(/</g, '\\u003c');
  const taps = options.teamTaps ? 1 : 0;
  const p = {
    text: colour(palette.text, '#111827'),
    muted: colour(palette.muted, '#6b7280'),
    line: colour(palette.line, '#e5e7eb'),
    head: colour(palette.head, '#f9fafb'),
    brand: colour(palette.brand, '#16a34a'),
    onBrand: colour(palette.onBrand || '', '#06080B'),
  };
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<style>
html,body{margin:0;background:transparent;color:${p.text};font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#lrep${code}{width:100%!important;overflow-x:auto}
#lrep${code} table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
#lrep${code} th,#lrep${code} td{padding:9px 6px;border-bottom:1px solid ${p.line};text-align:left;vertical-align:top}
#lrep${code} th{background:${p.head};color:${p.muted};font-size:11px;text-transform:uppercase;letter-spacing:.05em}
#lrep${code} a{color:inherit!important;text-decoration:none}
#lrep${code} tr.bh-mine td,#lrep${code} tr.bh-mine td *{background:${p.brand}!important;color:${p.onBrand}!important;font-weight:700}
#lrep${code} tr.bh-hide{display:none!important}
#lrep${code}.bh-taps tr.bh-team{cursor:pointer}
</style></head><body>
<div id="lrep${code}"></div>
<script>
(function(){
  var box=document.getElementById('lrep${code}'),mine='${mine}',filter=${filter},taps=${taps},sent=-1,tries=0,lastStanding='',lastMatched=-1;
  function send(o){o.bh='fa';var s=JSON.stringify(o);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s);}else{parent.postMessage(s,'*');}}
  function norm(t){return String(t||'').replace(/\\s+/g,' ').trim().toLowerCase();}
  function cellsOf(r){var out=[],c=r.querySelectorAll('td,th');for(var i=0;i<c.length;i++)out.push(String(c[i].textContent||'').replace(/\\s+/g,' ').trim());return out;}
  function isData(r){return r.querySelectorAll('td').length>=2&&!r.querySelector('th');}
  // A team's name in a row: its link, else the longest cell with letters in it
  function teamOf(r){var a=r.querySelector('a');if(a&&/[a-z]/i.test(a.textContent||''))return String(a.textContent).replace(/\\s+/g,' ').trim();
    var best='',c=cellsOf(r);for(var i=0;i<c.length;i++){if(/[a-z]{2}/i.test(c[i])&&c[i].length>best.length)best=c[i];}return best;}
  function headerCells(){var th=box.querySelector('tr th');if(!th)return [];return cellsOf(th.parentNode);}
  // Results for one team: keep its matches (and the headings above them), hide the rest
  function applyFilter(rows){
    var want=norm(filter),exact=[],loose=[],i,j;
    for(i=0;i<rows.length;i++){if(!isData(rows[i]))continue;var c=cellsOf(rows[i]),hit=false;
      for(j=0;j<c.length;j++){if(norm(c[j])===want)hit=true;}
      if(hit)exact.push(rows[i]);else if(norm(rows[i].textContent).indexOf(want)>-1)loose.push(rows[i]);}
    var keep=exact.length?exact:loose,matches=[];
    for(i=0;i<rows.length;i++){var r=rows[i];
      if(isData(r)){var on=keep.indexOf(r)>-1;r.classList.toggle('bh-hide',!on);if(on)matches.push(cellsOf(r));continue;}
      // A heading row stays if a kept match follows it before the next heading
      var show=false;for(j=i+1;j<rows.length&&isData(rows[j]);j++){if(keep.indexOf(rows[j])>-1){show=true;break;}}
      if(r.querySelector('th'))show=keep.length>0;
      r.classList.toggle('bh-hide',!show);}
    if(matches.length!==lastMatched){lastMatched=matches.length;send({matched:matches.length,matches:matches.slice(0,80)});}
  }
  function report(){
    var rows=box.querySelectorAll('tr');
    if(mine&&!filter){for(var i=0;i<rows.length;i++){if((rows[i].textContent||'').toLowerCase().indexOf(mine)>-1&&rows[i].className.indexOf('bh-mine')<0){rows[i].className+=' bh-mine';}}}
    if(taps){box.classList.add('bh-taps');for(var k=0;k<rows.length;k++){if(isData(rows[k]))rows[k].classList.add('bh-team');}}
    if(filter&&rows.length)applyFilter(rows);
    var me=box.querySelector('tr.bh-mine');
    if(me&&!filter){var st=JSON.stringify({headers:headerCells(),cells:cellsOf(me)});if(st!==lastStanding){lastStanding=st;send({standing:JSON.parse(st)});}}
    var h=box.innerHTML?document.documentElement.scrollHeight:0;
    if(h!==sent){sent=h;send({height:h,rows:rows.length});}
  }
  // Tapping a team shows its results in the app instead of opening FA Full-Time
  if(taps){box.addEventListener('click',function(e){var r=e.target&&e.target.closest?e.target.closest('tr'):null;if(!r||!isData(r))return;var t=teamOf(r);if(!t)return;e.preventDefault();e.stopPropagation();send({team:t});},true);}
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
