import { useState } from 'react';
import { createClientSDK } from '@/lib/sdk';

interface Product {
    id: string;
    title: string;
    description: string;
    image_url: string;
    variants: any[];
}

interface ProductDetailProps {
    tenantId: string;
    product: Product;
    onBack: () => void;
    onAddToCart: () => void; // Callback to refresh cart count or open cart
}

export function ProductDetail({ tenantId, product, onBack, onAddToCart }: ProductDetailProps) {
    const [selectedVariantId, setSelectedVariantId] = useState<string>(
        product.variants && product.variants.length > 0 ? product.variants[0].id : ''
    );
    const [isAdding, setIsAdding] = useState(false);

    const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
    const price = selectedVariant ? selectedVariant.price_gbp : 0;

    const handleAddToCart = async () => {
        if (!selectedVariantId) return;
        setIsAdding(true);
        try {
            const sdk = createClientSDK(tenantId);
            // Ensure cart exists. 
            // In a real app we might store cartId in localStorage.
            // For simplicity, let's look for cartId in localStorage or create a new one.
            let cartId = localStorage.getItem(`cart_${tenantId}`);

            if (!cartId) {
                const res = await sdk.createCart();
                if (res.success && res.cart) {
                    cartId = res.cart.id;
                    if (cartId) {
                        localStorage.setItem(`cart_${tenantId}`, cartId);
                    }
                } else {
                    throw new Error('Failed to create cart');
                }
            }

            if (!cartId) {
                throw new Error('Cart ID is missing');
            }

            await sdk.addToCart(cartId, selectedVariantId, 1);
            onAddToCart();
        } catch (e) {
            console.error('Add to cart failed', e);
            // If cart not found (expired), detailed logic would create a new one and retry.
            // For now, simple error logging.
            alert('Failed to add to cart. Please try again.');
            localStorage.removeItem(`cart_${tenantId}`); // Clear invalid cart
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl mx-auto shadow-lg">
            <button
                onClick={onBack}
                className="mb-4 text-brand hover:underline flex items-center gap-2"
            >
                ← Back to Shop
            </button>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square relative">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-4xl">🛍️</div>
                    )}
                </div>

                <div>
                    <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                    <p className="text-2xl font-bold text-brand mb-4">
                        £{(price / 100).toFixed(2)}
                    </p>

                    <div className="prose dark:prose-invert mb-6 text-gray-600 dark:text-gray-300">
                        {product.description}
                    </div>

                    {product.variants && product.variants.length > 0 && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Select Option</label>
                            <div className="flex flex-wrap gap-2">
                                {product.variants.map((variant: any) => (
                                    <button
                                        key={variant.id}
                                        onClick={() => setSelectedVariantId(variant.id)}
                                        className={`px-4 py-2 rounded border ${selectedVariantId === variant.id
                                            ? 'bg-brand text-white border-brand'
                                            : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {variant.title} - £{(variant.price_gbp / 100).toFixed(2)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleAddToCart}
                        disabled={isAdding || !selectedVariantId}
                        className="w-full py-3 px-6 bg-brand text-white font-bold rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isAdding ? 'Adding...' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </div>
    );
}
