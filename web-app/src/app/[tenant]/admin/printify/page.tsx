'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/session';
import { formatDate, formatMoney } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Dialog, LoadingBlock, Notice, Pill, bodyError } from '@/components/admin/AdminUi';

interface Blueprint {
    id: number;
    title: string;
    description: string;
    images: string[];
}

interface Player {
    id: string;
    name: string;
    squadNumber: number | null;
}

/** Row shape returned by GET /api/v1/squad. */
interface SquadRow {
    id: string;
    name: string;
    squad_number?: number | null;
}

interface OrderItem {
    quantity: number;
    title: string;
    personalization?: { name?: string; number?: string | number };
}

interface ShopOrder {
    id: string;
    customer_name: string;
    customer_email: string;
    total_gbp: number;
    status: string;
    created_at: number;
    items: OrderItem[];
}

type Tab = 'templates' | 'preview' | 'orders';

const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
    { id: 'templates', label: 'Products', icon: 'shirt' },
    { id: 'preview', label: 'Name and number', icon: 'eye' },
    { id: 'orders', label: 'Orders', icon: 'bag' },
];

const CATEGORIES = [
    { id: 't-shirt', label: 'T-shirts' },
    { id: 'hoodie', label: 'Hoodies' },
    { id: 'hat', label: 'Hats' },
    { id: 'mug', label: 'Mugs' },
    { id: 'bag', label: 'Bags' },
    { id: 'sticker', label: 'Stickers' },
    { id: '', label: 'All' },
];

/**
 * Club kit printed on demand (Printify). Until Boost Huddle connects the print
 * partner the API answers 503 and the page says so; orders still show.
 */
