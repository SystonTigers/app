/**
 * Signing on (a club extra): types and pure helpers shared by the screen and
 * its form. The server checks everything again (backend services/signingOn).
 */

export interface SigningOnDetails { dob: string | null; address: string | null; school: string | null; medical: string | null; allergies: string | null }
export interface EmergencyContact { name: string; relationship: string | null; phone: string; email: string | null }
export interface SigningOnForm { feeAmount: number | null; feeNote: string | null; conduct: string | null }
export interface SigningOnEntry {
  playerId: string; details: SigningOnDetails; contacts: EmergencyContact[];
  photos: boolean; video: boolean; conductAgreed: boolean; submittedAt: number; paid: boolean; paidAt: number | null;
}
export interface SquadStatus { playerId: string; name: string; number: number | null; signedOn: boolean; submittedAt: number | null; paid: boolean; linkedParents: number }
export interface SigningOnOverview {
  season: { id: string; label: string };
  form: SigningOnForm;
  children: Array<{ playerId: string; name: string; entry: SigningOnEntry | null }>;
  squad?: SquadStatus[];
}

/** What the family types: everything as text until it's sent. */
export interface Draft {
  dob: string; address: string; school: string; medical: string; allergies: string;
  contacts: Array<{ name: string; relationship: string; phone: string; email: string }>;
  photos: boolean | null; video: boolean | null; agreeConduct: boolean;
}

const blankContact = () => ({ name: '', relationship: '', phone: '', email: '' });

/** "2015-03-14" → "14/03/2015" (UK order for typing). */
export function ukDate(iso: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** "14/3/2015" or "2015-03-14" → "2015-03-14", or null when it isn't a real date. */
export function isoDate(text: string): string | null {
  const t = text.trim();
  let y: number, mo: number, d: number;
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; } else {
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (!m) return null;
    y = +m[1]; mo = +m[2]; d = +m[3];
  }
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Start the form from last answers (or blank, with one empty contact). */
export function draftFrom(entry: SigningOnEntry | null): Draft {
  if (!entry) return { dob: '', address: '', school: '', medical: '', allergies: '', contacts: [blankContact()], photos: null, video: null, agreeConduct: false };
  const d = entry.details;
  return {
    dob: ukDate(d.dob), address: d.address ?? '', school: d.school ?? '', medical: d.medical ?? '', allergies: d.allergies ?? '',
    contacts: entry.contacts.length ? entry.contacts.map((c) => ({ name: c.name, relationship: c.relationship ?? '', phone: c.phone, email: c.email ?? '' })) : [blankContact()],
    photos: entry.photos, video: entry.video, agreeConduct: entry.conductAgreed,
  };
}

export { blankContact };

const PHONE = /^[+()\d\s-]{7,20}$/;

/** The first thing to fix before sending, or null when it's ready. */
export function draftProblem(d: Draft, hasConduct: boolean): string | null {
  if (!isoDate(d.dob)) return 'Add their date of birth, like 14/03/2015.';
  const contacts = d.contacts.filter((c) => c.name.trim() || c.phone.trim());
  if (!contacts.length) return 'Add at least one emergency contact.';
  for (const c of contacts) {
    if (!c.name.trim()) return 'Add a name for each emergency contact.';
    if (!PHONE.test(c.phone.trim())) return `Add a phone number for ${c.name.trim()}.`;
  }
  if (d.photos === null || d.video === null) return 'Answer the photo and video questions.';
  if (hasConduct && !d.agreeConduct) return "Tick to agree to the club's code of conduct.";
  return null;
}

/** The body the server expects (call draftProblem first). */
export function answersFrom(d: Draft) {
  const opt = (s: string) => s.trim() || null;
  return {
    details: { dob: isoDate(d.dob), address: opt(d.address), school: opt(d.school), medical: opt(d.medical), allergies: opt(d.allergies) },
    contacts: d.contacts.filter((c) => c.name.trim() || c.phone.trim())
      .map((c) => ({ name: c.name.trim(), relationship: opt(c.relationship), phone: c.phone.trim(), email: opt(c.email) })),
    photos: d.photos === true,
    video: d.video === true,
    agreeConduct: d.agreeConduct,
  };
}

/** "£45.50", "£45", or null for no fee. */
export function feeText(amount: number | null): string | null {
  if (amount === null || amount === undefined) return null;
  return Number.isInteger(amount) ? `£${amount}` : `£${amount.toFixed(2)}`;
}

/** Totals for staff: signed on, paid, and who can't sign on in the app yet (no parent linked). */
export function squadTotals(squad: SquadStatus[]) {
  return {
    total: squad.length,
    signedOn: squad.filter((p) => p.signedOn).length,
    paid: squad.filter((p) => p.paid).length,
    noParent: squad.filter((p) => !p.signedOn && p.linkedParents === 0).length,
  };
}
