'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ProductList } from './shop/ProductList';
import { ProductDetail } from './shop/ProductDetail';
import { CartView } from './shop/CartView';
import { CheckoutSuccess } from './shop/CheckoutSuccess';
import { writeCartId, type Product } from './shop/types';

interface TeamShopProps {
    tenant: string;
}

type ViewState = 'list' | 'detail' | 'success';

/** The club shop: products, a product with name/number printing, the basket and Stripe checkout. */
export function TeamShop({ tenant }: TeamShopProps) {
    const [view, setView] = useState<ViewState>('list');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Back from Stripe after paying: the basket has been bought
    useEffect(() => {
        if (searchParams.get('session_id')) {
            writeCartId(tenant, null);
            setView('success');
        }
    }, [searchParams, tenant]);

    const closeCart = useCallback(() => setIsCartOpen(false), []);

    return (
        <div>
            <PageHeader
                eyebrow="Club"
                title="Shop"
                subtitle="Club kit and gear, printed with your name and number."
                actions={
                    <button type="button" onClick={() => setIsCartOpen(true)} className="btn btn-secondary">
                        <Icon name="bag" className="w-5 h-5" /> Basket
                    </button>
                }
            />

            {view === 'success' ? (
                <CheckoutSuccess onContinue={() => { router.replace(pathname); setView('list'); }} />
            ) : view === 'detail' && selectedProduct ? (
                <ProductDetail
                    tenantId={tenant}
                    product={selectedProduct}
                    onBack={() => { setSelectedProduct(null); setView('list'); }}
                    onAddToCart={() => setIsCartOpen(true)}
                />
            ) : (
                <ProductList tenantId={tenant} onProductSelect={(p) => { setSelectedProduct(p); setView('detail'); }} />
            )}

            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <CartView tenantId={tenant} onClose={closeCart} />
                </div>
            )}
        </div>
    );
}
