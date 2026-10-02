/**
 * Reads fixtures out of a photo or screenshot (an FA email, a Full-Time page,
 * a league fixture list, a match poster) with Cloudflare Workers AI's vision
 * model. The picture is only passed to the model and never stored; only the
 * fixture details come back, and staff check them before anything is saved.
 */
import type { FaEmailFixture } from "../faEmail/parse";
import { imageMime } from "../graphics/images";
import { fixturesFromReply } from "./normalise";

/** Workers AI binding (wrangler.toml [ai]) */
export interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export type ImageEnv = { AI?: AiBinding; FIXTURE_IMAGE_MODEL?: string };

export const DEFAULT_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export class FixtureImageError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function instructions(clubName: string, today: string): string {
  return [
    "You read football fixtures from a picture for a grassroots club's app.",
    `The club is "${clubName}". Today is ${today}.`,
    "Find every fixture (a match between two named teams on a date) in the picture.",
    "Reply with JSON only, no other words, in exactly this shape:",
    '{"fixtures":[{"date":"YYYY-MM-DD","time":"HH:MM","home":"home team","away":"away team","venue":"ground or null","competition":"league or cup name or null","status":"scheduled|postponed|cancelled"}]}',
    'Write the date as YYYY-MM-DD. If the picture shows no year, write "--MM-DD". Dates in the picture are UK style (day before month).',
    "Write the kick-off time in 24-hour HH:MM, or null if there's none.",
    "Copy team names exactly as written. The first-named or left-hand team is home unless the picture says otherwise.",
    "Leave out referees, people's names, phone numbers, emails and anything that isn't a fixture.",
    'If there are no fixtures, reply {"fixtures":[]}.',
  ].join("\n");
}

function replyText(result: unknown): string {
  if (typeof result === "string") return result;
  const r = result as { response?: unknown; result?: { response?: unknown } } | null;
  const text = r?.response ?? r?.result?.response;
  if (typeof text === "string") return text;
  // Some models return the parsed JSON object directly
  return text && typeof text === "object" ? JSON.stringify(text) : "";
}

/** Read the fixtures in an image. Throws FixtureImageError with a message for staff. */
export async function readFixturesFromImage(env: ImageEnv, bytes: Uint8Array, clubName: string, now = new Date()): Promise<FaEmailFixture[]> {
  if (!env.AI) throw new FixtureImageError(503, "NOT_AVAILABLE", "Reading fixtures from pictures isn't switched on yet.");
  if (!bytes.length) throw new FixtureImageError(400, "EMPTY", "Choose a picture first.");
  if (bytes.length > MAX_IMAGE_BYTES) throw new FixtureImageError(413, "TOO_BIG", "That picture is too big. Try a screenshot instead.");
  const mime = imageMime(bytes);
  if (mime !== "image/jpeg" && mime !== "image/png") throw new FixtureImageError(415, "NOT_IMAGE", "Please use a photo or screenshot (JPG or PNG).");

  const model = env.FIXTURE_IMAGE_MODEL || DEFAULT_MODEL;
  const input = {
    messages: [
      { role: "system", content: instructions(clubName || "our club", now.toISOString().slice(0, 10)) },
      { role: "user", content: "Read the fixtures in this picture." },
    ],
    image: Array.from(bytes),
    max_tokens: 1500,
    temperature: 0,
  };

  let result: unknown;
  try {
    result = await env.AI.run(model, input);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Meta's models need their licence accepted once per account by sending "agree"
    if (/agree/i.test(message)) {
      await env.AI.run(model, { prompt: "agree" }).catch(() => undefined);
      result = await env.AI.run(model, input).catch((retryErr: unknown) => {
        throw readFailed(retryErr);
      });
    } else {
      throw readFailed(err);
    }
  }
  const fixtures = fixturesFromReply(replyText(result), now);
  console.log(JSON.stringify({ event: "fixture_image_read", outcome: fixtures.length ? "found" : "none", count: fixtures.length, bytes: bytes.length }));
  return fixtures;
}

function readFailed(err: unknown): FixtureImageError {
  console.error(JSON.stringify({ level: "error", msg: "fixture_image_read_failed", error: err instanceof Error ? err.message : String(err) }));
  return new FixtureImageError(502, "READ_FAILED", "We couldn't read that picture just now. Please try again in a moment.");
}