export default function PrintifyAdminPage() {
    const [activeTab, setActiveTab] = useState<Tab>('templates');
    const [userShopId, setUserShopId] = useState('');
    const [searchQuery, setSearchQuery] = useState('t-shirt');
    const [catalog, setCatalog] = useState<Blueprint[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [addingProduct, setAddingProduct] = useState<Blueprint | null>(null);
    const [price, setPrice] = useState('20.00');
    const [isSaving, setIsSaving] = useState(false);
    const [notConnected, setNotConnected] = useState(false);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    const fetchData = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const [catalogRes, playersRes, shopsRes, ordersRes] = await Promise.all([
                apiFetch(`/api/v1/printify/catalog?category=${encodeURIComponent(query)}`),
                apiFetch('/api/v1/squad'),
                apiFetch('/api/v1/printify/shops'),
                apiFetch('/api/v1/shop/orders'),
            ]);
            const [catalogData, playersData, shopsData, ordersData] = await Promise.all(
                [catalogRes, playersRes, shopsRes, ordersRes].map((r) => r.json().catch(() => null)),
            );
            // 503: Boost Huddle hasn't switched merchandise on yet (no Printify account set up)
            setNotConnected(catalogRes.status === 503 || shopsRes.status === 503);
            if (catalogData?.success) setCatalog((catalogData.data as Blueprint[]).slice(0, 20));
            if (playersData?.success && Array.isArray(playersData.data)) {
                setPlayers((playersData.data as SquadRow[]).map((p) => ({ id: p.id, name: p.name, squadNumber: p.squad_number ?? null })));
            }
            if (shopsData?.success && shopsData.data?.length > 0) setUserShopId(String(shopsData.data[0].id));
            if (ordersData?.success) setOrders(ordersData.data as ShopOrder[]);
        } catch {
            setMessage({ tone: 'error', text: "We couldn't load club kit. Check your connection and try again." });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(searchQuery);
    }, [searchQuery, fetchData]);

    const handleGeneratePreview = async () => {
        if (!selectedPlayer) return;
        setMessage(null);
        try {
            const res = await apiFetch(`/api/v1/personalization/preview/${encodeURIComponent(selectedPlayer)}`);
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(bodyError(data, "The preview didn't load. Please try again."));
            setPreviewImage(data.data.preview as string);
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "The preview didn't load. Please try again." });
        }
    };

    const handleAddProduct = async () => {
        if (!addingProduct || !price) return;
        setIsSaving(true);
        setMessage(null);
        try {
            const providersRes = await apiFetch(`/api/v1/printify/catalog/${addingProduct.id}/providers`);
            const providerId = (await providersRes.json())?.data?.[0]?.id;
            if (!providerId) throw new Error('No printer offers this product at the moment. Try another one.');
            const variantsRes = await apiFetch(`/api/v1/printify/catalog/${addingProduct.id}/providers/${providerId}/variants`);
            const variantId = (await variantsRes.json())?.data?.[0]?.id;
            if (!variantId) throw new Error('This product has no sizes available at the moment. Try another one.');
            const createRes = await apiFetch('/api/v1/printify/products', {
                method: 'POST',
                body: JSON.stringify({
                    shopId: userShopId,
                    title: addingProduct.title,
                    description: addingProduct.description,
                    blueprintId: addingProduct.id,
                    printProviderId: providerId,
                    variants: [{ id: variantId, price: Math.round(parseFloat(price) * 100), isEnabled: true }],
                    printAreas: [],
                }),
            });
            const createData = await createRes.json().catch(() => null);
            if (!createRes.ok || !createData?.success) throw new Error(bodyError(createData, "The product wasn't added. Please try again."));
            setMessage({ tone: 'success', text: `${addingProduct.title} added to your club shop.` });
            setAddingProduct(null);
            setPrice('20.00');
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "The product wasn't added. Please try again." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container py-8 md:py-10">
            <PageHeader eyebrow="Club admin" title="Club kit" subtitle="Printed-to-order kit with each player's name and number, sold through your club shop." />

            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            <div className="flex gap-1 overflow-x-auto scrollbar-none border-b border-border mb-6" role="tablist" aria-label="Club kit">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 h-11 px-3 font-display text-[15px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'text-brand border-brand' : 'text-gray-300 border-transparent hover:text-foreground'}`}
                    >
                        <Icon name={tab.icon} className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <LoadingBlock label="Loading club kit" />
            ) : activeTab === 'templates' ? (
                notConnected ? (
                    <EmptyNote icon="shirt" title="Club kit isn't switched on yet">
                        Once Boost Huddle connects the print partner, products appear here and you can add personalised kit to your club shop.
                    </EmptyNote>
                ) : (
                    <section className="card" aria-labelledby="catalog-title">
                        <h2 id="catalog-title" className="text-2xl">Products you can sell</h2>
                        <p className="text-sm text-muted mt-1 mb-4">When a parent orders, their child&apos;s name and number are added for them. You don&apos;t need a product per player.</p>
                        <div className="flex flex-wrap gap-2 mb-5">
                            {CATEGORIES.map((cat) => (
                                <button key={cat.label} type="button" aria-pressed={searchQuery === cat.id} onClick={() => setSearchQuery(cat.id)}
                                    className={`btn btn-sm ${searchQuery === cat.id ? 'btn-primary' : 'btn-secondary'}`}>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        {catalog.length === 0 ? (
                            <p className="text-muted">Nothing in this group. Try another one.</p>
                        ) : (
                            <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {catalog.map((bp) => (
                                    <li key={bp.id} className="bg-surface-raised border border-border p-3 flex flex-col">
                                        <div className="aspect-square bg-background mb-2 flex items-center justify-center overflow-hidden">
                                            {bp.images?.[0] ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={bp.images[0]} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Icon name="shirt" className="w-10 h-10 text-muted" />
                                            )}
                                        </div>
                                        <h3 className="text-sm font-sans normal-case tracking-normal font-semibold truncate mb-2">{bp.title}</h3>
                                        <button type="button" onClick={() => setAddingProduct(bp)} className="btn btn-sm btn-secondary mt-auto">
                                            <Icon name="plus" className="w-4 h-4" /> Add to shop
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )
            ) : activeTab === 'preview' ? (
                <section className="card space-y-4" aria-labelledby="preview-title">
                    <h2 id="preview-title" className="text-2xl">See a player&apos;s name and number</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <label htmlFor="preview-player" className="sr-only">Player</label>
                        <select id="preview-player" value={selectedPlayer} onChange={(e) => { setSelectedPlayer(e.target.value); setPreviewImage(null); }} className="field flex-1">
                            <option value="">Pick a player</option>
                            {players.map((p) => <option key={p.id} value={p.id}>{p.name}{p.squadNumber ? ` #${p.squadNumber}` : ''}</option>)}
                        </select>
                        <button type="button" onClick={handleGeneratePreview} disabled={!selectedPlayer || notConnected} className="btn btn-primary">Show preview</button>
                    </div>
                    {notConnected && <p className="text-sm text-muted">Previews work once club kit is switched on.</p>}
                    {previewImage && (
                        <div className="bg-background border border-border p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewImage} alt="Name and number preview" className="w-full max-w-xs mx-auto" />
                        </div>
                    )}
                </section>
            ) : orders.length === 0 ? (
                <EmptyNote icon="bag" title="No orders yet">Orders from your club shop will show here.</EmptyNote>
            ) : (
                <div className="card p-0">
                    <div className="table-scroll relative">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                                    <th scope="col" className="px-4 py-3">Customer</th>
                                    <th scope="col" className="px-4 py-3">Items</th>
                                    <th scope="col" className="px-4 py-3">Total</th>
                                    <th scope="col" className="px-4 py-3">Status</th>
                                    <th scope="col" className="px-4 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold">{order.customer_name}</div>
                                            <div className="text-xs text-muted">{order.customer_email}</div>
                                        </td>
                                        <td className="px-4 py-3 space-y-1">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="text-xs">
                                                    {item.quantity} × {item.title}
                                                    {item.personalization?.name && <span className="text-brand"> ({item.personalization.name} #{item.personalization.number})</span>}
                                                </div>
                                            ))}
                                        </td>
                                        <td className="px-4 py-3 font-semibold">{formatMoney(order.total_gbp)}</td>
                                        <td className="px-4 py-3"><Pill tone={order.status === 'paid' ? 'success' : order.status === 'shipped' ? 'brand' : 'neutral'}>{order.status}</Pill></td>
                                        <td className="px-4 py-3 text-muted">{formatDate(order.created_at * 1000)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {addingProduct && (
                <Dialog title={addingProduct.title} onClose={() => setAddingProduct(null)}>
                    {addingProduct.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={addingProduct.images[0]} alt="" className="h-32 mx-auto object-contain bg-background mb-5" />
                    )}
                    <label htmlFor="kit-price" className="label">Price in the shop (£)</label>
                    <input id="kit-price" type="number" inputMode="decimal" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="field mb-3" />
                    <p className="text-sm text-muted mb-5">The name and number are added when someone orders.</p>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button type="button" onClick={() => setAddingProduct(null)} className="btn btn-ghost">Cancel</button>
                        <button type="button" onClick={handleAddProduct} disabled={isSaving} className="btn btn-primary">{isSaving ? 'Adding…' : 'Add to shop'}</button>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
