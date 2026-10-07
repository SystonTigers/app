/**
 * Signing on: checking what a family sends. Pure functions (no database).
 */

export interface SigningOnDetails {
  dob: string | null;
  address: string | null;
  school: string | null;
  medical: string | null;
  allergies: string | null;
}

export interface EmergencyContact {
  name: string;
  relationship: string | null;
  phone: string;
  email: string | null;
}

export interface SigningOnAnswers {
  details: SigningOnDetails;
  contacts: EmergencyContact[];
  photos: boolean;
  video: boolean;
  agreeConduct: boolean;
}

export interface SigningOnForm {
  /** Whole pounds and pence, e.g. 45.5 */
  feeAmount: number | null;
  feeNote: string | null;
  conduct: string | null;
}

export class SigningOnError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const bad = (message: string) => new SigningOnError(400, "VALIDATION", message);

function text(value: unknown, max: number, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw bad(`${label} must be text.`);
  const t = value.trim();
  if (t.length > max) throw bad(`${label} must be ${max} characters or fewer.`);
  return t || null;
}

function dob(value: unknown, today: string): string | null {
  const d = text(value, 10, "Date of birth");
  if (!d) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) throw bad("Date of birth must be a real date.");
  if (d > today || d < "1940-01-01") throw bad("Date of birth must be a real date.");
  return d;
}

const PHONE = /^[+()\d\s-]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Check a family's answers. Throws SigningOnError with a message to show. */
export function readAnswers(body: unknown, form: SigningOnForm, today: string): SigningOnAnswers {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw bad("Couldn't read that form.");
  const b = body as Record<string, unknown>;
  const d = (b.details && typeof b.details === "object" ? b.details : {}) as Record<string, unknown>;
  const details: SigningOnDetails = {
    dob: dob(d.dob, today),
    address: text(d.address, 200, "Address"),
    school: text(d.school, 80, "School"),
    medical: text(d.medical, 600, "Medical notes"),
    allergies: text(d.allergies, 300, "Allergies"),
  };
  if (!details.dob) throw bad("Please add their date of birth.");

  if (!Array.isArray(b.contacts)) throw bad("Please add at least one emergency contact.");
  if (b.contacts.length > 3) throw bad("Up to three emergency contacts.");
  const contacts: EmergencyContact[] = b.contacts.map((raw, i) => {
    const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const who = `Emergency contact ${i + 1}`;
    const name = text(c.name, 80, `${who}'s name`);
    const phone = text(c.phone, 20, `${who}'s phone number`);
    if (!name) throw bad(`Please add ${who.toLowerCase()}'s name.`);
    if (!phone || !PHONE.test(phone)) throw bad(`Please add a phone number for ${who.toLowerCase()}.`);
    const email = text(c.email, 120, `${who}'s email`);
    if (email && !EMAIL.test(email)) throw bad(`${who}'s email doesn't look right.`);
    return { name, relationship: text(c.relationship, 40, `${who}'s relationship`), phone, email };
  });
  if (!contacts.length) throw bad("Please add at least one emergency contact.");

  if (typeof b.photos !== "boolean" || typeof b.video !== "boolean") throw bad("Please answer the photo and video questions.");
  const agreeConduct = b.agreeConduct === true;
  if (form.conduct && !agreeConduct) throw bad("Please read and agree to the club's code of conduct.");
  return { details, contacts, photos: b.photos, video: b.video, agreeConduct };
}

/** Check a club admin's form settings. */
export function readForm(body: unknown): SigningOnForm {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw bad("Couldn't read that.");
  const b = body as Record<string, unknown>;
  let feeAmount: number | null = null;
  if (b.feeAmount !== undefined && b.feeAmount !== null && b.feeAmount !== "") {
    const n = typeof b.feeAmount === "number" ? b.feeAmount : Number(b.feeAmount);
    if (!Number.isFinite(n) || n < 0 || n > 2000) throw bad("The fee must be between £0 and £2,000.");
    feeAmount = Math.round(n * 100) / 100;
  }
  return { feeAmount, feeNote: text(b.feeNote, 300, "How to pay"), conduct: text(b.conduct, 6000, "The code of conduct") };
}
