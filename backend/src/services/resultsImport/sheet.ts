/**
 * Reads a spreadsheet the manager uploads into plain rows of text, without
 * any library: CSV (comma, semicolon or tab separated) and Excel .xlsx
 * (a zip of XML files, unzipped with the runtime's DecompressionStream).
 * Every sheet in a workbook is read, since clubs often keep one per season.
 */

export interface Sheet {
  name: string;
  rows: string[][];
}

/** CSV text → rows. Handles quoted cells with commas, quotes and line breaks. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.slice(0, clean.indexOf("\n") >= 0 ? clean.indexOf("\n") : clean.length);
  const counts = { ",": 0, ";": 0, "\t": 0 } as Record<string, number>;
  for (const ch of firstLine) if (ch in counts) counts[ch] += 1;
  const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const sep = n > 0 ? best : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  // Blank rows are kept so row numbers match the spreadsheet; trailing ones are dropped
  const out = rows.map((r) => r.map((c) => c.trim()));
  while (out.length && out[out.length - 1].every((c) => c === "")) out.pop();
  return out;
}

const td = new TextDecoder();

/** The files inside a zip, by name (stored or deflated entries only, as Excel writes). */
async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End of central directory: the last 0x06054b50 within 64 KB of the end
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error("bad zip directory");
    const method = view.getUint16(p + 10, true);
    const compressed = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = td.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!/^xl\/(sharedStrings|workbook|worksheets\/sheet\d+|_rels\/workbook)\.xml(\.rels)?$/.test(name)) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + compressed);
    if (method === 0) files.set(name, data);
    else if (method === 8) {
      const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      files.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
    }
  }
  return files;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function unescapeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()]);
}

/** All the text inside <t> elements (a shared string can be split into runs). */
function textOf(xml: string): string {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join("");
}

/** "C12" → column index 2. */
function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Excel's day number (1900 date system) → "2025-09-14". */
export function excelDate(serial: number): string {
  const ms = Math.round((serial - 25569) * 86_400_000);
  return new Date(ms).toISOString().slice(0, 10);
}

/** Excel .xlsx bytes → one Sheet per worksheet, in workbook order. */
export async function parseXlsx(bytes: Uint8Array): Promise<Sheet[]> {
  const files = await unzip(bytes);
  const shared = files.get("xl/sharedStrings.xml");
  const strings = shared ? [...td.decode(shared).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
  const workbook = td.decode(files.get("xl/workbook.xml") ?? new Uint8Array());
  const rels = td.decode(files.get("xl/_rels/workbook.xml.rels") ?? new Uint8Array());
  const target = new Map([...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => [
    /Id="([^"]+)"/.exec(m[0])?.[1] ?? "", (/Target="([^"]+)"/.exec(m[0])?.[1] ?? "").replace(/^\/?(xl\/)?/, "xl/"),
  ]));
  const sheets: Sheet[] = [];
  const declared = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({
    name: unescapeXml(/name="([^"]*)"/.exec(m[0])?.[1] ?? "Sheet"),
    file: target.get(/r:id="([^"]+)"/.exec(m[0])?.[1] ?? "") ?? "",
  }));
  const list = declared.length ? declared : [...files.keys()].filter((f) => f.startsWith("xl/worksheets/")).sort().map((file, i) => ({ name: `Sheet${i + 1}`, file }));
  for (const { name, file } of list) {
    const data = files.get(file);
    if (!data) continue;
    const xml = td.decode(data);
    const rows: string[][] = [];
    for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const row: string[] = [];
      const rowNumber = Number(/\br="(\d+)"/.exec(rowMatch[1])?.[1] ?? rows.length + 1);
      for (const c of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const inner = c[2] ?? "";
        const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1];
        const type = /t="([^"]+)"/.exec(attrs)?.[1];
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        let value = "";
        if (type === "s") value = strings[Number(v)] ?? "";
        else if (type === "inlineStr") value = textOf(inner);
        else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
        else if (v !== undefined) value = unescapeXml(v);
        row[ref ? columnIndex(ref) : row.length] = value;
      }
      // Rows Excel left out (blank) stay as empty rows, so numbers match the spreadsheet
      while (rows.length < rowNumber - 1) rows.push([]);
      rows[rowNumber - 1] = Array.from(row, (x) => x ?? "");
    }
    sheets.push({ name, rows: Array.from(rows, (r) => (r ?? []).map((x) => x.trim())) });
  }
  return sheets;
}
