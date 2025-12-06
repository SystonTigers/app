import { useState, useEffect } from 'react';
import { createClientSDK } from '@/lib/sdk'; // Adjust import if needed

interface Product {
    id: string;
    title: string;
    description: string;
    price_gbp?: number; // Backend sends price_gbp if flat, or check variants
    image_url: string;
    variants: any[];
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
                // Backend returns result.data which is array. 
                // Let's verify SDK implementation detail: 
                // SDK: return http<any[]>(...)
                // Backend response: { success: true, data: [...] }
                // Wait, SDK generic http returns `data as T`.
                // If backend returns { success: true, data: [...] }, T should be that shape.
                // But SDK says `return http<any[]>(...)`. If backend returns { success: true... }, then T is that object.
                // Let's assume SDK `http` returns the parsed JSON. 
                // Sores variable in SDK `getShopProducts` is what `http` returns.
                // If my SDK type was `any[]`, but actual JSON is `{ success: true, data: [] }`, I need to handle that.
                // Let's standardise SDK call in component to be safe.

                // Actually looking at SDK again: 
                // const data = await res.json();
                // return data as T;

                // And backend sends: `json({ success: true, data: productsWithVariants })`

                // So SDK `getShopProducts` should return `{ success: boolean, data: Product[] }`.

                const response: any = res;
                if (response.success && Array.isArray(response.data)) {
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
                // Determine price to show (lowest variant or fallback)
                const price = product.price_gbp
                    ? product.price_gbp
                    : (product.variants && product.variants.length > 0 ? product.variants[0].price_gbp : 0);

                return (
                    <button
                        key={product.id}
                        onClick={() => onProductSelect(product)}
                        className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow hover:shadow-lg transition-all text-left flex flex-col h-full"
                    >
                        <div className="relative aspect-square w-full bg-gray-100">
                            {product.image_url ? (
                                <img
                                    src={product.image_url}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                />
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
