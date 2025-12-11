(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AuditLogPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/owner-admin/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/owner-admin/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app-FRESH/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
// Mock audit entries
const mockAuditLog = [
    {
        id: '1',
        action: 'tenant.deactivate',
        actor: 'owner@platform.com',
        target: 'test-tenant',
        timestamp: '2024-12-10T15:30:00Z',
        details: 'Deactivated due to non-payment'
    },
    {
        id: '2',
        action: 'promo.create',
        actor: 'owner@platform.com',
        target: 'WINTER50',
        timestamp: '2024-12-10T14:00:00Z',
        details: '50% off, lifetime'
    },
    {
        id: '3',
        action: 'tenant.update',
        actor: 'owner@platform.com',
        target: 'syston-tigers',
        timestamp: '2024-12-10T12:15:00Z',
        details: 'Updated plan from starter to pro'
    },
    {
        id: '4',
        action: 'settings.update',
        actor: 'owner@platform.com',
        target: 'feature_flags',
        timestamp: '2024-12-09T18:45:00Z',
        details: 'Enabled AI Coaching feature'
    }
];
const actionLabels = {
    'tenant.deactivate': {
        label: 'Tenant Deactivated',
        color: 'text-red-400'
    },
    'tenant.delete': {
        label: 'Tenant Deleted',
        color: 'text-red-400'
    },
    'tenant.update': {
        label: 'Tenant Updated',
        color: 'text-blue-400'
    },
    'tenant.create': {
        label: 'Tenant Created',
        color: 'text-green-400'
    },
    'promo.create': {
        label: 'Promo Created',
        color: 'text-green-400'
    },
    'promo.deactivate': {
        label: 'Promo Deactivated',
        color: 'text-yellow-400'
    },
    'settings.update': {
        label: 'Settings Updated',
        color: 'text-purple-400'
    }
};
function AuditLogPage() {
    _s();
    const [entries] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(mockAuditLog);
    const formatTimestamp = (ts)=>{
        const date = new Date(ts);
        return date.toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6 animate-in",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold text-white",
                        children: "Audit Log"
                    }, void 0, false, {
                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                        lineNumber: 79,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-500 mt-1",
                        children: "Track all administrative actions"
                    }, void 0, false, {
                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                        lineNumber: 80,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                lineNumber: 78,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glass-card p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "text",
                            placeholder: "Search actions...",
                            className: "input flex-1 min-w-[200px]"
                        }, void 0, false, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                            lineNumber: 86,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            className: "input w-auto",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "",
                                    children: "All Actions"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                    lineNumber: 92,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "tenant",
                                    children: "Tenant Actions"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                    lineNumber: 93,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "promo",
                                    children: "Promo Actions"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                    lineNumber: 94,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "settings",
                                    children: "Settings Changes"
                                }, void 0, false, {
                                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                    lineNumber: 95,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                            lineNumber: 91,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "date",
                            className: "input w-auto"
                        }, void 0, false, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                            lineNumber: 97,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                    lineNumber: 85,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                lineNumber: 84,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glass-card p-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-6",
                        children: entries.map((entry, i)=>{
                            const actionInfo = actionLabels[entry.action] || {
                                label: entry.action,
                                color: 'text-gray-400'
                            };
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                                initial: {
                                    opacity: 0,
                                    x: -20
                                },
                                animate: {
                                    opacity: 1,
                                    x: 0
                                },
                                transition: {
                                    delay: i * 0.05
                                },
                                className: "flex gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-3 h-3 rounded-full bg-white/20"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                lineNumber: 117,
                                                columnNumber: 37
                                            }, this),
                                            i < entries.length - 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-px flex-1 bg-white/10 my-2"
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                lineNumber: 119,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                        lineNumber: 116,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1 pb-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-start justify-between",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `font-medium ${actionInfo.color}`,
                                                                children: actionInfo.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                                lineNumber: 127,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-gray-400 mx-2",
                                                                children: "on"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                                lineNumber: 130,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "font-mono text-white",
                                                                children: entry.target
                                                            }, void 0, false, {
                                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                                lineNumber: 131,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                        lineNumber: 126,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-sm text-gray-500",
                                                        children: formatTimestamp(entry.timestamp)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                        lineNumber: 133,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                lineNumber: 125,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm text-gray-500 mt-1",
                                                children: [
                                                    "by ",
                                                    entry.actor
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                lineNumber: 137,
                                                columnNumber: 37
                                            }, this),
                                            entry.details && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-2 text-sm text-gray-400 bg-white/5 rounded-lg px-3 py-2",
                                                children: entry.details
                                            }, void 0, false, {
                                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                                lineNumber: 141,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                        lineNumber: 124,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, entry.id, true, {
                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                lineNumber: 108,
                                columnNumber: 29
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                        lineNumber: 103,
                        columnNumber: 17
                    }, this),
                    entries.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center py-12 text-gray-500",
                        children: "No audit entries found"
                    }, void 0, false, {
                        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                        lineNumber: 152,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                lineNumber: 102,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-end",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "btn-secondary flex items-center gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            className: "w-4 h-4",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            stroke: "currentColor",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2d$FRESH$2f$owner$2d$admin$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                strokeWidth: 2,
                                d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            }, void 0, false, {
                                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                                lineNumber: 162,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                            lineNumber: 161,
                            columnNumber: 21
                        }, this),
                        "Export CSV"
                    ]
                }, void 0, true, {
                    fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                    lineNumber: 160,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
                lineNumber: 159,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app-FRESH/owner-admin/src/app/(dashboard)/audit-log/page.tsx",
        lineNumber: 76,
        columnNumber: 9
    }, this);
}
_s(AuditLogPage, "oHGF7S9PTt6tae9s1CE3KdiDsWI=");
_c = AuditLogPage;
var _c;
__turbopack_context__.k.register(_c, "AuditLogPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=app-FRESH_owner-admin_src_app_%28dashboard%29_audit-log_page_tsx_e09d27f5._.js.map