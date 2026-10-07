/**
 * Signing on (a club extra): the shapes `/api/v1/signing-on` sends back
 * (backend `routes/signingOn.ts`, `services/signingOn/`) and one helper to
 * call it.
 */
import { apiFetch } from '@/lib/session';
import { bodyError } from '@/components/admin/AdminUi';

export interface SigningOnForm {
    /** Pounds, e.g. 45.5; null = no fee */
    feeAmount: number | null;
    feeNote: string | null;
    conduct: string | null;
}

export interface SquadStatus {
    playerId: string;
    name: string;
    number: number | null;
    signedOn: boolean;
    /** Milliseconds */
    submittedAt: number | null;
    paid: boolean;
    linkedParents: number;
}

export interface SigningOnOverview {
    season: { id: string; label: string };
    form: SigningOnForm;
    /** Staff only */
    squad?: SquadStatus[];
}

export interface EmergencyContact {
    name: string;
    relationship: string | null;
    phone: string;
    email: string | null;
}

export interface SigningOnEntry {
    playerId: string;
    details: { dob: string | null; address: string | null; school: string | null; medical: string | null; allergies: string | null };
    contacts: EmergencyContact[];
    photos: boolean;
    video: boolean;
    conductAgreed: boolean;
    /** Milliseconds */
    submittedAt: number;
    paid: boolean;
    paidAt: number | null;
}

export const pounds = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

/** Call the signing-on API: the `data`, or an Error carrying the server's message. */
export async function signingOnCall<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
    let res: Response;
    try {
        res = await apiFetch(`/api/v1/signing-on${path}`, init);
    } catch {
        throw new Error("We couldn't reach the server. Check your connection and try again.");
    }
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) throw new Error(bodyError(body, fallback));
    return body.data as T;
}
