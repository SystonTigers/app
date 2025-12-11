import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    togglePromoCode,
    listTenantPromos,
    applyTenantPromo,
    removeTenantPromo,
} from "../admin";
import { issuePlatformAdminJWT } from "../../services/jwt";

describe("Admin Promo Routes", () => {
    let mockEnv: any;
    let mockDB: any;
    let corsHdrs: Headers;
    const requestId = "test-request-id";

    beforeEach(() => {
        mockDB = {
            prepare: vi.fn((query: string) => {
                return {
                    bind: vi.fn((...params: any[]) => {
                        return {
                            all: vi.fn(async () => ({ results: [] })),
                            first: vi.fn(async () => null),
                            run: vi.fn(async () => ({ success: true, meta: { changes: 1 } })),
                        };
                    }),
                    first: vi.fn(async () => null),
                    run: vi.fn(async () => ({ success: true, meta: { changes: 1 } })),
                };
            }),
        };

        mockEnv = {
            DB: mockDB,
            JWT_SECRET: "test-secret-key-for-admin-promo-routes-testing",
            JWT_ISSUER: "test-issuer",
            JWT_AUDIENCE: "syston-mobile",
        };

        corsHdrs = new Headers();
    });

    async function createAdminRequest(
        method: string,
        path: string,
        body?: any
    ): Promise<Request> {
        const token = await issuePlatformAdminJWT(mockEnv, {
            tenant_id: "test-tenant",
            ttlMinutes: 60,
        });

        const url = new URL(path, "https://example.com");

        return new Request(url.toString(), {
            method,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    describe("togglePromoCode", () => {
        it("toggles promo code from initial state active (1) to inactive (0)", async () => {
            mockDB.prepare.mockImplementation((query: string) => {
                const mockChain: any = {
                    bind: vi.fn(() => mockChain),
                    first: vi.fn(async () => ({ id: "promo-1", active: 1 })),
                    run: vi.fn(async () => ({ success: true })),
                };
                return mockChain;
            });

            const req = await createAdminRequest("POST", "/api/v1/admin/promo-codes/SAVE20/toggle");
            const res = await togglePromoCode(req, mockEnv, requestId, corsHdrs, "SAVE20");

            expect(res.status).toBe(200);
            const data: any = await res.json();
            expect(data.success).toBe(true);
            expect(data.active).toBe(false);
            expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE promo_codes SET active = ?"));
        });

        it("toggles promo code from initial state inactive (0) to active (1)", async () => {
            mockDB.prepare.mockImplementation((query: string) => {
                const mockChain: any = {
                    bind: vi.fn(() => mockChain),
                    first: vi.fn(async () => ({ id: "promo-1", active: 0 })),
                    run: vi.fn(async () => ({ success: true })),
                };
                return mockChain;
            });

            const req = await createAdminRequest("POST", "/api/v1/admin/promo-codes/SAVE20/toggle");
            const res = await togglePromoCode(req, mockEnv, requestId, corsHdrs, "SAVE20");

            expect(res.status).toBe(200);
            const data: any = await res.json();
            expect(data.success).toBe(true);
            expect(data.active).toBe(true);
        });

        it("returns 404 for non-existent promo code", async () => {
            mockDB.prepare.mockImplementation(() => ({
                bind: () => ({
                    first: async () => null,
                }),
            }));

            const req = await createAdminRequest("POST", "/api/v1/admin/promo-codes/NONEXISTENT/toggle");
            const res = await togglePromoCode(req, mockEnv, requestId, corsHdrs, "NONEXISTENT");

            expect(res.status).toBe(404);
        });
    });

    describe("listTenantPromos", () => {
        it("lists applied promos for a tenant", async () => {
            mockDB.prepare.mockImplementation(() => ({
                bind: () => ({
                    all: async () => ({
                        results: [
                            { id: "redemption-1", code: "SAVE20", discount_percent: 20 },
                            { id: "redemption-2", code: "WELCOME", discount_percent: 10 },
                        ],
                    }),
                })
            }));

            const req = await createAdminRequest("GET", "/api/v1/admin/tenants/tenant-1/promos");
            const res = await listTenantPromos(req, mockEnv, requestId, corsHdrs, "tenant-1");

            expect(res.status).toBe(200);
            const data: any = await res.json();
            expect(data.success).toBe(true);
            expect(data.promos).toHaveLength(2);
            expect(data.promos[0].code).toBe("SAVE20");
        });
    });

    describe("applyTenantPromo", () => {
        it("applies a promo code to a tenant", async () => {
            mockDB.prepare.mockImplementation((query: string) => {
                const mockChain: any = {
                    bind: vi.fn(() => mockChain),
                    first: vi.fn(async () => {
                        if (query.includes("SELECT id, code, active FROM promo_codes")) return { id: "promo-1", code: "SAVE20", active: 1 };
                        if (query.includes("FROM promo_redemptions")) return null; // Not already applied
                        return null;
                    }),
                    run: vi.fn(async () => ({ success: true })),
                };
                return mockChain;
            });

            const req = await createAdminRequest("POST", "/api/v1/admin/tenants/tenant-1/promos", { code: "SAVE20" });
            const res = await applyTenantPromo(req, mockEnv, requestId, corsHdrs, "tenant-1");

            expect(res.status).toBe(200);
            const data: any = await res.json();
            expect(data.success).toBe(true);
            expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO promo_redemptions"));
            expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE promo_codes SET used_count"));
        });

        it("prevents applying duplicate promo codes", async () => {
            mockDB.prepare.mockImplementation((query: string) => {
                const mockChain: any = {
                    bind: vi.fn(() => mockChain),
                    first: vi.fn(async () => {
                        if (query.includes("SELECT id, code, active FROM promo_codes")) return { id: "promo-1", code: "SAVE20", active: 1 };
                        if (query.includes("FROM promo_redemptions")) return { id: "existing-redemption" }; // Already applied
                        return null;
                    }),
                    run: vi.fn(async () => ({ success: true })),
                };
                return mockChain;
            });

            const req = await createAdminRequest("POST", "/api/v1/admin/tenants/tenant-1/promos", { code: "SAVE20" });
            const res = await applyTenantPromo(req, mockEnv, requestId, corsHdrs, "tenant-1");

            expect(res.status).toBe(400);
            const data: any = await res.json();
            expect(data.error.code).toBe("ALREADY_APPLIED");
        });

        it("returns 404 if promo code not found", async () => {
            mockDB.prepare.mockImplementation(() => ({
                bind: () => ({
                    first: async () => null,
                }),
            }));

            const req = await createAdminRequest("POST", "/api/v1/admin/tenants/tenant-1/promos", { code: "NONEXISTENT" });
            const res = await applyTenantPromo(req, mockEnv, requestId, corsHdrs, "tenant-1");

            expect(res.status).toBe(404);
        });
    });

    describe("removeTenantPromo", () => {
        it("removes a promo code from a tenant", async () => {
            mockDB.prepare.mockImplementation((query: string) => {
                const mockChain: any = {
                    bind: vi.fn(() => mockChain),
                    first: vi.fn(async () => ({ id: "promo-1" })),
                    run: vi.fn(async () => ({ success: true, meta: { changes: 1 } })),
                };
                return mockChain;
            });

            const req = await createAdminRequest("DELETE", "/api/v1/admin/tenants/tenant-1/promos/SAVE20");
            const res = await removeTenantPromo(req, mockEnv, requestId, corsHdrs, "tenant-1", "SAVE20");

            expect(res.status).toBe(200);
            const data: any = await res.json();
            expect(data.success).toBe(true);
            expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM promo_redemptions"));
        });

        it("returns 404 if promo code not found", async () => {
            mockDB.prepare.mockImplementation(() => ({
                bind: () => ({
                    first: async () => null,
                }),
            }));

            const req = await createAdminRequest("DELETE", "/api/v1/admin/tenants/tenant-1/promos/NONEXISTENT");
            const res = await removeTenantPromo(req, mockEnv, requestId, corsHdrs, "tenant-1", "NONEXISTENT");

            expect(res.status).toBe(404);
        });
    });
});
