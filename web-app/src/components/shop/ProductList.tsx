import { useState, useEffect } from 'react';
import { createClientSDK } from '@/lib/sdk';
import { ProductPreview } from './ProductPreview';

interface Product {
    id: string;
    title: string;
    description: string;
    price_gbp?: number;
    image_url: string;
    variants: any[];
    personalization?: any;
}

interface ProductListProps {
    tenantId: string;
    onProductSelect: (product: Product) => void;
}

export function ProductList({ tenantId, onProductSelect }: ProductListProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const sdk = createClientSDK(tenantId);
                const res = await sdk.getShopProducts();
                const response: any = res;
                if (response.success && response.data?.products?.personalized) {
                    setProducts(response.data.products.personalized);
                } else if (response.success && Array.isArray(response.data)) {
                    // Fallback for array response if structure differs
                    setProducts(response.data);
                }
            } catch (e) {
                console.error("Failed to load products", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>No products available yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
            {products.map((product) => {
                const price = product.price_gbp
                    ? product.price_gbp
                    : (product.variants && product.variants.length > 0 ? product.variants[0].price_gbp : 0);

                return (
                    <button
                        key={product.id}
                        onClick={() => onProductSelect(product)}
                        className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow hover:shadow-lg transition-all text-left flex flex-col h-full group"
                    >
                        <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
                            {product.image_url ? (
                                <div className="w-full h-full transform group-hover:scale-105 transition-transform duration-500">
                                    <ProductPreview
                                        imageUrl={product.image_url}
                                        productTitle={product.title}
                                        personalization={product.personalization}
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                                    🛍️
                                </div>
                            )}
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-bold text-lg mb-1 line-clamp-2">{product.title}</h3>
                            <p className="text-brand font-bold text-xl mt-auto">
                                £{(price / 100).toFixed(2)}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
