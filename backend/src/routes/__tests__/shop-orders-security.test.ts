import { describe, it, expect, vi, beforeEach } from "vitest";

const retrieveSession = vi.fn();
vi.mock("stripe", () => ({
    default: vi.fn().mockImplementation(() => ({
        checkout: { sessions: { retrieve: retrieveSession } },
    })),
}));

const mockRequireTenantJWT = vi.fn();
vi.mock("../../services/auth", async () => {
    const actual = await vi.importActual<typeof import("../../services/auth")>("../../services/auth");
    return {
        requireJWT: vi.fn(),
        requireTenantJWT: (...args: unknown[]) => mockRequireTenantJWT(...args),
        hasAnyRole: actual.hasAnyRole,
    };
});

import { handleConfirmShopOrder, handleListShopOrders } from "../personalized-shop";

const cors = new Headers();

/** D1 mock that records SQL and returns canned answers. */
function makeDb(opts: { order?: Record<string, unknown> | null; updateChanges?: number; orders?: unknown[] } = {}) {
    const calls: Array<{ sql: string; args: unknown[] }> = [];
    const prepare = vi.fn((sql: string) => ({
        bind: (...args: unknown[]) => {
            calls.push({ sql, args });
            return {
                first: async () => (sql.includes("FROM shop_orders") ? opts.order ?? null : { name: "Club" }),
                run: async () => ({ meta: { changes: sql.includes("UPDATE shop_orders") ? opts.updateChanges ?? 1 : 1 } }),
                all: async () => ({ results: opts.orders ?? [] }),
            };
        },
    }));
    return { prepare, calls };
}

function confirmRequest(orderId: string, body: unknown) {
    return new Request(`https://api.test/api/v1/shop/orders/${orderId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("Shop order confirmation security", () => {
    beforeEach(() => {
        retrieveSession.mockReset();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    });

    it("rejects confirmation without a Stripe session", async () => {
        const db = makeDb();
        const res = await handleConfirmShopOrder(confirmRequest("order-1", {}), { DB: db }, cors);

        expect(res.status).toBe(400);
        expect(db.calls.find((c) => c.sql.includes("UPDATE shop_orders"))).toBeUndefined();
    });

    it("rejects a paid session that belongs to a different order", async () => {
        retrieveSession.mockResolvedValue({
            id: "cs_1", payment_status: "paid", payment_intent: "pi_1",
            metadata: { order_id: "order-OTHER", tenant_id: "t1" },
        });
        const db = makeDb();
        const res = await handleConfirmShopOrder(confirmRequest("order-1", { sessionId: "cs_1" }), { DB: db }, cors);

        expect(res.status).toBe(400);
        expect(db.calls.find((c) => c.sql.includes("UPDATE shop_orders"))).toBeUndefined();
    });

    it("rejects an unpaid session", async () => {
        retrieveSession.mockResolvedValue({
            id: "cs_1", payment_status: "unpaid", metadata: { order_id: "order-1", tenant_id: "t1" },
        });
        const res = await handleConfirmShopOrder(confirmRequest("order-1", { sessionId: "cs_1" }), { DB: makeDb() }, cors);
        expect(res.status).toBe(400);
    });

    it("confirms a matching paid session once and does not fulfil twice", async () => {
        retrieveSession.mockResolvedValue({
            id: "cs_1", payment_status: "paid", payment_intent: "pi_1",
            metadata: { order_id: "order-1", tenant_id: "t1" },
            customer_details: { address: { line1: "1 High St", city: "Syston", country: "GB", postal_code: "LE7 1AA" } },
        });
        const order = { id: "order-1", tenant_id: "t1", status: "pending", items_json: "[]", platform_fee_gbp: 0, customer_name: "A B" };

        const first = makeDb({ order, updateChanges: 1 });
        const res1 = await handleConfirmShopOrder(confirmRequest("order-1", { sessionId: "cs_1" }), { DB: first }, cors);
        expect(res1.status).toBe(200);
        expect(first.calls.some((c) => c.sql.includes("INSERT INTO platform_revenue"))).toBe(true);

        // Second confirm races in after the first flipped the status
        const second = makeDb({ order, updateChanges: 0 });
        const res2 = await handleConfirmShopOrder(confirmRequest("order-1", { sessionId: "cs_1" }), { DB: second }, cors);
        const body2 = await res2.json() as { message?: string };
        expect(body2.message).toBe("Already confirmed");
        expect(second.calls.some((c) => c.sql.includes("INSERT INTO platform_revenue"))).toBe(false);
    });
});

describe("Shop order listing security", () => {
    it("rejects non-admin members", async () => {
        mockRequireTenantJWT.mockResolvedValue({ tenantId: "t1", roles: ["tenant_member"] });
        const res = await handleListShopOrders(new Request("https://api.test/api/v1/shop/orders"), { DB: makeDb() }, cors);
        expect(res.status).toBe(403);
    });

    it("lists only the caller's tenant orders for admins", async () => {
        mockRequireTenantJWT.mockResolvedValue({ tenantId: "t1", roles: ["tenant_admin"] });
        const db = makeDb({ orders: [{ id: "o1", items_json: "[]", shipping_address_json: null }] });
        const res = await handleListShopOrders(
            new Request("https://api.test/api/v1/shop/orders", { headers: { "x-tenant": "someone-else" } }),
            { DB: db },
            cors,
        );

        expect(res.status).toBe(200);
        expect(db.calls[0].args).toEqual(["t1"]);
    });
});
