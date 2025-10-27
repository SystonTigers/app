import { b64 } from './base64';

export function applyTokens(svg: string, tokens: Record<string,string>) {
  // Replace {{TOKEN}} with value (safe minimal templating)
  return svg.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k) => tokens[k] ?? '');
}

// Embed font as data URL @font-face inside SVG <defs>
export function injectFont(svg: string, family: string, fontName: string, ttf: ArrayBuffer, weight=700) {
  const data = b64(ttf);
  const fontFace = `
  @font-face {
    font-family: '${family}';
    src: url('data:font/ttf;base64,${data}') format('truetype');
    font-weight: ${weight};
    font-style: normal;
  }`;
  return svg.replace('</svg>', `<style><![CDATA[${fontFace}]]></style></svg>`);
}

// For images (badges/logos) -> base64 data URIs
export async function fetchAsDataURI(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch asset ${url}`);
  const ab = await r.arrayBuffer();
  const ct = r.headers.get('content-type') || 'image/png';
  return `data:${ct};base64,${b64(ab)}`;
}

// Replace xlink:href or href placeholders for images like {{HOME_BADGE_DATAURI}}
export function applyImageDataURIs(svg: string, map: Record<string,string>) {
  // Expect tokens like {{HOME_BADGE_DATAURI}}
  return svg.replace(/\{\{([A-Z0-9_]+)_DATAURI\}\}/g, (_, k) => map[k] ?? '');
}
