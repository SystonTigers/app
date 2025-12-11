module.exports = [
"[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TenantsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/owner-admin/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/owner-admin/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/owner-admin/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
'use client';
;
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
    const [tenants, setTenants] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [actionLoading, setActionLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // Promo Modal State
    const [selectedTenant, setSelectedTenant] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [tenantPromos, setTenantPromos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [promoLoading, setPromoLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [newPromoCode, setNewPromoCode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [addPromoError, setAddPromoError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        fetchTenants();
    }, [
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
            if (err.message?.includes('NEXT_REDIRECT')) return;
            setError(err.message || 'Failed to load tenants');
            setLoading(false);
        }
    };
    const fetchTenantPromos = async (tenantId)=>{
        setPromoLoading(true);
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenantId}/promos`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setTenantPromos(data.promos || []);
            }
        } catch (err) {
            console.error(err);
        } finally{
            setPromoLoading(false);
        }
    };
    const handleOpenPromos = (tenant)=>{
        setSelectedTenant(tenant);
        setTenantPromos([]);
        setNewPromoCode('');
        setAddPromoError('');
        fetchTenantPromos(tenant.id);
    };
    const handleAddPromo = async (e)=>{
        e.preventDefault();
        if (!selectedTenant || !newPromoCode.trim()) return;
        setAddPromoError('');
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${selectedTenant.id}/promos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: newPromoCode.trim().toUpperCase()
                })
            });
            const data = await response.json();
            if (data.success) {
                setNewPromoCode('');
                fetchTenantPromos(selectedTenant.id);
            } else {
                setAddPromoError(data.error?.message || 'Failed to add promo');
            }
        } catch (err) {
            setAddPromoError('Failed to add promo');
        }
    };
    const handleRemovePromo = async (code)=>{
        if (!selectedTenant || !confirm(`Remove promo "${code}" from this tenant?`)) return;
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${selectedTenant.id}/promos/${code}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                fetchTenantPromos(selectedTenant.id);
            }
        } catch (err) {
            alert('Failed to remove promo');
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
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: styles[status] || 'badge-neutral',
            children: status
        }, void 0, false, {
            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
            lineNumber: 234,
            columnNumber: 13
        }, this);
    };
    const planBadge = (plan)=>{
        return plan === 'pro' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "badge bg-gradient-to-r from-primary-500/30 to-accent/30 text-primary-300 border border-primary-500/30",
            children: "PRO"
        }, void 0, false, {
            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
            lineNumber: 242,
            columnNumber: 13
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "badge-neutral",
            children: "Starter"
        }, void 0, false, {
            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
            lineNumber: 246,
            columnNumber: 13
        }, this);
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-96",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 253,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
            lineNumber: 252,
            columnNumber: 13
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6 animate-in",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-2xl font-bold text-white",
                            children: "Tenants"
                        }, void 0, false, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 263,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-500 mt-1",
                            children: [
                                tenants.length,
                                " total tenants"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 264,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                    lineNumber: 262,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 261,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glass-card p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 min-w-[200px]",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
                                lineNumber: 272,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 271,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            value: filter.status || '',
                            onChange: (e)=>setFilter({
                                    ...filter,
                                    status: e.target.value || undefined
                                }),
                            className: "input w-auto",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "",
                                    children: "All Status"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 285,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "trial",
                                    children: "Trial"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 286,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "active",
                                    children: "Active"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 287,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "suspended",
                                    children: "Suspended"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 288,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "cancelled",
                                    children: "Cancelled"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 289,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "deactivated",
                                    children: "Deactivated"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 290,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 280,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            value: filter.plan || '',
                            onChange: (e)=>setFilter({
                                    ...filter,
                                    plan: e.target.value || undefined
                                }),
                            className: "input w-auto",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "",
                                    children: "All Plans"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 297,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "starter",
                                    children: "Starter"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 298,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "pro",
                                    children: "Pro"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 299,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 292,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                    lineNumber: 270,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 269,
                columnNumber: 13
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glass-card p-4 border-red-500/30 bg-red-500/10 text-red-400",
                children: error
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 305,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glass-card overflow-hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "w-full",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: "border-b border-white/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Tenant"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 316,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Manager"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 319,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Plan"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 322,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Status"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 325,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Created"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 328,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                children: "Actions"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                lineNumber: 331,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                        lineNumber: 315,
                                        columnNumber: 29
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 314,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    children: filteredTenants.map((tenant, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].tr, {
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
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "font-medium text-white flex items-center gap-2",
                                                                children: [
                                                                    tenant.name,
                                                                    PROTECTED_SLUGS.includes(tenant.slug) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded",
                                                                        children: "Protected"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                        lineNumber: 350,
                                                                        columnNumber: 53
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 347,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-sm text-gray-500 font-mono",
                                                                children: tenant.slug
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 355,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                        lineNumber: 346,
                                                        columnNumber: 41
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 345,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-sm text-white",
                                                            children: tenant.manager_name || '—'
                                                        }, void 0, false, {
                                                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                            lineNumber: 359,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-xs text-gray-500",
                                                            children: tenant.email
                                                        }, void 0, false, {
                                                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                            lineNumber: 360,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 358,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: planBadge(tenant.plan)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 362,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: statusBadge(tenant.status)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 363,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-sm text-gray-500",
                                                    children: formatDate(tenant.created_at)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 364,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-right",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-end gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleOpenPromos(tenant),
                                                                className: "px-3 py-1.5 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors",
                                                                children: "Promos"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 367,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                href: `/tenants/${tenant.id}`,
                                                                className: "px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors",
                                                                children: "View"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 373,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleDeactivate(tenant),
                                                                disabled: PROTECTED_SLUGS.includes(tenant.slug) || actionLoading === tenant.id || tenant.status === 'deactivated',
                                                                className: "px-3 py-1.5 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                                                children: "Deactivate"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 379,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleDelete(tenant),
                                                                disabled: PROTECTED_SLUGS.includes(tenant.slug) || actionLoading === tenant.id,
                                                                className: "px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                                                children: actionLoading === tenant.id ? '...' : 'Del'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                                lineNumber: 386,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                        lineNumber: 366,
                                                        columnNumber: 41
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 365,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, tenant.id, true, {
                                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                            lineNumber: 338,
                                            columnNumber: 33
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 336,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 313,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                        lineNumber: 312,
                        columnNumber: 17
                    }, this),
                    filteredTenants.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center py-12 text-gray-500",
                        children: "No tenants found"
                    }, void 0, false, {
                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                        lineNumber: 402,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 311,
                columnNumber: 13
            }, this),
            selectedTenant && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0,
                        scale: 0.95
                    },
                    animate: {
                        opacity: 1,
                        scale: 1
                    },
                    className: "glass-card p-6 max-w-lg w-full",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between items-center mb-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-bold text-white",
                                    children: [
                                        "Promos for ",
                                        selectedTenant.name
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 417,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setSelectedTenant(null),
                                    className: "text-gray-400 hover:text-white",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        className: "w-6 h-6",
                                        fill: "none",
                                        viewBox: "0 0 24 24",
                                        stroke: "currentColor",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            strokeWidth: 2,
                                            d: "M6 18L18 6M6 6l12 12"
                                        }, void 0, false, {
                                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                            lineNumber: 420,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                        lineNumber: 419,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 418,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 416,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleAddPromo,
                            className: "flex gap-2 mb-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: newPromoCode,
                                    onChange: (e)=>setNewPromoCode(e.target.value.toUpperCase()),
                                    placeholder: "Enter promo code",
                                    className: "input flex-1"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 427,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    disabled: !newPromoCode.trim(),
                                    className: "btn-primary whitespace-nowrap",
                                    children: "Apply"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 434,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 426,
                            columnNumber: 25
                        }, this),
                        addPromoError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-red-400 text-sm mb-4 bg-red-500/10 p-2 rounded",
                            children: addPromoError
                        }, void 0, false, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 439,
                            columnNumber: 29
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-3 max-h-60 overflow-y-auto",
                            children: promoLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center py-4 text-gray-500",
                                children: "Loading..."
                            }, void 0, false, {
                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                lineNumber: 447,
                                columnNumber: 33
                            }, this) : tenantPromos.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center py-4 text-gray-500 border border-dashed border-white/10 rounded-lg",
                                children: "No active promotions"
                            }, void 0, false, {
                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                lineNumber: 449,
                                columnNumber: 33
                            }, this) : tenantPromos.map((promo)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "font-mono font-bold text-white text-lg",
                                                    children: promo.code
                                                }, void 0, false, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 456,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-xs text-gray-400",
                                                    children: [
                                                        promo.discount_percent,
                                                        "% off • ",
                                                        promo.lifetime ? 'Lifetime' : 'One-time'
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                                    lineNumber: 457,
                                                    columnNumber: 45
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                            lineNumber: 455,
                                            columnNumber: 41
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>handleRemovePromo(promo.code),
                                            className: "text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded transition-colors",
                                            children: "Remove"
                                        }, void 0, false, {
                                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                            lineNumber: 461,
                                            columnNumber: 41
                                        }, this)
                                    ]
                                }, promo.id, true, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                                    lineNumber: 454,
                                    columnNumber: 37
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                            lineNumber: 445,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                    lineNumber: 411,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
                lineNumber: 410,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/tenants/page.tsx",
        lineNumber: 259,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=app-FRESH_owner-admin_src_app_%28dashboard%29_tenants_page_tsx_df1133f6._.js.map