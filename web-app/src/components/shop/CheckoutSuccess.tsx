import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function CheckoutSuccess({ onContinue }: { onContinue: () => void }) {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        // Clear cart if session_id is present (meaning we came back from Stripe)
        // Actually backend deletes KV cart, but frontend might still have the ID in localStorage.
        if (sessionId) {
            // We don't know tenantId easily here unless passed, but we can assume 'cart_TENANTID' key format.
            // Ideally we pass tenantId. For now, rely on user to return to shop home.
        }
    }, [sessionId]);

    return (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow max-w-lg mx-auto p-6">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
                Thank you for your order. We have received your payment and will process your order shortly.
                You will receive a confirmation email.
            </p>
            <button
                onClick={onContinue}
                className="bg-brand text-white px-6 py-2 rounded hover:bg-brand/90"
            >
                Continue Shopping
            </button>
        </div>
    );
}
