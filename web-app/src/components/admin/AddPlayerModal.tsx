'use client';

import { useState } from 'react';
import { ukDay } from '@/lib/format';
import { Dialog, Notice, sdkErrorMessage } from '@/components/admin/AdminUi';

/** What the "Sign a player" form sends to POST /api/v1/squad/add. */
export interface NewPlayer {
    firstName: string;
    lastName: string;
    number: number | null;
    position: string;
    role: string;
    photo_url: string;
    bio: string;
    signedDate: string;
    previousClub: string;
    signingNotes: string;
    announce: boolean;
}

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (playerData: NewPlayer) => Promise<void>;
}

const EMPTY = {
    firstName: '',
    lastName: '',
    number: '',
    position: 'Midfielder',
    role: 'Player',
    photo_url: '',
    bio: '',
    previousClub: '',
    signingNotes: '',
    announce: false,
};

export function AddPlayerModal({ isOpen, onClose, onSave }: AddPlayerModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ ...EMPTY, signedDate: ukDay() });

    if (!isOpen) return null;

    const close = () => {
        setError('');
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName.trim()) {
            setError('Enter the player\'s first name.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const number = parseInt(formData.number, 10);
            await onSave({ ...formData, number: Number.isNaN(number) ? null : number });
            setFormData({ ...EMPTY, signedDate: ukDay() });
            onClose();
        } catch (err) {
            setError(sdkErrorMessage(err, "The player wasn't added. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog title="Sign a player" onClose={close} wide>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="player-first-name" className="label">First name</label>
                        <input
                            id="player-first-name"
                            required
                            maxLength={40}
                            type="text"
                            autoComplete="off"
                            className="field"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            placeholder="e.g. Mary Jane"
                        />
                    </div>
                    <div>
                        <label htmlFor="player-last-name" className="label">Surname</label>
                        <input
                            id="player-last-name"
                            maxLength={40}
                            type="text"
                            autoComplete="off"
                            className="field"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            placeholder="e.g. Van Dijk"
                        />
                    </div>
                    <div>
                        <label htmlFor="player-number" className="label">Squad number</label>
                        <input
                            id="player-number"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={99}
                            className="field"
                            value={formData.number}
                            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                            placeholder="9"
                        />
                    </div>
                    <div>
                        <label htmlFor="player-position" className="label">Position</label>
                        <select id="player-position" className="field" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })}>
                            <option>Goalkeeper</option>
                            <option>Defender</option>
                            <option>Midfielder</option>
                            <option>Forward</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="player-role" className="label">Role</label>
                        <select id="player-role" className="field" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                            <option value="Player">Player</option>
                            <option value="Captain">Captain</option>
                            <option value="Vice Captain">Vice captain</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="player-signed" className="label">Signed on</label>
                        <input
                            id="player-signed"
                            type="date"
                            className="field"
                            value={formData.signedDate}
                            onChange={(e) => setFormData({ ...formData, signedDate: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="player-photo" className="label">Photo link (optional)</label>
                    <input
                        id="player-photo"
                        type="url"
                        className="field"
                        value={formData.photo_url}
                        onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                        placeholder="https://…"
                    />
                </div>

                <div>
                    <label htmlFor="player-bio" className="label">About the player (optional)</label>
                    <textarea
                        id="player-bio"
                        rows={3}
                        className="field"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                </div>

                <fieldset className="border border-border bg-surface-raised p-4 space-y-4 chamfer-sm">
                    <legend className="font-display text-lg font-extrabold uppercase tracking-wide px-1">Signing news</legend>
                    <div>
                        <label htmlFor="player-previous" className="label">Previous club (optional)</label>
                        <input
                            id="player-previous"
                            type="text"
                            className="field"
                            value={formData.previousClub}
                            onChange={(e) => setFormData({ ...formData, previousClub: e.target.value })}
                            placeholder="e.g. Anstey Nomads"
                        />
                    </div>
                    <div>
                        <label htmlFor="player-notes" className="label">A few words for the announcement (optional)</label>
                        <textarea
                            id="player-notes"
                            rows={2}
                            className="field"
                            value={formData.signingNotes}
                            onChange={(e) => setFormData({ ...formData, signingNotes: e.target.value })}
                            placeholder="A quote from the manager or the player"
                        />
                    </div>
                    <label htmlFor="announce" className="flex items-center gap-3 min-h-[40px] cursor-pointer">
                        <input
                            type="checkbox"
                            id="announce"
                            className="w-5 h-5 accent-[rgb(var(--brand-rgb))]"
                            checked={formData.announce}
                            onChange={(e) => setFormData({ ...formData, announce: e.target.checked })}
                        />
                        <span className="text-sm font-semibold">Post a welcome to the club news</span>
                    </label>
                </fieldset>

                {error && <Notice tone="error">{error}</Notice>}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button type="button" onClick={close} className="btn btn-ghost">Cancel</button>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? 'Signing…' : 'Sign player'}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
