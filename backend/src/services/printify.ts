
import { Env } from "../env";

const PRINTIFY_BASE_URL = "https://api.printify.com/v1";

export interface PrintifyProduct {
    id: string;
    title: string;
    description: string;
    images: { src: string; is_default: boolean }[];
    variants: PrintifyVariant[];
}

export interface PrintifyVariant {
    id: number;
    title: string;
    price: number;
    is_enabled: boolean;
}

export interface PrintifyOrderPayload {
    external_id: string;
    line_items: {
        product_id: string;
        variant_id: number;
        quantity: number;
    }[];
    shipping_method: number; // 1 = standard
    send_shipping_notification: boolean;
    address_to: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        country: string;
        region: string;
        address1: string;
        city: string;
        zip: string;
    };
}

export class PrintifyService {
    private token: string;
    private shopId: string;

    constructor(env: Env) {
        if (!env.PRINTIFY_API_TOKEN || !env.PRINTIFY_SHOP_ID) {
            throw new Error("Printify configuration missing");
        }
        this.token = env.PRINTIFY_API_TOKEN;
        this.shopId = env.PRINTIFY_SHOP_ID;
    }

    private async fetch(endpoint: string, options: RequestInit = {}) {
        const url = `${PRINTIFY_BASE_URL}${endpoint}`;
        const headers = {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Printify API Error ${response.status}: ${errorText}`);
        }

        return response.json();
    }

    async getProducts(): Promise<PrintifyProduct[]> {
        const data: any = await this.fetch(`/shops/${this.shopId}/products.json`);
        return data.data; // Printify returns paginated list in 'data'
    }

    async getProduct(productId: string): Promise<PrintifyProduct> {
        return await this.fetch(`/shops/${this.shopId}/products/${productId}.json`) as PrintifyProduct;
    }

    async createOrder(payload: PrintifyOrderPayload): Promise<any> {
        return await this.fetch(`/shops/${this.shopId}/orders.json`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async calculateShipping(payload: any): Promise<any> {
        // https://developers.printify.com/#calculate-shipping-costs
        return await this.fetch(`/shops/${this.shopId}/orders/shipping.json`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
}
