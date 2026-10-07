'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/AdminUi';
import { signingOnCall, type SigningOnForm } from './types';

/** This season's form: the fee, how to pay and the code of conduct families agree to. */
export function FormCard({ form, seasonLabel, onSaved }: { form: SigningOnForm; seasonLabel: string; onSaved: (form: SigningOnForm) => void }) {
    const [fee, setFee] = useState('');
    const [feeNote, setFeeNote] = useState('');
    const [conduct, setConduct] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        setFee(form.feeAmount == null ? '' : form.feeAmount.toFixed(2));
        setFeeNote(form.feeNote ?? '');
        setConduct(form.conduct ?? '');
    }, [form]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = fee.trim() === '' ? null : Number(fee);
        if (amount !== null && !(Number.isFinite(amount) && amount >= 0)) {
            setMessage({ tone: 'error', text: 'Enter the fee in pounds, like 45 or 45.50, or leave it empty for no fee.' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const saved = await signingOnCall<SigningOnForm>('/form', {
                method: 'PUT',
                body: JSON.stringify({ feeAmount: amount, feeNote: feeNote.trim() || null, conduct: conduct.trim() || null }),
            }, "That didn't save. Please try again.");
            onSaved(saved);
            setMessage({ tone: 'success', text: 'Saved. Families see this when they sign on.' });
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "That didn't save. Please try again." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="card" aria-labelledby="signing-on-form-title">
            <h2 id="signing-on-form-title" className="text-2xl flex items-center gap-2"><Icon name="file" className="w-5 h-5 text-brand" /> This season&apos;s form</h2>
            <p className="text-sm text-muted mt-1 mb-5">
                {seasonLabel}. Families see this when they sign on in the club app.
            </p>
            <form onSubmit={save} className="space-y-4" noValidate>
                <div>
                    <label htmlFor="signing-on-fee" className="label">Signing-on fee (£)</label>
                    <input id="signing-on-fee" type="number" inputMode="decimal" step="0.01" min="0" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Leave empty for no fee" className="field" />
                </div>
                <div>
                    <label htmlFor="signing-on-pay" className="label">How to pay</label>
                    <textarea id="signing-on-pay" rows={2} maxLength={300} value={feeNote} onChange={(e) => setFeeNote(e.target.value)} placeholder="e.g. Bank transfer to the club account, with your child's name as the reference" className="field" />
                </div>
                <div>
                    <label htmlFor="signing-on-conduct" className="label">Code of conduct</label>
                    <textarea id="signing-on-conduct" rows={8} maxLength={6000} value={conduct} onChange={(e) => setConduct(e.target.value)} placeholder="Families must agree to this before they can sign on. Leave empty if you don't have one." className="field" />
                </div>
                {message && <Notice tone={message.tone}>{message.text}</Notice>}
                <div className="flex justify-end">
                    <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save the form'}</button>
                </div>
            </form>
        </section>
    );
}
