
import { json } from "../../services/util";
import { createCheckoutSession, handleStripeWebhook } from "../../services/checkout";

export async function handleCreateCheckout(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as { cartId: string; customerEmail: string };
        const { cartId, customerEmail } = body;

        if (!cartId || !customerEmail) {
            return json({ success: false, error: 'Missing required fields' }, 400, corsHdrs);
        }

        const session = await createCheckoutSession(cartId, customerEmail, env);
        return json({ success: true, ...session }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: err.message }, 400, corsHdrs);
    }
}

export { handleStripeWebhook };
