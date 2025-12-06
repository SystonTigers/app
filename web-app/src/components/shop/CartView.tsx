import { useState, useEffect } from 'react';
import { createClientSDK } from '@/lib/sdk';

interface CartViewProps {
    tenantId: string;
    onClose: () => void;
}

export function CartView({ tenantId, onClose }: CartViewProps) {
    const [cart, setCart] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    // Load cart on mount
    useEffect(() => {
        loadCart();
    }, [tenantId]);

    const loadCart = async () => {
        try {
            const cartId = localStorage.getItem(`cart_${tenantId}`);
            if (!cartId) {
                setCart(null);
                setLoading(false);
                return;
            }
            const sdk = createClientSDK(tenantId);
            const res = await sdk.getCart(cartId);
            if (res.success) {
                setCart(res.cart);
            } else {
                localStorage.removeItem(`cart_${tenantId}`); // Invalid cart
                setCart(null);
            }
        } catch (e) {
            console.error('Load cart failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (variantId: string) => {
        const cartId = localStorage.getItem(`cart_${tenantId}`);
        if (!cartId) return;

        try {
            const sdk = createClientSDK(tenantId);
            const res = await sdk.removeFromCart(cartId, variantId);
            if (res.success) {
                setCart(res.cart);
            }
        } catch (e) {
            console.error('Remove failed', e);
        }
    };

    const handleCheckout = async () => {
        const cartId = localStorage.getItem(`cart_${tenantId}`);
        if (!cartId) return;

        setCheckoutLoading(true);
        try {
            const sdk = createClientSDK(tenantId);
            // Using a dummy email for now or ask user. 
            // In a real flow we might ask for email in UI or get from auth.
            // Let's prompt or use a placeholder if unauthenticated.
            // Assuming user might be logged in, but SDK doesn't expose user email directly here easily without auth context.
            // Let's use a browser prompt for simplicity or standard test email.
            const email = prompt("Please enter your email for receipt:") || "guest@example.com";

            const res = await sdk.createCheckoutSession(cartId, email);
            if (res.success && res.url) {
                window.location.href = res.url;
            } else {
                alert('Checkout failed initialization');
            }
        } catch (e) {
            console.error('Checkout failed', e);
            alert('Checkout error');
        } finally {
            setCheckoutLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading cart...</div>;

    const items = cart?.items || [];
    const isEmpty = items.length === 0;

    // Calculate total
    const total = items.reduce((sum: number, item: any) => sum + (item.priceGbp * item.quantity), 0);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto shadow-lg">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold">Your Cart</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕ Close</button>
            </div>

            {isEmpty ? (
                <div className="text-center py-12 text-gray-500">
                    <p className="mb-4">Your cart is empty.</p>
                    <button onClick={onClose} className="text-brand hover:underline">Continue Shopping</button>
                </div>
            ) : (
                <>
                    <div className="space-y-4 mb-6">
                        {items.map((item: any) => (
                            <div key={item.variantId} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-4 rounded">
                                <div>
                                    <h4 className="font-bold">{item.title}</h4>
                                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">£{((item.priceGbp * item.quantity) / 100).toFixed(2)}</p>
                                    <button
                                        onClick={() => handleRemove(item.variantId)}
                                        className="text-red-500 text-xs hover:underline mt-1"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between text-xl font-bold mb-6">
                            <span>Total</span>
                            <span>£{(total / 100).toFixed(2)}</span>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={checkoutLoading}
                            className="w-full py-3 bg-brand text-white font-bold rounded hover:bg-brand/90 disabled:opacity-50"
                        >
                            {checkoutLoading ? 'Redirecting...' : 'Proceed to Checkout'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
