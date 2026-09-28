'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type FaSnippetKind = 'table' | 'fixtures' | 'results' | 'team';
export type FaSnippets = Partial<Record<FaSnippetKind, string>>;

const CODE = /^\d{6,12}$/;
const FA_HOME = 'https://fulltime.thefa.com/';

/** The club's FA Full-Time snippet codes (empty until the club adds them in settings). */
export function useFaSnippets(tenant: string): { snippets: FaSnippets; loaded: boolean } {
  const [snippets, setSnippets] = useState<FaSnippets>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/public/${tenant}/fa-full-time`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body?.success && body.data) setSnippets(body.data as FaSnippets);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant]);
  return { snippets, loaded };
}

/**
 * The page inside the frame: the FA's own snippet, restyled to match the site,
 * reporting its height (and whether data arrived) to the parent. The frame is
 * sandboxed without same-origin, so the FA's script can't read our site's
 * storage or cookies.
 */
function frameDocument(code: string, frameId: string, brand: string, text: string, highlight: string): string {
  const safeHighlight = highlight.replace(/[^a-z0-9 ]/gi, '').toLowerCase();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<style>
:root{--text:${text};--muted:color-mix(in srgb,var(--text) 60%,transparent);--line:color-mix(in srgb,var(--text) 14%,transparent);--head:color-mix(in srgb,var(--text) 6%,transparent);--brand:${brand};--mine:color-mix(in srgb,var(--brand) 14%,transparent)}
html,body{margin:0;background:transparent;color:var(--text);font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#lrep${code}{width:100%!important;overflow-x:auto}
#lrep${code} table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
#lrep${code} th,#lrep${code} td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
#lrep${code} th{background:var(--head);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em}
#lrep${code} tr.bh-mine td{background:var(--mine);font-weight:700}
#lrep${code} a{color:var(--brand);text-decoration:none}
#lrep${code} img{max-width:100%}
</style></head><body>
<div id="lrep${code}"></div>
<script>
(function(){
  var box=document.getElementById('lrep${code}'),mine='${safeHighlight}',sent=-1,tries=0;
  function send(o){o.bhFrame='${frameId}';parent.postMessage(o,'*');}
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
})();
</script></body></html>`;
}

const FAILURES: Record<string, string> = {
  'script-error': 'We couldn\'t reach FA Full-Time just now.',
  'data-error': 'FA Full-Time\'s security check stopped it loading here.',
  timeout: 'FA Full-Time didn\'t answer in time.',
};

interface Props {
  code?: string;
  title: string;
  /** Rows containing this text are highlighted (the club's own team). */
  highlight?: string;
}

/** An FA Full-Time table, fixtures or results list, straight from the FA. */
export function FaFullTimeEmbed({ code, title, highlight = '' }: Props) {
  const frameId = useMemo(() => `fa-${code}-${Math.random().toString(36).slice(2, 8)}`, [code]);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reason, setReason] = useState('timeout');
  const [colours, setColours] = useState<{ brand: string; text: string } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Match the page: the site's brand colour and whatever text colour the card has (light or dark)
  useEffect(() => {
    const safe = (v: string, fallback: string) => (/^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\([\d\s.,%]+\)$/.test(v) ? v : fallback);
    const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
    const text = sectionRef.current ? getComputedStyle(sectionRef.current).color : '';
    setColours({ brand: safe(brand, '#16a34a'), text: safe(text, '#111827') });
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { bhFrame?: string; height?: number; rows?: number; done?: boolean; changed?: boolean; stage?: string };
      if (!data || data.bhFrame !== frameId) return;
      if (typeof data.height === 'number' && data.height > 0) setHeight(Math.min(Math.max(data.height, 80), 4000));
      if (data.stage === 'script-error' || data.stage === 'data-error') {
        setReason(data.stage);
        setState((s) => (s === 'ready' ? s : 'failed'));
      }
      if (data.rows && data.rows > 0) setState('ready');
      else if (data.done) setState((s) => (s === 'ready' || data.changed ? 'ready' : 'failed'));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameId]);

  if (!code || !CODE.test(code)) return null;

  return (
    <section ref={sectionRef} className="bg-white dark:bg-gray-800 chamfer-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-black uppercase tracking-tight text-gray-900 dark:text-white">{title}</h2>
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">FA Full-Time</span>
      </div>
      {state === 'failed' ? (
        <p className="p-6 text-sm text-gray-500">
          {FAILURES[reason] ?? FAILURES.timeout}{' '}
          <a className="text-brand font-bold" href={FA_HOME} target="_blank" rel="noopener noreferrer">
            Open FA Full-Time
          </a>
        </p>
      ) : (
        <>
        {state === 'loading' && <p className="px-6 pt-5 text-sm text-gray-500">Loading from FA Full-Time…</p>}
        {colours && <iframe
          ref={frameRef}
          title={title}
          srcDoc={frameDocument(code, frameId, colours.brand, colours.text, highlight)}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className="w-full block px-2"
          style={{ height: state === 'ready' ? height : 0, border: 0 }}
        />}
        </>
      )}
    </section>
  );
}
