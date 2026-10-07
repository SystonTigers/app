'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/session';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { Dialog, ErrorNote, LoadingBlock, Notice, bodyError } from '@/components/admin/AdminUi';
import { ClubExtraGate } from '@/components/ClubExtraGate';

interface Phrase {
    id: string;
    phrase: string;
    type: string;
    isDefault: boolean;
}

interface ClubProduct {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: string | null;
    imageUrl: string | null;
    stockQuantity: number;
}

type PhraseType = 'slogan' | 'funny' | 'season' | 'custom';

const PHRASE_TYPES: Array<{ value: PhraseType; label: string }> = [
    { value: 'slogan', label: 'Team slogan' },
    { value: 'funny', label: 'Funny' },
    { value: 'season', label: 'Season' },
    { value: 'custom', label: 'Other' },
];

const pounds = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

/** Words for printed kit and the club's own products, for the club shop. */
function ShopSettingsPageContent() {
    const [phrases, setPhrases] = useState<Phrase[]>([]);
    const [products, setProducts] = useState<ClubProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const [dialog, setDialog] = useState<'phrase' | 'product' | null>(null);
    const [dialogError, setDialogError] = useState('');
    const [busy, setBusy] = useState(false);
    const [newPhrase, setNewPhrase] = useState<{ phrase: string; type: PhraseType }>({ phrase: '', type: 'slogan' });
    const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' });

    const fetchData = useCallback(async () => {
        setLoadError('');
        try {
            const [p1, p2] = await Promise.all([apiFetch('/api/v1/shop/phrases'), apiFetch('/api/v1/shop/club-products')]);
            const [d1, d2] = await Promise.all([p1.json().catch(() => null), p2.json().catch(() => null)]);
            if (!d1?.success && !d2?.success) throw new Error();
            setPhrases(d1?.success ? (d1.data as Phrase[]) : []);
            setProducts(d2?.success ? (d2.data as ClubProduct[]) : []);
        } catch {
            setLoadError("We couldn't load your shop settings. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function send(path: string, init: RequestInit, done: string, fallback: string): Promise<boolean> {
        setBusy(true);
        setDialogError('');
        setMessage(null);
        try {
            const res = await apiFetch(path, init);
            const data = await res.json().catch(() => null);
            if (!res.ok || data?.success === false) throw new Error(bodyError(data, fallback));
            setMessage({ tone: 'success', text: done });
            fetchData();
            return true;
        } catch (err) {
            const text = err instanceof Error ? err.message : fallback;
            if (dialog) setDialogError(text);
            else setMessage({ tone: 'error', text });
            return false;
        } finally {
            setBusy(false);
        }
    }

    const addPhrase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPhrase.phrase.trim()) return setDialogError('Write the phrase first.');
        if (await send('/api/v1/shop/phrases', { method: 'POST', body: JSON.stringify({ ...newPhrase, phrase: newPhrase.phrase.trim() }) }, 'Phrase added.', "The phrase wasn't added. Please try again.")) {
            setDialog(null);
            setNewPhrase({ phrase: '', type: 'slogan' });
        }
    };

    const addProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const price = parseFloat(newProduct.price);
        if (!newProduct.name.trim() || !(price >= 0)) return setDialogError('Enter a name and a price.');
        if (await send('/api/v1/shop/club-products', {
            method: 'POST',
            body: JSON.stringify({ name: newProduct.name.trim(), description: newProduct.description, price, category: newProduct.category || null }),
        }, 'Product added.', "The product wasn't added. Please try again.")) {
            setDialog(null);
            setNewProduct({ name: '', description: '', price: '', category: '' });
        }
    };

    return (
        <div className="container py-8 md:py-10 max-w-4xl">
            <PageHeader eyebrow="Club admin" title="Shop settings" subtitle="Phrases for printed kit and your club's own products." />
            <div className="mb-6">
                <Notice tone="info">These are used by your club shop. You can get them ready before anything goes on sale.</Notice>
            </div>
            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loading ? (
                <LoadingBlock label="Loading shop settings" />
            ) : loadError ? (
                <ErrorNote message={loadError} onRetry={() => { setLoading(true); fetchData(); }} />
            ) : (
                <div className="space-y-6">
                    <section className="card" aria-labelledby="phrases-title">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                            <div>
                                <h2 id="phrases-title" className="text-2xl">Phrases</h2>
                                <p className="text-sm text-muted mt-1">Slogans people can add to printed kit.</p>
                            </div>
                            <button type="button" onClick={() => { setDialogError(''); setDialog('phrase'); }} className="btn btn-sm btn-primary"><Icon name="plus" className="w-4 h-4" /> Add phrase</button>
                        </div>
                        {phrases.length === 0 ? (
                            <p className="text-sm text-muted border border-dashed border-border p-4 text-center">No phrases yet. For example: &quot;Believe&quot;, &quot;Taxi driver to a star&quot;, &quot;Champions 2026&quot;.</p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {phrases.map((phrase) => (
                                    <li key={phrase.id} className="py-3 flex items-center justify-between gap-3">
                                        <span>
                                            <span className="font-semibold">&ldquo;{phrase.phrase}&rdquo;</span>
                                            <span className="block text-sm text-muted">{PHRASE_TYPES.find((t) => t.value === phrase.type)?.label ?? phrase.type}</span>
                                        </span>
                                        <button type="button" disabled={busy} onClick={() => send(`/api/v1/shop/phrases/${phrase.id}`, { method: 'DELETE' }, 'Phrase removed.', "The phrase wasn't removed. Please try again.")} className="p-2.5 text-muted hover:text-red-400" aria-label={`Remove "${phrase.phrase}"`}>
                                            <Icon name="trash" className="w-5 h-5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="card" aria-labelledby="products-title">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                            <div>
                                <h2 id="products-title" className="text-2xl">Club products</h2>
                                <p className="text-sm text-muted mt-1">Your own kit, such as training tops and tracksuits.</p>
                            </div>
                            <button type="button" onClick={() => { setDialogError(''); setDialog('product'); }} className="btn btn-sm btn-primary"><Icon name="plus" className="w-4 h-4" /> Add product</button>
                        </div>
                        {products.length === 0 ? (
                            <p className="text-sm text-muted border border-dashed border-border p-4 text-center">No products yet.</p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {products.map((product) => (
                                    <li key={product.id} className="py-3 flex items-center justify-between gap-3">
                                        <span>
                                            <span className="font-semibold">{product.name}</span>
                                            <span className="block text-sm text-muted">{pounds(product.price)}{product.category ? ` · ${product.category}` : ''}</span>
                                        </span>
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted">
                                            {product.stockQuantity === -1 ? 'No limit' : product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Sold out'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}

            {dialog === 'phrase' && (
                <Dialog title="Add a phrase" onClose={() => setDialog(null)}>
                    <form onSubmit={addPhrase} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="phrase-text" className="label">Phrase</label>
                            <input id="phrase-text" type="text" maxLength={60} value={newPhrase.phrase} onChange={(e) => setNewPhrase({ ...newPhrase, phrase: e.target.value })} className="field" />
                        </div>
                        <div>
                            <label htmlFor="phrase-type" className="label">Kind</label>
                            <select id="phrase-type" value={newPhrase.type} onChange={(e) => setNewPhrase({ ...newPhrase, type: e.target.value as PhraseType })} className="field">
                                {PHRASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        {dialogError && <Notice tone="error">{dialogError}</Notice>}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button type="button" onClick={() => setDialog(null)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" disabled={busy} className="btn btn-primary">Add phrase</button>
                        </div>
                    </form>
                </Dialog>
            )}

            {dialog === 'product' && (
                <Dialog title="Add a product" onClose={() => setDialog(null)}>
                    <form onSubmit={addProduct} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="product-name" className="label">Name</label>
                            <input id="product-name" type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. Club hoodie" className="field" />
                        </div>
                        <div>
                            <label htmlFor="product-price" className="label">Price (£)</label>
                            <input id="product-price" type="number" inputMode="decimal" step="0.01" min="0" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} className="field" />
                        </div>
                        <div>
                            <label htmlFor="product-description" className="label">Description (optional)</label>
                            <textarea id="product-description" rows={2} value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className="field" />
                        </div>
                        <div>
                            <label htmlFor="product-category" className="label">Category</label>
                            <select id="product-category" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="field">
                                <option value="">Choose</option>
                                <option value="clothing">Clothing</option>
                                <option value="accessories">Accessories</option>
                                <option value="equipment">Equipment</option>
                            </select>
                        </div>
                        {dialogError && <Notice tone="error">{dialogError}</Notice>}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button type="button" onClick={() => setDialog(null)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" disabled={busy} className="btn btn-primary">Add product</button>
                        </div>
                    </form>
                </Dialog>
            )}
        </div>
    );
}

/** Only for clubs that have switched this extra on (Settings, Club extras). */
export default function ShopSettingsPage() {
    return (
        <ClubExtraGate module="shop">
            <ShopSettingsPageContent />
        </ClubExtraGate>
    );
}
