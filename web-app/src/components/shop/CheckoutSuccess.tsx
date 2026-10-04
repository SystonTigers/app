import { EmptyNote } from '@/components/ui/Page';

/** Shown when Stripe sends the buyer back to the shop after paying. */
export function CheckoutSuccess({ onContinue }: { onContinue: () => void }) {
    return (
        <EmptyNote icon="check" title="Thanks for your order" action={<button type="button" onClick={onContinue} className="btn btn-primary">Keep shopping</button>}>
            Your payment went through. We&apos;ll email you a receipt, and your order is on its way to being made.
        </EmptyNote>
    );
}
