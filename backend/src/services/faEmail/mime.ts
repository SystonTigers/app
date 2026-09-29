/**
 * Just enough email (MIME) reading to get the text out of a forwarded FA
 * Full-Time email: headers, multipart parts, quoted-printable and base64.
 * Attachments and anything that isn't text are skipped.
 */

export interface MailText {
  headers: Record<string, string>;
  /** Plain text parts, then HTML parts (as HTML) */
  text: string;
  html: string;
}

function splitHeaders(raw: string): { headers: Record<string, string>; body: string } {
  const end = raw.search(/\r?\n\r?\n/);
  const head = end < 0 ? raw : raw.slice(0, end);
  const body = end < 0 ? "" : raw.slice(end).replace(/^\r?\n\r?\n/, "");
  const headers: Record<string, string> = {};
  // Folded header lines continue with whitespace
  for (const line of head.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { headers, body };
}

function param(value: string | undefined, name: string): string | null {
  const m = new RegExp(`${name}\\s*=\\s*(?:"([^"]+)"|([^;\\s]+))`, "i").exec(value ?? "");
  return m ? (m[1] ?? m[2]) : null;
}

function bytesToText(bytes: Uint8Array, charset: string | null): string {
  try {
    return new TextDecoder(charset || "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function decodeBody(body: string, encoding: string | undefined, charset: string | null): string {
  const enc = (encoding ?? "").toLowerCase();
  if (enc === "base64") {
    try {
      const bin = atob(body.replace(/[^A-Za-z0-9+/=]/g, ""));
      return bytesToText(Uint8Array.from(bin, (c) => c.charCodeAt(0)), charset);
    } catch {
      return "";
    }
  }
  if (enc === "quoted-printable") {
    const soft = body.replace(/=\r?\n/g, "");
    const bytes: number[] = [];
    for (let i = 0; i < soft.length; i++) {
      if (soft[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(soft.slice(i + 1, i + 3))) {
        bytes.push(parseInt(soft.slice(i + 1, i + 3), 16));
        i += 2;
      } else {
        bytes.push(soft.charCodeAt(i) & 0xff);
      }
    }
    return bytesToText(new Uint8Array(bytes), charset);
  }
  return body;
}

/** Decode "=?UTF-8?Q?...?=" style header words (subjects). */
export function decodeHeaderWords(value: string): string {
  return value.replace(/=\?([^?]+)\?([QqBb])\?([^?]*)\?=/g, (_, charset: string, kind: string, text: string) => {
    if (kind.toUpperCase() === "B") return decodeBody(text, "base64", charset);
    return decodeBody(text.replace(/_/g, " "), "quoted-printable", charset);
  });
}

function walk(raw: string, out: MailText, depth: number): void {
  if (depth > 6) return;
  const { headers, body } = splitHeaders(raw);
  const type = (headers["content-type"] ?? "text/plain").toLowerCase();
  if (type.startsWith("multipart/")) {
    const boundary = param(headers["content-type"], "boundary");
    if (!boundary) return;
    const parts = body.split(new RegExp(`\\r?\\n?--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?[ \\t]*\\r?\\n?`));
    for (const part of parts) if (part.trim()) walk(part, out, depth + 1);
    return;
  }
  if (type.startsWith("message/rfc822")) {
    walk(body, out, depth + 1); // a forwarded email attached whole
    return;
  }
  if (/attachment/i.test(headers["content-disposition"] ?? "")) return;
  const charset = param(headers["content-type"], "charset");
  if (type.startsWith("text/plain")) out.text += `${decodeBody(body, headers["content-transfer-encoding"], charset)}\n`;
  else if (type.startsWith("text/html")) out.html += `${decodeBody(body, headers["content-transfer-encoding"], charset)}\n`;
}

/** The headers and readable text of a raw email. */
export function readMail(raw: string): MailText {
  const { headers } = splitHeaders(raw);
  const out: MailText = { headers, text: "", html: "" };
  walk(raw, out, 0);
  return out;
}
