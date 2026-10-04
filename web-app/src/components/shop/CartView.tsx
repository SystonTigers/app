import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createClientSDK } from '@/lib/sdk';
import { formatMoney } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { readCartId, writeCartId, type Cart } from './types';

interface CartViewProps {
    tenantId: string;
    onClose: () => void;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function CartView({ tenantId, onClose }: CartViewProps) {
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [checkingOut, setCheckingOut] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const cartId = readCartId(tenantId);
            if (!cartId) {
                setCart(null);
                return;
            }
            const res = await createClientSDK(tenantId).getCart(cartId);
            if (res.success) {
                setCart(res.cart as Cart);
            } else {
                writeCartId(tenantId, null);
                setCart(null);
            }
        } catch (e) {
            console.error('Load cart failed', e);
            setError("We couldn't load your basket. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    async function remove(variantId: string) {
        const cartId = readCartId(tenantId);
        if (!cartId) return;
        setError('');
        try {
            const res = await createClientSDK(tenantId).removeFromCart(cartId, variantId);
            if (res.success) setCart(res.cart as Cart);
        } catch (e) {
            console.error('Remove failed', e);
            setError("That didn't come out of your basket. Please try again.");
        }
    }

    async function checkout(e: FormEvent) {
        e.preventDefault();
        const cartId = readCartId(tenantId);
        if (!cartId) return;
        if (!EMAIL.test(email.trim())) {
            setError('Enter your email address so we can send your receipt.');
            return;
        }
        setCheckingOut(true);
        setError('');
        try {
            const res = await createClientSDK(tenantId).createCheckoutSession(cartId, email.trim());
            if (res.success && res.url) {
                window.location.href = res.url;
                return;
            }
            setError("Checkout didn't start. Please try again.");
        } catch (err) {
            console.error('Checkout failed', err);
            setError("Checkout didn't start. Check your connection and try again.");
        } finally {
            setCheckingOut(false);
        }
    }

    const items = cart?.items ?? [];
    const total = items.reduce((sum, item) => sum + item.priceGbp * item.quantity, 0);

    return (
        <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="basket-title">
            <div className="flex justify-between items-center mb-5">
                <h2 id="basket-title" className="text-3xl italic">Your basket</h2>
                <button type="button" onClick={onClose} className="w-11 h-11 flex items-center justify-center text-muted hover:text-brand" aria-label="Close basket">
                    <Icon name="close" className="w-6 h-6" />
                </button>
            </div>

            {loading ? (
                <div className="h-32 bg-surface-raised animate-pulse" aria-busy="true" aria-label="Loading your basket" />
            ) : items.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-muted mb-5">Your basket is empty.</p>
                    {error && <p role="alert" className="text-sm text-red-400 mb-3">{error}</p>}
                    <button type="button" onClick={onClose} className="btn btn-secondary">Keep shopping</button>
                </div>
            ) : (
                <form onSubmit={checkout}>
                    <ul className="space-y-3 mb-5">
                        {items.map((item) => (
                            <li key={item.variantId} className="flex justify-between items-center gap-3 bg-surface-raised border border-border chamfer-sm p-3">
                                <div className="min-w-0">
                                    <p className="font-bold break-words">{item.title}</p>
                                    <p className="text-sm text-muted">Qty {item.quantity}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold">{formatMoney(item.priceGbp * item.quantity)}</p>
                                    <button type="button" onClick={() => remove(item.variantId)} className="text-sm text-red-400 hover:underline min-h-[40px]">Remove</button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="flex justify-between font-display text-2xl font-extrabold uppercase border-t border-border pt-4 mb-5">
                        <span>Total</span>
                        <span>{formatMoney(total)}</span>
                    </div>

                    <label htmlFor="receipt-email" className="label">Email (for your receipt)</label>
                    <input id="receipt-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field mb-4" placeholder="you@example.com" />

                    {error && <p role="alert" className="text-sm text-red-400 mb-3">{error}</p>}
                    <button type="submit" disabled={checkingOut} className="btn btn-primary w-full">
                        {checkingOut ? 'Taking you to payment…' : 'Pay securely'}
                    </button>
                </form>
            )}
        </div>
    );
}
