'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string;
    in_stock: boolean;
    sizes?: string[];
    colors?: string[];
}

interface TeamShopProps {
    tenant: string;
}

export function TeamShop({ tenant }: TeamShopProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    const categories = [
        { id: 'all', label: 'All Products', icon: '🛍️' },
        { id: 'clothing', label: 'Clothing', icon: '👕' },
        { id: 'accessories', label: 'Accessories', icon: '🧢' },
        { id: 'homeware', label: 'Homeware', icon: '🏠' },
        { id: 'custom', label: 'Custom', icon: '🎨' },
    ];

    useEffect(() => {
        loadProducts();
    }, [tenant, selectedCategory]);

    const loadProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/shop/products?category=${selectedCategory}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setProducts(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading shop...</div>;
    }

    // Product detail modal
    if (selectedProduct) {
        return (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
                    <button
                        onClick={() => setSelectedProduct(null)}
                        className="float-right text-2xl hover:text-gray-500"
                    >
                        ✕
                    </button>

                    <div className="grid md:grid-cols-2 gap-6 mt-8">
                        <img
                            src={selectedProduct.image_url}
                            alt={selectedProduct.name}
                            className="w-full h-64 object-cover rounded-lg"
                        />

                        <div>
                            <h2 className="text-2xl font-bold mb-2">{selectedProduct.name}</h2>
                            <p className="text-3xl font-bold text-brand mb-4">
                                £{selectedProduct.price.toFixed(2)}
                            </p>
                            <p className="text-gray-600 mb-4">{selectedProduct.description}</p>

                            {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                                <div className="mb-4">
                                    <p className="font-semibold mb-2">Available Sizes:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProduct.sizes.map(size => (
                                            <span key={size} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                                                {size}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                                <div className="mb-4">
                                    <p className="font-semibold mb-2">Available Colors:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProduct.colors.map(color => (
                                            <span key={color} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                                                {color}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => window.open('mailto:shop@team.com?subject=Product Order: ' + selectedProduct.name, '_blank')}
                                disabled={!selectedProduct.in_stock}
                                className="bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                            >
                                {selectedProduct.in_stock ? 'Order Now' : 'Out of Stock'}
                            </button>

                            <p className="text-xs text-gray-500 mt-4">
                                Orders are fulfilled via our official supplier. Click "Order Now" to send us an email with your requirements.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6">
                <h2 className="text-2xl font-bold">Team Shop</h2>
                <p className="text-sm opacity-90">Official merchandise & custom orders</p>
            </div>

            {/* Category Filter */}
            <div className="border-b px-4 py-3 flex gap-2 overflow-x-auto">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap ${selectedCategory === cat.id
                                ? 'bg-brand text-white'
                                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow text-left"
                        >
                            <div className="relative">
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-48 object-cover"
                                />
                                {!product.in_stock && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-white font-bold">Out of Stock</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold mb-1 truncate">{product.name}</h3>
                                <p className="text-brand font-bold text-lg">£{product.price.toFixed(2)}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No products available in this category
                    </div>
                )}
            </div>
        </div>
    );
}
