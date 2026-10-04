import { useState } from 'react';
import { createClientSDK } from '@/lib/sdk';
import { formatMoney } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { ProductPreview } from './ProductPreview';
import { readCartId, writeCartId, type Product } from './types';

interface ProductDetailProps {
    tenantId: string;
    product: Product;
    onBack: () => void;
    /** Opens the cart once the item is in it */
    onAddToCart: () => void;
}

export function ProductDetail({ tenantId, product, onBack, onAddToCart }: ProductDetailProps) {
    const variants = product.variants ?? [];
    const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id ?? '');
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState('');
    const [personalization, setPersonalization] = useState({ playerName: '', playerNumber: '' });

    const selectedVariant = variants.find((v) => v.id === selectedVariantId);
    const price = selectedVariant?.price_gbp ?? product.price_gbp ?? 0;
    const preview = product.personalization && (personalization.playerName || personalization.playerNumber)
        ? { ...product.personalization, ...personalization }
        : product.personalization;

    async function addToCart() {
        if (!selectedVariantId) return;
        setIsAdding(true);
        setError('');
        const sdk = createClientSDK(tenantId);
        try {
            let cartId = readCartId(tenantId);
            if (!cartId) {
                const res = await sdk.createCart();
                cartId = res.success ? (res.cart as { id?: string } | null)?.id ?? null : null;
                if (!cartId) throw new Error('No cart id');
                writeCartId(tenantId, cartId);
            }
            await sdk.addToCart(cartId, selectedVariantId, 1, personalization);
            onAddToCart();
        } catch (e) {
            console.error('Add to cart failed', e);
            // A cart that has expired is forgotten, so the next try starts a new one
            writeCartId(tenantId, null);
            setError("That didn't go in your basket. Please try again.");
        } finally {
            setIsAdding(false);
        }
    }

    return (
        <div>
            <button type="button" onClick={onBack} className="btn btn-ghost btn-sm min-h-[40px] -ml-4 mb-4">
                <Icon name="arrowLeft" className="w-4 h-4" /> All products
            </button>

            <div className="grid md:grid-cols-2 gap-6 md:gap-10">
                <div className="card p-0 overflow-hidden aspect-square bg-surface-raised">
                    {product.image_url ? (
                        <ProductPreview imageUrl={product.image_url} productTitle={product.title} personalization={preview} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted"><Icon name="shirt" className="w-16 h-16" /></div>
                    )}
                </div>

                <div>
                    <h1 className="page-title text-4xl mb-2 break-words">{product.title}</h1>
                    <p className="font-display text-3xl font-extrabold text-brand mb-4">{formatMoney(price)}</p>
                    {product.description && <p className="text-muted mb-6 whitespace-pre-line">{product.description}</p>}

                    {variants.length > 1 && (
                        <fieldset className="mb-6">
                            <legend className="label">Size or option</legend>
                            <div className="flex flex-wrap gap-2">
                                {variants.map((v) => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        aria-pressed={selectedVariantId === v.id}
                                        onClick={() => setSelectedVariantId(v.id)}
                                        className={`btn btn-sm min-h-[40px] ${selectedVariantId === v.id ? 'btn-primary' : 'btn-secondary'}`}
                                    >
                                        {v.title}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    <div className="mb-6 grid grid-cols-[1fr_6rem] gap-3">
                        <div>
                            <label htmlFor="print-name" className="label">Name on the back (optional)</label>
                            <input
                                id="print-name"
                                value={personalization.playerName}
                                onChange={(e) => setPersonalization({ ...personalization, playerName: e.target.value.toUpperCase() })}
                                className="field uppercase"
                                placeholder="SMITH"
                                maxLength={12}
                            />
                        </div>
                        <div>
                            <label htmlFor="print-number" className="label">Number</label>
                            <input
                                id="print-number"
                                inputMode="numeric"
                                value={personalization.playerNumber}
                                onChange={(e) => setPersonalization({ ...personalization, playerNumber: e.target.value.replace(/\D/g, '') })}
                                className="field"
                                placeholder="10"
                                maxLength={3}
                            />
                        </div>
                    </div>

                    {error && <p role="alert" className="text-sm text-red-400 mb-3">{error}</p>}
                    <button type="button" onClick={addToCart} disabled={isAdding || !selectedVariantId} className="btn btn-primary w-full">
                        <Icon name="bag" className="w-5 h-5" /> {isAdding ? 'Adding…' : 'Add to basket'}
                    </button>
                </div>
            </div>
        </div>
    );
}
