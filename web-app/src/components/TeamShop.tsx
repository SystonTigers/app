'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ProductList } from './shop/ProductList';
import { ProductDetail } from './shop/ProductDetail';
import { CartView } from './shop/CartView';
import { CheckoutSuccess } from './shop/CheckoutSuccess';

interface TeamShopProps {
    tenant: string;
}

type ViewState = 'list' | 'detail' | 'cart' | 'success';

export function TeamShop({ tenant }: TeamShopProps) {
    const [view, setView] = useState<ViewState>('list');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (searchParams.get('session_id')) {
            setView('success');
        }
    }, [searchParams]);

    const handleProductSelect = (product: any) => {
        setSelectedProduct(product);
        setView('detail');
    };

    const handleBackToShop = () => {
        setSelectedProduct(null);
        setView('list');
    };

    const handleAddToCart = () => {
        setIsCartOpen(true);
        // Optionally stay on detail or go back? Let's stay on detail but open cart drawer.
    };

    const handleContinueShopping = () => {
        // Clear session_id from URL without reload
        router.replace(pathname);
        setView('list');
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6 shadow-md sticky top-0 z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Team Shop</h2>
                        <p className="text-sm opacity-90">Official Merchandise</p>
                    </div>
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <span>🛒</span>
                        <span className="font-bold">Cart</span>
                    </button>
                </div>
            </div>

            <div className="container mx-auto p-4 md:p-8 flex-1">
                {view === 'success' ? (
                    <CheckoutSuccess onContinue={handleContinueShopping} />
                ) : view === 'detail' && selectedProduct ? (
                    <ProductDetail
                        tenantId={tenant}
                        product={selectedProduct}
                        onBack={handleBackToShop}
                        onAddToCart={handleAddToCart}
                    />
                ) : (
                    <ProductList
                        tenantId={tenant}
                        onProductSelect={handleProductSelect}
                    />
                )}
            </div>

            {/* Cart Overlay/Drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <CartView
                        tenantId={tenant}
                        onClose={() => setIsCartOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}
