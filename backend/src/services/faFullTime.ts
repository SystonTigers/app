/**
 * FA Full-Time code snippets. The FA blocks automated reading of Full-Time,
 * but gives every club "code snippets" to show the league table, fixtures and
 * results on its own website. We store each snippet's code per club; the club
 * pages and app load the FA's own script in the visitor's browser.
 */

export const FA_SNIPPET_KINDS = ["table", "fixtures", "results", "team"] as const;
export type FaSnippetKind = (typeof FA_SNIPPET_KINDS)[number];
export type FaSnippets = Partial<Record<FaSnippetKind, string>>;

const CODE = /^\d{6,12}$/;

/**
 * The snippet code from whatever the club pasted: the whole snippet
 * (`var lrcode = '995652226'` / `id="lrep995652226"`) or just the number.
 * Returns null when there's no code in it.
 */
export function snippetCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (!text) return null;
  if (CODE.test(text)) return text;
  const match = text.match(/lrcode\s*=\s*['"](\d{6,12})['"]/) ?? text.match(/lrep(\d{6,12})/);
  return match ? match[1] : null;
}

/** Stored JSON to snippets, dropping anything malformed. */
export function parseStoredSnippets(raw: string | null | undefined): FaSnippets {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const out: FaSnippets = {};
    for (const kind of FA_SNIPPET_KINDS) {
      const code = value?.[kind];
      if (typeof code === "string" && CODE.test(code)) out[kind] = code;
    }
    return out;
  } catch {
    return {};
  }
}

export type SnippetUpdate = { snippets: FaSnippets } | { error: { field: FaSnippetKind; message: string } };

/**
 * Validate a settings update. Each kind may be a pasted snippet, a code, or
 * an empty string / null to remove it. Kinds not mentioned stay as they are.
 */
export function applySnippetUpdate(current: FaSnippets, body: Record<string, unknown>): SnippetUpdate {
  const next: FaSnippets = { ...current };
  for (const kind of FA_SNIPPET_KINDS) {
    if (!(kind in body)) continue;
    const value = body[kind];
    if (value === null || (typeof value === "string" && value.trim() === "")) {
      delete next[kind];
      continue;
    }
    const code = snippetCode(value);
    if (!code) return { error: { field: kind, message: "That doesn't look like an FA Full-Time code snippet. Paste the whole snippet, or just its number." } };
    next[kind] = code;
  }
  return { snippets: next };
}

type Db = { prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<unknown> } } };

export async function loadFaSnippets(db: Db, tenantId: string): Promise<FaSnippets> {
  const row = await db.prepare(`SELECT fa_snippets FROM tenants WHERE id = ?`).bind(tenantId).first<{ fa_snippets: string | null }>();
  return parseStoredSnippets(row?.fa_snippets);
}

export async function saveFaSnippets(db: Db, tenantId: string, snippets: FaSnippets): Promise<void> {
  const value = Object.keys(snippets).length ? JSON.stringify(snippets) : null;
  await db.prepare(`UPDATE tenants SET fa_snippets = ? WHERE id = ?`).bind(value, tenantId).run();
}
