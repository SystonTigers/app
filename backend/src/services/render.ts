import type { Env } from '../env';
import initWasm, { Resvg } from '@resvg/resvg-wasm';
import { applyTokens, injectFont, fetchAsDataURI, applyImageDataURIs } from '../utils/svg';
import type { TemplateMeta, TokenMap } from '../templates/schema';

// Helper to load text from R2
async function loadTextFromR2(env: Env, key: string) {
  const obj = await env.R2.get(key);
  if (!obj) throw new Error(`R2 missing: ${key}`);
  return await obj.text();
}

// Helper to load buffer from R2
async function loadBufferFromR2(env: Env, key: string) {
  const obj = await env.R2.get(key);
  if (!obj) throw new Error(`R2 missing: ${key}`);
  return await obj.arrayBuffer();
}

// SVG→PNG rendering service with WASM
export const renderGraphic = async (req: any, env: Env) => {
  // Body: { templateId, size, theme, data, assets }
  const { templateId, size, theme, data, assets } = req.json || {};

  if (!templateId || !size) {
    return new Response(
      JSON.stringify({ error: 'templateId and size required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    // 1) Load template SVG + meta from R2
    const svgKey = `templates/${templateId}.svg`;
    const metaKey = `templates/${templateId}.json`;

    const [svgRaw, metaRaw] = await Promise.all([
      loadTextFromR2(env, svgKey),
      loadTextFromR2(env, metaKey)
    ]);

    const meta = JSON.parse(metaRaw) as TemplateMeta;

    if (!meta.sizes.includes(size)) {
      return new Response(
        JSON.stringify({ error: `Unsupported size ${size}` }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    // 2) Prepare token map (defaults → theme → data)
    const tokens: TokenMap = { ...(meta.defaults || {}), ...(theme || {}), ...(data || {}) };

    // 3) Preload images and create DATAURI tokens for *_DATAURI
    const imageMap: Record<string, string> = {};
    for (const t of meta.imageTokens || []) {
      const url = assets?.[t] || tokens[t];
      if (url) {
        const dataUri = await fetchAsDataURI(url);
        imageMap[t] = dataUri;
        // set DATAURI variant
        tokens[`${t}_DATAURI`] = dataUri;
      }
    }

    // 4) Apply tokens to SVG
    let svg = applyTokens(svgRaw, tokens);
    svg = applyImageDataURIs(svg, imageMap);

    // 5) Embed fonts (optional)
    if (meta.fonts?.length) {
      for (const fam of meta.fonts) {
        for (const file of fam.files) {
          const buf = await loadBufferFromR2(env, `fonts/${file.path}`);
          svg = injectFont(svg, fam.family, file.name, buf, file.weight ?? 700);
        }
      }
    }

    // 6) Init WASM and render
    // @ts-ignore - bound in wrangler.toml
    await initWasm((env as any).RESVG_WASM);
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'original' } // SVG has explicit width/height for size variant
    });

    const png = resvg.render().asPng();

    // 7) Write to R2 and return CDN URL
    const id = crypto.randomUUID();
    const outKey = `renders/${templateId}/${id}.png`;

    await env.R2.put(outKey, png, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable'
      }
    });

    const cdnBase = 'https://cdn.yourdomain.com'; // behind Cloudflare R2 public bucket or CDN mapping
    const url = `${cdnBase}/${outKey}`;

    return new Response(
      JSON.stringify({ id, url, bytes: png.byteLength }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Render error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Rendering failed' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};

// Get render status
export const getRenderStatus = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const render_id = url.pathname.split('/').pop();

  const render = await env.KV.get(
    `render:${req.tenant}:${render_id}`,
    'json'
  );

  if (!render) {
    return new Response(
      JSON.stringify({ error: 'Render not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify(render),
    { headers: { 'content-type': 'application/json' } }
  );
};
