'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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

export default function ShopSettingsPage() {
    const params = useParams();
    const tenant = params?.tenant as string;
    const [activeTab, setActiveTab] = useState<'phrases' | 'products'>('phrases');
    const [phrases, setPhrases] = useState<Phrase[]>([]);
    const [products, setProducts] = useState<ClubProduct[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showPhraseModal, setShowPhraseModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [newPhrase, setNewPhrase] = useState({ phrase: '', type: 'slogan' as const });
    const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' });

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [phrasesRes, productsRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/shop/phrases`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/v1/shop/club-products`, { credentials: 'include' }),
            ]);

            const [phrasesData, productsData] = await Promise.all([
                phrasesRes.json(),
                productsRes.json(),
            ]);

            if (phrasesData.success) setPhrases(phrasesData.data);
            if (productsData.success) setProducts(productsData.data);
        } catch (error) {
            console.error('Failed to fetch shop data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPhrase = async () => {
        if (!newPhrase.phrase) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/shop/phrases`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPhrase),
            });
            if ((await res.json()).success) {
                setShowPhraseModal(false);
                setNewPhrase({ phrase: '', type: 'slogan' });
                fetchData();
            }
        } catch (error) {
            console.error('Failed to add phrase:', error);
        }
    };

    const handleDeletePhrase = async (id: string) => {
        try {
            await fetch(`${API_BASE}/api/v1/shop/phrases/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            fetchData();
        } catch (error) {
            console.error('Failed to delete phrase:', error);
        }
    };

    const handleAddProduct = async () => {
        if (!newProduct.name || !newProduct.price) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/shop/club-products`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProduct.name,
                    description: newProduct.description,
                    price: parseFloat(newProduct.price),
                    category: newProduct.category || null,
                }),
            });
            if ((await res.json()).success) {
                setShowProductModal(false);
                setNewProduct({ name: '', description: '', price: '', category: '' });
                fetchData();
            }
        } catch (error) {
            console.error('Failed to add product:', error);
        }
    };

    const phraseTypes = [
        { value: 'slogan', label: '🏆 Team Slogan' },
        { value: 'funny', label: '😂 Funny Phrase' },
        { value: 'season', label: '📅 Season Theme' },
        { value: 'custom', label: '✏️ Custom' },
    ];

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Shop Settings</h1>
                <p className="text-gray-600 mt-1">Manage phrases, slogans, and custom products</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('phrases')}
                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'phrases'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                >
                    ✍️ Phrases & Slogans
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'products'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                >
                    📦 Club Products
                </button>
            </div>

            {/* Phrases Tab */}
            {activeTab === 'phrases' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h2 className="font-semibold text-gray-900">Custom Phrases</h2>
                            <p className="text-sm text-gray-500">Team slogans, funny phrases for merchandise</p>
                        </div>
                        <button
                            onClick={() => setShowPhraseModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Add Phrase
                        </button>
                    </div>
                    {phrases.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-2">✍️</div>
                            <p>No phrases yet. Add team slogans for personalized merchandise!</p>
                            <p className="text-sm mt-2">Examples: "Believe in the Dream", "Dad Taxi Driver", "Champions 2024"</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {phrases.map(phrase => (
                                <div key={phrase.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">"{phrase.phrase}"</p>
                                        <p className="text-sm text-gray-500">
                                            {phraseTypes.find(t => t.value === phrase.type)?.label || phrase.type}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeletePhrase(phrase.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h2 className="font-semibold text-gray-900">Club Products</h2>
                            <p className="text-sm text-gray-500">Your own products (official kit, tracksuits, etc.)</p>
                        </div>
                        <button
                            onClick={() => setShowProductModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Add Product
                        </button>
                    </div>
                    {products.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-2">📦</div>
                            <p>No club products yet. Add your own merchandise!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {products.map(product => (
                                <div key={product.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{product.name}</p>
                                        <p className="text-sm text-gray-500">
                                            £{product.price.toFixed(2)}
                                            {product.category && ` • ${product.category}`}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded ${product.stockQuantity === -1 || product.stockQuantity > 0
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                        {product.stockQuantity === -1 ? 'Unlimited' :
                                            product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Phrase Modal */}
            {showPhraseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Phrase</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phrase
                                </label>
                                <input
                                    type="text"
                                    value={newPhrase.phrase}
                                    onChange={(e) => setNewPhrase(p => ({ ...p, phrase: e.target.value }))}
                                    placeholder="e.g., Believe in the Dream"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type
                                </label>
                                <select
                                    value={newPhrase.type}
                                    onChange={(e) => setNewPhrase(p => ({ ...p, type: e.target.value as any }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    {phraseTypes.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowPhraseModal(false)} className="px-4 py-2 text-gray-600">
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPhrase}
                                disabled={!newPhrase.phrase}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                            >
                                Add Phrase
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Club Product</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Official Club Hoodie"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newProduct.price}
                                    onChange={(e) => setNewProduct(p => ({ ...p, price: e.target.value }))}
                                    placeholder="35.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={newProduct.description}
                                    onChange={(e) => setNewProduct(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Official club merchandise"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={newProduct.category}
                                    onChange={(e) => setNewProduct(p => ({ ...p, category: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">Select category</option>
                                    <option value="clothing">Clothing</option>
                                    <option value="accessories">Accessories</option>
                                    <option value="equipment">Equipment</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowProductModal(false)} className="px-4 py-2 text-gray-600">
                                Cancel
                            </button>
                            <button
                                onClick={handleAddProduct}
                                disabled={!newProduct.name || !newProduct.price}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                            >
                                Add Product
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
