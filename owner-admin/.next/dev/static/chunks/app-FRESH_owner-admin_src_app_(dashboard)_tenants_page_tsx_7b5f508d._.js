(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TenantsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/owner-admin/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/owner-admin/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/owner-admin/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const API_BASE = 'http://localhost:8787'; // Forced local for debugging
const PROTECTED_SLUGS = [
    'syston-town-tigers',
    'syston',
    'syston-tigers'
];
function TenantsPage() {
    _s();
    const [tenants, setTenants] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [actionLoading, setActionLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TenantsPage.useEffect": ()=>{
            fetchTenants();
        }
    }["TenantsPage.useEffect"], [
        filter.status,
        filter.plan
    ]);
    const fetchTenants = async ()=>{
        try {
            const params = new URLSearchParams();
            if (filter.status) params.set('status', filter.status);
            if (filter.plan) params.set('plan', filter.plan);
            params.set('limit', '100');
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    // Don't set error, just redirect silently
                    setLoading(false);
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Failed to fetch tenants');
            }
            const data = await response.json();
            if (data.success) {
                setTenants(data.tenants || []);
            }
            setLoading(false);
        } catch (err) {
            // Ignore NEXT_REDIRECT errors
            if (err.message?.includes('NEXT_REDIRECT')) {
                return;
            }
            setError(err.message || 'Failed to load tenants');
            setLoading(false);
        }
    };
    const handleDeactivate = async (tenant)=>{
        if (PROTECTED_SLUGS.includes(tenant.slug)) {
            alert('Cannot deactivate protected tenant');
            return;
        }
        if (!confirm(`Deactivate "${tenant.name}"? They will lose access.`)) return;
        setActionLoading(tenant.id);
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenant.id}/deactivate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                setTenants((prev)=>prev.map((t)=>t.id === tenant.id ? {
                            ...t,
                            status: 'deactivated'
                        } : t));
            }
        } catch (err) {
            alert('Failed to deactivate tenant');
        } finally{
            setActionLoading(null);
        }
    };
    const handleDelete = async (tenant)=>{
        if (PROTECTED_SLUGS.includes(tenant.slug)) {
            alert('Cannot delete protected tenant');
            return;
        }
        if (!confirm(`DELETE "${tenant.name}"? This is PERMANENT.`)) return;
        if (prompt('Type "DELETE" to confirm:') !== 'DELETE') return;
        setActionLoading(tenant.id);
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenant.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                setTenants((prev)=>prev.filter((t)=>t.id !== tenant.id));
            }
        } catch (err) {
            alert('Failed to delete tenant');
        } finally{
            setActionLoading(null);
        }
    };
    const formatDate = (timestamp)=>{
        return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };
    const filteredTenants = tenants.filter((t)=>{
        if (filter.search) {
            const search = filter.search.toLowerCase();
            return t.name.toLowerCase().includes(search) || t.slug.toLowerCase().includes(search) || t.email.toLowerCase().includes(search);
        }
        return true;
    });
    const statusBadge = (status)=>{
        const styles = {
            active: 'badge-success',
            trial: 'badge-info',
            suspended: 'badge-warning',
            cancelled: 'badge-neutral',
            deactivated: 'badge-danger'
        };
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: styles[status] || 'badge-neutral',
            children: status
        }, void 0, false, {
            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
            lineNumber: 158,
            columnNumber: 13
        }, this);
    };
    const planBadge = (plan)=>{
        return plan === 'pro' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "badge bg-gradient-to-r from-primary-500/30 to-accent/30 text-primary-300 border border-primary-500/30",
            children: "PRO"
        }, void 0, false, {
            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
            lineNumber: 166,
            columnNumber: 13
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "badge-neutral",
            children: "Starter"
        }, void 0, false, {
            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
            lineNumber: 170,
            columnNumber: 13
        }, this);
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-96",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 177,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
            lineNumber: 176,
            columnNumber: 13
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6 animate-in",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-2xl font-bold text-white",
                            children: "Tenants"
                        }, void 0, false, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 187,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-500 mt-1",
                            children: [
                                tenants.length,
                                " total tenants"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 188,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                    lineNumber: 186,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 185,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glass-card p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 min-w-[200px]",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Search by name, slug, or email...",
                                value: filter.search || '',
                                onChange: (e)=>setFilter({
                                        ...filter,
                                        search: e.target.value
                                    }),
                                className: "input"
                            }, void 0, false, {
                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                lineNumber: 196,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 195,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            value: filter.status || '',
                            onChange: (e)=>setFilter({
                                    ...filter,
                                    status: e.target.value || undefined
                                }),
                            className: "input w-auto",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "",
                                    children: "All Status"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 209,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "trial",
                                    children: "Trial"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 210,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "active",
                                    children: "Active"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 211,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "suspended",
                                    children: "Suspended"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 212,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "cancelled",
                                    children: "Cancelled"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 213,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "deactivated",
                                    children: "Deactivated"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 214,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 204,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            value: filter.plan || '',
                            onChange: (e)=>setFilter({
                                    ...filter,
                                    plan: e.target.value || undefined
                                }),
                            className: "input w-auto",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "",
                                    children: "All Plans"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 221,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "starter",
                                    children: "Starter"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 222,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "pro",
                                    children: "Pro"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 223,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 216,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                    lineNumber: 194,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 193,
                columnNumber: 13
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glass-card p-4 border-red-500/30 bg-red-500/10 text-red-400",
                children: error
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 229,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glass-card overflow-hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "w-full",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: "border-b border-white/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Tenant"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 240,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Contact"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 243,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Plan"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 246,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Status"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 249,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Created"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 252,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Actions"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 255,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                        lineNumber: 239,
                                        columnNumber: 29
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 238,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    children: filteredTenants.map((tenant, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].tr, {
                                            initial: {
                                                opacity: 0,
                                                y: 10
                                            },
                                            animate: {
                                                opacity: 1,
                                                y: 0
                                            },
                                            transition: {
                                                delay: i * 0.02
                                            },
                                            className: "table-row",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "font-medium text-white flex items-center gap-2",
                                                                children: [
                                                                    tenant.name,
                                                                    PROTECTED_SLUGS.includes(tenant.slug) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded",
                                                                        children: "Protected"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                        lineNumber: 274,
                                                                        columnNumber: 53
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 271,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-sm text-gray-500 font-mono",
                                                                children: tenant.slug
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 279,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                        lineNumber: 270,
                                                        columnNumber: 41
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 269,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-sm text-gray-400",
                                                    children: tenant.email
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 282,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: planBadge(tenant.plan)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 283,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: statusBadge(tenant.status)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 284,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-sm text-gray-500",
                                                    children: formatDate(tenant.created_at)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 285,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-right",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-end gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                href: `/tenants/${tenant.id}`,
                                                                className: "px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors",
                                                                children: "View"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 288,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleDeactivate(tenant),
                                                                disabled: PROTECTED_SLUGS.includes(tenant.slug) || actionLoading === tenant.id || tenant.status === 'deactivated',
                                                                className: "px-3 py-1.5 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                                                children: "Deactivate"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 294,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleDelete(tenant),
                                                                disabled: PROTECTED_SLUGS.includes(tenant.slug) || actionLoading === tenant.id,
                                                                className: "px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                                                children: actionLoading === tenant.id ? '...' : 'Delete'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 301,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                        lineNumber: 287,
                                                        columnNumber: 41
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 286,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, tenant.id, true, {
                                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                            lineNumber: 262,
                                            columnNumber: 33
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 260,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 237,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                        lineNumber: 236,
                        columnNumber: 17
                    }, this),
                    filteredTenants.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center py-12 text-gray-500",
                        children: "No tenants found"
                    }, void 0, false, {
                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                        lineNumber: 317,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 235,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
        lineNumber: 183,
        columnNumber: 9
    }, this);
}
_s(TenantsPage, "tMvgsn3GsCsVwUmKZMAUZOKA9j0=");
_c = TenantsPage;
var _c;
__turbopack_context__.k.register(_c, "TenantsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=app-FRESH_owner-admin_src_app_%28dashboard%29_tenants_page_tsx_7b5f508d._.js.map