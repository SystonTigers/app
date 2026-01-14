'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface PrintifyProduct {
    id: string;
    title: string;
    description: string;
    images: Array<{ src: string }>;
}

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
    headshotUrl: string | null;
}

interface ShopOrder {
    id: string;
    customer_name: string;
    customer_email: string;
    total_gbp: number;
    status: string;
    created_at: number;
    items: any[];
}

export default function PrintifyAdminPage() {
    const params = useParams();
    const tenant = params?.tenant as string;
    const [activeTab, setActiveTab] = useState<'templates' | 'preview' | 'orders'>('templates');
    const [userShopId, setUserShopId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('t-shirt');
    const [catalog, setCatalog] = useState<Blueprint[]>([]);
    const [products, setProducts] = useState<PrintifyProduct[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [addingProduct, setAddingProduct] = useState<Blueprint | null>(null);
    const [price, setPrice] = useState('20.00');
    const [isSaving, setIsSaving] = useState(false);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    useEffect(() => {
        fetchData(searchQuery);
    }, [searchQuery]);

    const fetchData = async (query: string) => {
        setLoading(true);
        try {
            const [catalogRes, playersRes, shopsRes, ordersRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/printify/catalog?category=${query}`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/v1/players`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/v1/printify/shops`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/v1/shop/orders`, { credentials: 'include' }),
            ]);

            const [catalogData, playersData, shopsData, ordersData] = await Promise.all([
                catalogRes.json(),
                playersRes.json(),
                shopsRes.json(),
                ordersRes.json(),
            ]);

            if (catalogData.success) setCatalog(catalogData.data.slice(0, 20));
            if (playersData.success) setPlayers(playersData.data);
            if (playersData.success) setPlayers(playersData.data);
            if (shopsData.success && shopsData.data?.length > 0) {
                setUserShopId(shopsData.data[0].id);
            }
            if (ordersData.success) setOrders(ordersData.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePreview = async () => {
        if (!selectedPlayer) return;

        try {
            const res = await fetch(`${API_BASE}/api/v1/personalization/preview/${selectedPlayer}`, {
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                setPreviewImage(data.data.preview);
            }
        } catch (error) {
            console.error('Failed to generate preview:', error);
        }
    };

    const handleAddProduct = async () => {
        if (!addingProduct || !price) return;
        setIsSaving(true);

        try {
            // 1. Get providers
            const providersRes = await fetch(`${API_BASE}/api/v1/printify/catalog/${addingProduct.id}/providers`, { credentials: 'include' });
            const providersData = await providersRes.json();
            const providerId = providersData.data?.[0]?.id; // Pick first provider for MVP

            if (!providerId) throw new Error('No print providers found');

            // 2. Get variants
            const variantsRes = await fetch(`${API_BASE}/api/v1/printify/catalog/${addingProduct.id}/providers/${providerId}/variants`, { credentials: 'include' });
            const variantsData = await variantsRes.json();
            const variantId = variantsData.data?.[0]?.id; // Pick first variant (e.g. Small or One Size)

            if (!variantId) throw new Error('No variants found');

            // 3. Create product
            const createRes = await fetch(`${API_BASE}/api/v1/printify/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    // shopId: 'your-shop-id', // Removed duplicate
                    // Checking backend: It expects shopId in body.
                    // We need to fetch the shop ID first? Or hardcode if we know it?
                    // Let's assume backend might fallback or we fetch it. 
                    // Use a placeholder or fetch shops first.
                    // Ideally we should list shops and pick one.
                    // For now, let's fetch shops first in fetchData.
                    shopId: userShopId,
                    title: addingProduct.title,
                    description: addingProduct.description,
                    blueprintId: addingProduct.id,
                    printProviderId: providerId,
                    variants: [{
                        id: variantId,
                        price: Math.round(parseFloat(price) * 100), // convert to cents/pence
                        isEnabled: true
                    }],
                    printAreas: [] // Empty for now, personalization adds it later
                })
            });

            const createData = await createRes.json();
            if (createData.success) {
                setAddingProduct(null);
                setPrice('20.00');
                // Maybe refresh list or show success
                alert('Product added to shop!');
            } else {
                alert('Failed to add product: ' + (createData.error?.message || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Error adding product:', error);
            alert('Error adding product: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'templates', label: '🎨 Product Templates', icon: '🎨' },
        { id: 'preview', label: '👁️ Personalization Preview', icon: '👁️' },
        { id: 'orders', label: '📦 Orders', icon: '📦' },
    ];

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-48 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Printify Integration</h1>
                <p className="text-gray-600 mt-1">Manage print-on-demand merchandise</p>
            </div>

            {/* Info Banner */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🖨️</span>
                    <div>
                        <h3 className="font-semibold">How Personalization Works</h3>
                        <p className="text-sm opacity-90">
                            When a parent orders, we auto-generate their child's name + number on the product.
                            No need to create products for each player!
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg font-medium ${activeTab === tab.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="font-semibold text-gray-900 mb-4">Available Product Types</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            These are the base products from Printify that can be personalized with your club badge and player details.
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {[
                                { id: 't-shirt', label: '👕 T-Shirts' },
                                { id: 'hoodie', label: '🧥 Hoodies' },
                                { id: 'hat', label: '🧢 Hats' },
                                { id: 'mug', label: '☕ Mugs' },
                                { id: 'bag', label: '🎒 Bags' },
                                { id: 'sticker', label: '🏷️ Stickers' },
                                { id: 'baby', label: '👶 Baby' },
                                { id: 'phone', label: '📱 Phone' },
                                { id: 'all', label: '🔍 All' },
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSearchQuery(cat.id === 'all' ? '' : cat.id)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${searchQuery === cat.id || (cat.id === 'all' && searchQuery === '')
                                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {catalog.map((blueprint) => (
                                <div key={blueprint.id} className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors flex flex-col h-full">
                                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                                        {blueprint.images?.[0] ? (
                                            <img src={blueprint.images[0]} alt={blueprint.title} className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <span className="text-4xl">👕</span>
                                        )}
                                    </div>
                                    <h3 className="font-medium text-sm text-gray-900 truncate mb-1">{blueprint.title}</h3>
                                    <div className="mt-auto pt-2">
                                        <button
                                            onClick={() => setAddingProduct(blueprint)}
                                            className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded"
                                        >
                                            ➕ Add to Shop
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            {addingProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-lg">{addingProduct.title}</h3>
                            <button onClick={() => setAddingProduct(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-center mb-6">
                                {addingProduct.images?.[0] && (
                                    <img src={addingProduct.images[0]} className="h-32 rounded-lg object-contain bg-gray-50" />
                                )}
                            </div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Retail Price (£)
                                <span className="text-xs font-normal text-gray-500 ml-2">What customers will pay</span>
                            </label>
                            <div className="relative mb-6">
                                <span className="absolute left-3 top-2 text-gray-500">£</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                />
                            </div>

                            <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg mb-6">
                                ℹ️ This will add the "{addingProduct.title}" to your shop.
                                Personalization (Name/Number) will be applied automatically when ordered.
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAddingProduct(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddProduct}
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        'Add to Shop'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Test Personalization</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Select a player to see how their personalized merchandise would look.
                    </p>

                    <div className="flex gap-4 mb-6">
                        <select
                            value={selectedPlayer}
                            onChange={(e) => setSelectedPlayer(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">Select a player...</option>
                            {players.map((player) => (
                                <option key={player.id} value={player.id}>
                                    {player.name} {player.squadNumber ? `#${player.squadNumber}` : ''}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleGeneratePreview}
                            disabled={!selectedPlayer}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50 hover:bg-purple-700"
                        >
                            Generate Preview
                        </button>
                    </div>

                    {previewImage && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-medium text-gray-900 mb-2">Design Preview</h3>
                                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <img src={previewImage} alt="Preview" className="w-full max-w-xs mx-auto" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 mb-2">How It Works</h3>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                                    <li>Parent/player opens your shop</li>
                                    <li>They see products with their name + number pre-filled</li>
                                    <li>They can customize if they want (different name, etc.)</li>
                                    <li>They order → Design is generated → Sent to Printify</li>
                                    <li>Printify prints and ships directly to them</li>
                                    <li>You keep the profit margin! 💰</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {!previewImage && selectedPlayer && (
                        <div className="text-center py-8 text-gray-500">
                            <span className="text-4xl mb-2 block">👆</span>
                            <p>Click "Generate Preview" to see the personalized design</p>
                        </div>
                    )}
                </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Order History</h2>
                    </div>
                    {orders.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <span className="text-4xl mb-2 block">📦</span>
                            <p>No orders yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Order ID</th>
                                        <th className="px-4 py-3 font-medium">Customer</th>
                                        <th className="px-4 py-3 font-medium">Items</th>
                                        <th className="px-4 py-3 font-medium">Total</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                {order.id.substring(0, 8)}...
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{order.customer_name}</div>
                                                <div className="text-xs text-gray-500">{order.customer_email}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {order.items.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-1 text-xs">
                                                            <span className="font-medium">{item.quantity}x</span>
                                                            <span>{item.title}</span>
                                                            {item.personalization?.name && (
                                                                <span className="bg-purple-100 text-purple-700 px-1 rounded text-[10px]">
                                                                    {item.personalization.name} #{item.personalization.number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                £{(order.total_gbp / 100).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${order.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {new Date(order.created_at * 1000).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
