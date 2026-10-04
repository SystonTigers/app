import { useCallback, useEffect, useState } from 'react';
import { createClientSDK } from '@/lib/sdk';
import { formatMoney } from '@/lib/format';
import { EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ProductPreview } from './ProductPreview';
import type { Product } from './types';

interface ProductListProps {
    tenantId: string;
    onProductSelect: (product: Product) => void;
}

/** The shop's answer is { data: [...] } or { data: { products: { personalized: [...] } } }. */
function readProducts(body: unknown): Product[] {
    if (!body || typeof body !== 'object') return [];
    const data = (body as { data?: unknown }).data;
    if (Array.isArray(data)) return data as Product[];
    const personalised = (data as { products?: { personalized?: unknown } } | undefined)?.products?.personalized;
    return Array.isArray(personalised) ? (personalised as Product[]) : [];
}

export function ProductList({ tenantId, onProductSelect }: ProductListProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const body: unknown = await createClientSDK(tenantId).getShopProducts();
            setProducts(readProducts(body));
        } catch (e) {
            console.error('Failed to load products', e);
            setError("We couldn't load the shop. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading the shop">
                {[1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] card animate-pulse" />)}
            </div>
        );
    }

    if (error) {
        return (
            <EmptyNote icon="alert" title="The shop didn't load" action={<button type="button" onClick={load} className="btn btn-primary">Try again</button>}>
                <p role="alert">{error}</p>
            </EmptyNote>
        );
    }

    if (products.length === 0) {
        return (
            <EmptyNote icon="shirt" title="Nothing in the shop yet">
                Club kit and gear will show here once the club adds it.
            </EmptyNote>
        );
    }

    return (
        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {products.map((product) => {
                const price = product.price_gbp ?? product.variants?.[0]?.price_gbp ?? 0;
                return (
                    <li key={product.id}>
                        <button
                            type="button"
                            onClick={() => onProductSelect(product)}
                            className="card p-0 w-full h-full overflow-hidden text-left flex flex-col hover:border-brand/60 transition-colors"
                        >
                            <span className="block aspect-square w-full bg-surface-raised overflow-hidden">
                                {product.image_url ? (
                                    <ProductPreview imageUrl={product.image_url} productTitle={product.title} personalization={product.personalization} />
                                ) : (
                                    <span className="w-full h-full flex items-center justify-center text-muted"><Icon name="shirt" className="w-12 h-12" /></span>
                                )}
                            </span>
                            <span className="p-4 flex flex-col flex-1">
                                <span className="font-display text-lg font-bold uppercase leading-tight mb-2 line-clamp-2">{product.title}</span>
                                <span className="text-brand font-display text-2xl font-extrabold mt-auto">{formatMoney(price)}</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
