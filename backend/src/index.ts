import { Router } from "itty-router";
import { handlePublicTenantRequest } from "./routes/public";
import { errorHandler } from "./middleware/errorHandler";
import { corsHeaders, isPreflight } from "./middleware/cors";
import { newRequestId, logJSON } from "./lib/log";
import { withSecurity } from "./middleware/securityHeaders";
import { healthz, readyz } from "./routes/health";
import { registerTenantRoutes } from "./routes/tenants";
import { updateTenantMe, getTenantMe } from "./routes/tenant-self";
import {
    handleAuthRegister,
    handleAuthLogin,
    handleSetPassword,
    handleCheckPasswordStatus,
    handleCodeLogin,
    handleFanLogin,
    handleRegisterOwner,
    handleVerifyEmail,
    handleSwitchTenant,
    handleLinkPlayer,
    handleGetMyTenants,
    handleRequestPasswordReset,
    handleResetPassword,
    handleSignup,
    handleVerifySignup,
    handleDeleteAccount
} from "./routes/auth";
import {
    signupStart,
    signupBrand,
    signupStarterMake,
    signupProConfirm,
    signupVerifyPromo
} from "./routes/signup";
import {
    handleListOpponents,
    handleCreateOpponent,
    handleConfirmBadge,
    handleSearchBadge,
    handleSearchLibrary,
    handleDeleteOpponent,
    handleUploadBadge
} from "./routes/opponents";
import {
    handleYouTubeGetUploadUrl,
    handleYouTubeUpload,
    handleYouTubeStatus
} from "./routes/youtube-upload";
import {
    handleListFriendlyRequests,
    handleCreateFriendlyRequest,
    handleGetMyFriendlyRequests,
    handleDeleteFriendlyRequest,
    handleRequestMatch,
    handleGetFriendlyInbox,
    handleRespondToMatch,
    handleGetSentRequests
} from "./routes/friendlies";
import {
    handleCreateCheckout,
    handleBillingPortal,
    handleBillingStatus,
    handleStripeWebhook
} from "./routes/billing";
import {
    handleGetOrganization,
    handleAddTeam,
    handleRemoveTeam,
    handleGetPlans,
    handleInviteTeam,
    handleAcceptInvite,
    handleGetPendingInvites
} from "./routes/organization";
import {
    handleCreatePaymentRequest,
    handleListPaymentRequests,
    handlePaymentRequestStatus,
    handleCreateDuesPayment,
    handleConfirmDuesPayment,
    handleSendReminder,
    handleClosePaymentRequest
} from "./routes/dues";
import {
    handleCreateSubscriptionPlan,
    handleListSubscriptionPlans,
    handleCreateRegistrationFee,
    handleListRegistrationFees,
    handleCreateDocument,
    handleListDocuments,
    handleSignDocument,
    handleGetPlayerAgreements,
    handleCreateDiscount,
    handleListDiscounts,
    handleLinkStaffChild,
    handleListStaffChildren
} from "./routes/registration";
import {
    handleGetPersonalizedProducts,
    handleAddPhrase,
    handleListPhrases,
    handleDeletePhrase,
    handleAddClubProduct,
    handleListClubProducts,
    handleConfirmShopOrder,
    handleCreateCheckoutSession,
    handleListShopOrders
} from "./routes/personalized-shop";
import {
    handleGetRevenueSummary,
    handleGetRevenueByTenant,
    handleGetRevenueProjections
} from "./routes/owner-revenue";
import {
    handleUploadHeadshot,
    handleDeleteHeadshot,
    handleUploadDocument,
    handleUploadProductImage
} from "./routes/upload";
import {
    handleListPrintifyShops,
    handleGetPrintifyCatalog,
    handleGetPrintProviders,
    handleGetVariants,
    handleCreatePrintifyProduct,
    handleListPrintifyProducts,
    handleUploadToPrintify,
    handleCreatePrintifyOrder,
    handleSendOrderToProduction,
    handleGetPrintifyOrder,
    handlePrintifyWebhook
} from "./routes/printify";
import {
    handleGenerateDesign,
    handleUploadDesignToPrintify,
    handleCreatePersonalizedOrder,
    handleGetPlayerPreview
} from "./routes/personalization";
import {
    listTenants,
    getTenant,
    updateTenant,
    listPromoCodes,
    createPromoCode,
    deactivateTenant,
    deleteTenant,
    deactivatePromoCode,
    getAdminStats,
    listUsers,
    upsertPromoCode,
    getSystemConfig,
    updateSystemConfig,
    togglePromoCode,
    listTenantPromos,
    applyTenantPromo,
    removeTenantPromo,
    deletePromoCode
} from "./routes/admin";
import {
    handleProvisionQueue,
    handleProvisionStatus,
    handleTenantOverview,
    handleProvisionRetry
} from "./routes/provisioning";
import { handleMagicStart, handleMagicVerify } from "./routes/magic";
import { handleDevAdminJWT, handleDevMagicLink, handleDevInfo } from "./routes/devAuth";
import { getUsage, incrementUsage } from "./routes/usage";
import {
    handleSecuritySummary,
    handleSecurityMetrics,
    handleSecurityEvents,
    handleEventTypes,
    handleSecurityExport
} from "./routes/securityDashboard";
import {
    handleVideoUpload,
    handleVideoList,
    handleVideoGet,
    handleVideoStatus,
    handleVideoProcess,
    handleVideoDelete,
    handleVideoStream,
    handleVideoClips
} from "./routes/videos";
import {
    handleAnalyzeMistakes,
    handleGetMistakes,
    handleGenerateDrills,
    handleGenerateSession,
    handleSaveTrainingSession,
    handleGetTrainingSessions,
    handleGetTrainingSession,
    handleDeleteTrainingSession,
    handleGetJobStatus
} from "./routes/coaching";
import {
    handleImportFixtures,
    handleImportResults,
    handleImportPlayers,
    handleImportMatchEvents,
    handleGetImportTemplate,
    handleGetImportStatus
} from "./routes/import";
import {
    handleSyncFromWebsite,
    handleSyncFromSnippet,
    handleParseEmail,
    handleEmailWebhook,
    handleSyncAll,
    handleGetFAConfig,
    handleSetFAConfig
} from "./routes/fa-sync";
import {
    handleListDevices,
    handleCreateDevice,
    handleGetDevice,
    handleUpdateDevice,
    handleDeleteDevice,
    handleListSessions as handleListWearableSessions,
    handleCreateSession as handleCreateWearableSession,
    handleGetSession as handleGetWearableSession,
    handleGetGPSTrack,
    handleSyncData,
    handleManualEntry,
    handleGetPlayerMetrics,
    handleGetPlayerSummary,
    handleGetFatigueAssessment,
    handleListPitches,
    handleCreatePitch,
    handleImportData
} from "./routes/wearables";
// Cron Jobs
import { runDaily } from "./cron/daily";
import { runThrowback } from "./cron/throwback";
import { runMilestones, checkMilestonesAfterMatch } from "./cron/milestones";
import { runPlayerOfPeriod } from "./cron/playerOfPeriod";
import { runCleanup } from "./cron/cleanup";
import { runLeague } from "./cron/league";
import { runFASync } from "./cron/fa-sync";

// Export Durable Objects
export { TenantRateLimiter } from "./do/rateLimiter";
export { VotingRoom } from "./do/votingRoom";
export { MatchRoom } from "./do/matchRoom";
export { ChatRoom } from "./do/chatRoom";
export { GeoFenceManager } from "./do/geoFenceManager";
export { Provisioner } from "./do/provisioner";

const router = Router();

// Health Checks
router.get("/healthz", async (req, env) => {
    const res = await healthz(env);
    return res;
});
router.get("/readyz", async (req, env) => {
    const res = await readyz(env);
    return res;
});

// Public Routes
router.get("/public/*", async (req, env, corsHdrs, requestId) => {
    return handlePublicTenantRequest(req, env, new URL(req.url), corsHdrs, requestId);
});

// Stripe Webhook (No version prefix needed, publicly accessible)
// router.post("/api/webhooks/stripe", (req, env) => handleStripeWebhook(req, env));

// Auth Routes
router.post("/api/:v/auth/register-owner", (req, env, corsHdrs) => {
    // Check if new registration logic
    return handleRegisterOwner(req, env, corsHdrs);
});
router.post("/api/:v/auth/verify-email", (req, env, corsHdrs) => handleVerifyEmail(req, env, corsHdrs));
router.post("/api/:v/auth/register", (req, env, corsHdrs) => handleAuthRegister(req, env, corsHdrs));


router.post("/api/:v/auth/login", (req, env, corsHdrs) => handleAuthLogin(req, env, corsHdrs));
router.post("/api/:v/auth/set-password", (req, env, corsHdrs) => handleSetPassword(req, env, corsHdrs));
router.get("/api/:v/auth/password-status", (req, env, corsHdrs) => handleCheckPasswordStatus(req, env, corsHdrs));
router.post("/api/:v/auth/switch-tenant", (req, env, corsHdrs) => handleSwitchTenant(req, env, corsHdrs));
router.post("/api/:v/auth/link-player", (req, env, corsHdrs) => handleLinkPlayer(req, env, corsHdrs)); // Changed from handleAddPlayer
router.get("/api/:v/auth/me/tenants", (req, env, corsHdrs) => handleGetMyTenants(req, env, corsHdrs));
router.post("/api/:v/auth/code-login", (req, env, corsHdrs) => handleCodeLogin(req, env, corsHdrs));
router.post("/api/:v/auth/fan-login", (req, env, corsHdrs) => handleFanLogin(req, env, corsHdrs));
router.post("/api/:v/auth/request-password-reset", (req, env, corsHdrs) => handleRequestPasswordReset(req, env, corsHdrs));
router.post("/api/:v/auth/reset-password", (req, env, corsHdrs) => handleResetPassword(req, env, corsHdrs));
router.post("/api/:v/auth/signup", (req, env, corsHdrs) => handleSignup(req, env, corsHdrs));
router.post("/api/:v/auth/verify-signup", (req, env, corsHdrs) => handleVerifySignup(req, env, corsHdrs));
router.delete("/api/:v/auth/account", (req, env, corsHdrs) => handleDeleteAccount(req, env, corsHdrs));

// Magic Link Routes
router.post("/api/:v/magic/start", (req, env, corsHdrs) => handleMagicStart(req, env, corsHdrs));
router.post("/api/:v/magic/verify", (req, env, corsHdrs) => handleMagicVerify(req, env, corsHdrs));

// Tenant Routes
registerTenantRoutes(router);
router.patch("/api/:v/tenants/me", (req, env, corsHdrs) => updateTenantMe(req, env, corsHdrs));
router.get("/api/:v/tenants/me", (req, env, corsHdrs) => getTenantMe(req, env, corsHdrs));

// Signup Routes
router.post("/public/signup/start", (req, env, corsHdrs, requestId) => signupStart(req, env, requestId, corsHdrs));
router.post("/public/signup/brand", (req, env, corsHdrs, requestId) => signupBrand(req, env, requestId, corsHdrs));
router.post("/public/signup/starter/make", (req, env, corsHdrs, requestId) => signupStarterMake(req, env, requestId, corsHdrs));
router.post("/public/signup/pro/confirm", (req, env, corsHdrs, requestId) => signupProConfirm(req, env, requestId, corsHdrs));
router.post("/public/signup/verify-promo", (req, env, corsHdrs, requestId) => signupVerifyPromo(req, env, requestId, corsHdrs));

// Admin Routes
router.get("/api/:v/admin/tenants", (req, env, corsHdrs, requestId) => listTenants(req, env, requestId, corsHdrs));
router.get("/api/:v/admin/tenants/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return getTenant(req, env, requestId, corsHdrs, params.id);
});
router.patch("/api/:v/admin/tenants/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return updateTenant(req, env, requestId, corsHdrs, params.id);
});
router.post("/api/:v/admin/tenants/:id/deactivate", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return deactivateTenant(req, env, requestId, corsHdrs, params.id);
});
router.delete("/api/:v/admin/tenants/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return deleteTenant(req, env, requestId, corsHdrs, params.id);
});
router.get("/api/:v/admin/promo-codes", (req, env, corsHdrs, requestId) => listPromoCodes(req, env, requestId, corsHdrs));
router.post("/api/:v/admin/promo-codes", (req, env, corsHdrs, requestId) => createPromoCode(req, env, requestId, corsHdrs));
router.post("/api/:v/admin/promo/upsert", (req, env, corsHdrs, requestId) => upsertPromoCode(req, env, requestId, corsHdrs));
router.post("/api/:v/admin/promo-codes/:code/deactivate", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return deactivatePromoCode(req, env, requestId, corsHdrs, params.code);
});
router.post("/api/:v/admin/promo-codes/:code/toggle", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return togglePromoCode(req, env, requestId, corsHdrs, params.code);
});
router.delete("/api/:v/admin/promo-codes/:code", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return deletePromoCode(req, env, requestId, corsHdrs, params.code);
});
router.get("/api/:v/admin/tenants/:id/promos", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return listTenantPromos(req, env, requestId, corsHdrs, params.id);
});
router.post("/api/:v/admin/tenants/:id/promos", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return applyTenantPromo(req, env, requestId, corsHdrs, params.id);
});
router.delete("/api/:v/admin/tenants/:id/promos/:code", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return removeTenantPromo(req, env, requestId, corsHdrs, params.id, params.code);
});

router.get("/api/:v/admin/stats", (req, env, corsHdrs, requestId) => getAdminStats(req, env, requestId, corsHdrs));
router.get("/api/:v/admin/users", (req, env, corsHdrs, requestId) => listUsers(req, env, requestId, corsHdrs));

// Opponent Badge Management Routes
router.get("/api/:v/opponents", (req, env, corsHdrs) => handleListOpponents(req, env, corsHdrs));
router.post("/api/:v/opponents", (req, env, corsHdrs) => handleCreateOpponent(req, env, corsHdrs));
router.post("/api/:v/opponents/search-badge", (req, env, corsHdrs) => handleSearchBadge(req, env, corsHdrs));
router.post("/api/:v/opponents/:id/confirm", (req, env, corsHdrs) => handleConfirmBadge(req, env, corsHdrs));
router.post("/api/:v/opponents/:id/upload-badge", (req, env, corsHdrs) => handleUploadBadge(req, env, corsHdrs));
router.delete("/api/:v/opponents/:id", (req, env, corsHdrs) => handleDeleteOpponent(req, env, corsHdrs));
router.get("/api/:v/badge-library/search", (req, env, corsHdrs) => handleSearchLibrary(req, env, corsHdrs));

// YouTube Video Upload Routes
router.post("/api/:v/youtube/upload-url", (req, env, corsHdrs) => handleYouTubeGetUploadUrl(req, env, corsHdrs));
router.post("/api/:v/youtube/upload", (req, env, corsHdrs) => handleYouTubeUpload(req, env, corsHdrs));
router.get("/api/:v/youtube/status", (req, env, corsHdrs) => handleYouTubeStatus(req, env, corsHdrs));

// Friendly Matchmaking Marketplace Routes
router.get("/api/:v/friendlies", (req, env, corsHdrs) => handleListFriendlyRequests(req, env, corsHdrs));
router.post("/api/:v/friendlies", (req, env, corsHdrs) => handleCreateFriendlyRequest(req, env, corsHdrs));
router.get("/api/:v/friendlies/mine", (req, env, corsHdrs) => handleGetMyFriendlyRequests(req, env, corsHdrs));
router.get("/api/:v/friendlies/inbox", (req, env, corsHdrs) => handleGetFriendlyInbox(req, env, corsHdrs));
router.get("/api/:v/friendlies/sent", (req, env, corsHdrs) => handleGetSentRequests(req, env, corsHdrs));
router.delete("/api/:v/friendlies/:id", (req, env, corsHdrs) => handleDeleteFriendlyRequest(req, env, corsHdrs));
router.post("/api/:v/friendlies/:id/request", (req, env, corsHdrs) => handleRequestMatch(req, env, corsHdrs));
router.post("/api/:v/friendlies/match/:id/respond", (req, env, corsHdrs) => handleRespondToMatch(req, env, corsHdrs));

// Billing Routes
router.post("/api/:v/billing/checkout", (req, env, corsHdrs) => handleCreateCheckout(req, env, corsHdrs));
router.post("/api/:v/billing/portal", (req, env, corsHdrs) => handleBillingPortal(req, env, corsHdrs));
router.get("/api/:v/billing/status", (req, env, corsHdrs) => handleBillingStatus(req, env, corsHdrs));
router.post("/webhooks/stripe", (req, env) => handleStripeWebhook(req, env));

// Organization Routes (Multi-Team Management)
router.get("/api/:v/organization", (req, env, corsHdrs) => handleGetOrganization(req, env, corsHdrs));
router.post("/api/:v/organization/teams", (req, env, corsHdrs) => handleAddTeam(req, env, corsHdrs));
router.delete("/api/:v/organization/teams/:id", (req, env, corsHdrs) => handleRemoveTeam(req, env, corsHdrs));
router.get("/api/:v/organization/plans", (req, env, corsHdrs) => handleGetPlans(req, env, corsHdrs));
router.post("/api/:v/organization/invite-team", (req, env, corsHdrs) => handleInviteTeam(req, env, corsHdrs));
router.post("/api/:v/organization/accept-invite", (req, env, corsHdrs) => handleAcceptInvite(req, env, corsHdrs));
router.get("/api/:v/organization/pending-invites", (req, env, corsHdrs) => handleGetPendingInvites(req, env, corsHdrs));

// Member Dues Collection Routes
router.post("/api/:v/dues/requests", (req, env, corsHdrs) => handleCreatePaymentRequest(req, env, corsHdrs));
router.get("/api/:v/dues/requests", (req, env, corsHdrs) => handleListPaymentRequests(req, env, corsHdrs));
router.get("/api/:v/dues/requests/:id/status", (req, env, corsHdrs) => handlePaymentRequestStatus(req, env, corsHdrs));
router.put("/api/:v/dues/requests/:id/close", (req, env, corsHdrs) => handleClosePaymentRequest(req, env, corsHdrs));
router.post("/api/:v/dues/pay", (req, env, corsHdrs) => handleCreateDuesPayment(req, env, corsHdrs));
router.post("/api/:v/dues/confirm", (req, env, corsHdrs) => handleConfirmDuesPayment(req, env, corsHdrs));
router.post("/api/:v/dues/remind", (req, env, corsHdrs) => handleSendReminder(req, env, corsHdrs));

// Registration System Routes
router.post("/api/:v/registration/plans", (req, env, corsHdrs) => handleCreateSubscriptionPlan(req, env, corsHdrs));
router.get("/api/:v/registration/plans", (req, env, corsHdrs) => handleListSubscriptionPlans(req, env, corsHdrs));
router.post("/api/:v/registration/fees", (req, env, corsHdrs) => handleCreateRegistrationFee(req, env, corsHdrs));
router.get("/api/:v/registration/fees", (req, env, corsHdrs) => handleListRegistrationFees(req, env, corsHdrs));
router.post("/api/:v/registration/documents", (req, env, corsHdrs) => handleCreateDocument(req, env, corsHdrs));
router.get("/api/:v/registration/documents", (req, env, corsHdrs) => handleListDocuments(req, env, corsHdrs));
router.post("/api/:v/registration/sign", (req, env, corsHdrs) => handleSignDocument(req, env, corsHdrs));
router.get("/api/:v/registration/agreements/:playerId", (req, env, corsHdrs) => handleGetPlayerAgreements(req, env, corsHdrs));
router.post("/api/:v/registration/discounts", (req, env, corsHdrs) => handleCreateDiscount(req, env, corsHdrs));
router.get("/api/:v/registration/discounts", (req, env, corsHdrs) => handleListDiscounts(req, env, corsHdrs));
router.post("/api/:v/registration/staff-children", (req, env, corsHdrs) => handleLinkStaffChild(req, env, corsHdrs));
router.get("/api/:v/registration/staff-children", (req, env, corsHdrs) => handleListStaffChildren(req, env, corsHdrs));

// Personalized Shop Routes
router.get("/api/:v/shop/personalized", (req, env, corsHdrs) => handleGetPersonalizedProducts(req, env, corsHdrs));
router.post("/api/:v/shop/phrases", (req, env, corsHdrs) => handleAddPhrase(req, env, corsHdrs));
router.get("/api/:v/shop/phrases", (req, env, corsHdrs) => handleListPhrases(req, env, corsHdrs));
router.delete("/api/:v/shop/phrases/:id", (req, env, corsHdrs) => handleDeletePhrase(req, env, corsHdrs));
router.post("/api/:v/shop/club-products", (req, env, corsHdrs) => handleAddClubProduct(req, env, corsHdrs));
router.get("/api/:v/shop/club-products", (req, env, corsHdrs) => handleListClubProducts(req, env, corsHdrs));
router.post("/api/:v/shop/checkout", (req, env, corsHdrs) => handleCreateCheckoutSession(req, env, corsHdrs));
router.post("/api/:v/shop/orders/:id/confirm", (req, env, corsHdrs) => handleConfirmShopOrder(req, env, corsHdrs));
router.get("/api/:v/shop/orders", (req, env, corsHdrs) => handleListShopOrders(req, env, corsHdrs));

// Owner Revenue Routes (requires OWNER_API_KEY)
router.get("/owner-api/revenue/summary", (req, env) => handleGetRevenueSummary(req, env));
router.get("/owner-api/revenue/by-tenant", (req, env) => handleGetRevenueByTenant(req, env));
router.get("/owner-api/revenue/projections", (req, env) => handleGetRevenueProjections(req, env));

// Upload Routes (R2 Storage)
router.post("/api/:v/upload/headshot", (req, env, corsHdrs) => handleUploadHeadshot(req, env, corsHdrs));
router.delete("/api/:v/upload/headshot/:playerId", (req, env, corsHdrs) => handleDeleteHeadshot(req, env, corsHdrs));
router.post("/api/:v/upload/document", (req, env, corsHdrs) => handleUploadDocument(req, env, corsHdrs));
router.post("/api/:v/upload/product-image", (req, env, corsHdrs) => handleUploadProductImage(req, env, corsHdrs));

// Printify Integration Routes
router.get("/api/:v/printify/shops", (req, env, corsHdrs) => handleListPrintifyShops(req, env, corsHdrs));
router.get("/api/:v/printify/catalog", (req, env, corsHdrs) => handleGetPrintifyCatalog(req, env, corsHdrs));
router.get("/api/:v/printify/catalog/:blueprintId/providers", (req, env, corsHdrs) => handleGetPrintProviders(req, env, corsHdrs));
router.get("/api/:v/printify/catalog/:blueprintId/providers/:providerId/variants", (req, env, corsHdrs) => handleGetVariants(req, env, corsHdrs));
router.post("/api/:v/printify/products", (req, env, corsHdrs) => handleCreatePrintifyProduct(req, env, corsHdrs));
router.get("/api/:v/printify/products/:shopId", (req, env, corsHdrs) => handleListPrintifyProducts(req, env, corsHdrs));
router.post("/api/:v/printify/uploads", (req, env, corsHdrs) => handleUploadToPrintify(req, env, corsHdrs));
router.post("/api/:v/printify/orders", (req, env, corsHdrs) => handleCreatePrintifyOrder(req, env, corsHdrs));
router.post("/api/:v/printify/orders/:orderId/send", (req, env, corsHdrs) => handleSendOrderToProduction(req, env, corsHdrs));
router.get("/api/:v/printify/orders/:shopId/:orderId", (req, env, corsHdrs) => handleGetPrintifyOrder(req, env, corsHdrs));
router.post("/webhooks/printify", (req, env) => handlePrintifyWebhook(req, env));

// Personalization Routes (Dynamic merchandise generation)
router.post("/api/:v/personalization/generate", (req, env, corsHdrs) => handleGenerateDesign(req, env, corsHdrs));
router.post("/api/:v/personalization/upload-to-printify", (req, env, corsHdrs) => handleUploadDesignToPrintify(req, env, corsHdrs));
router.post("/api/:v/personalization/order", (req, env, corsHdrs) => handleCreatePersonalizedOrder(req, env, corsHdrs));
router.get("/api/:v/personalization/preview/:playerId", (req, env, corsHdrs) => handleGetPlayerPreview(req, env, corsHdrs));

// Alias for legacy tests
router.get("/api/:v/users", (req, env, corsHdrs, requestId) => listUsers(req, env, requestId, corsHdrs));

router.get("/api/:v/admin/system/config", (req, env, corsHdrs, requestId) => getSystemConfig(req, env, requestId, corsHdrs));
router.put("/api/:v/admin/system/config", (req, env, corsHdrs, requestId) => updateSystemConfig(req, env, requestId, corsHdrs));

// Provisioning Routes
router.post("/internal/provision/queue", (req, env, corsHdrs, requestId) => handleProvisionQueue(req, env));
router.get("/api/:v/tenants/:id/provision-status", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleProvisionStatus(req, env, params.id);
});
router.get("/api/:v/tenants/:id/overview", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleTenantOverview(req, env, params.id);
});
router.post("/internal/provision/retry", (req, env, corsHdrs, requestId) => {
    return handleProvisionRetry(req, env);
});

// Usage Routes
router.get("/api/:v/usage", (req, env, corsHdrs, requestId) => getUsage(req, env, requestId, corsHdrs));
router.post("/api/:v/usage/increment", (req, env, corsHdrs, requestId) => incrementUsage(req, env, requestId, corsHdrs));

// Security Dashboard Routes
router.get("/api/:v/security/summary", (req, env, corsHdrs, requestId) => handleSecuritySummary(req, env, corsHdrs));
router.get("/api/:v/security/metrics", (req, env, corsHdrs, requestId) => handleSecurityMetrics(req, env, corsHdrs));
router.get("/api/:v/security/events", (req, env, corsHdrs, requestId) => handleSecurityEvents(req, env, corsHdrs));
router.get("/api/:v/security/event-types", (req, env, corsHdrs, requestId) => handleEventTypes(req, env, corsHdrs));
router.get("/api/:v/security/export", (req, env, corsHdrs, requestId) => handleSecurityExport(req, env, corsHdrs));

// Push Routes
export * from "./services/fixtures";
import { handlePushRegister, handlePushSend, handlePushBroadcast } from "./routes/push";
router.post("/api/:v/push/register", (req, env) => handlePushRegister(req, env));
router.post("/api/:v/push/send", (req, env) => handlePushSend(req, env));
router.post("/api/:v/push/broadcast", (req, env) => handlePushBroadcast(req, env));

// Events Routes
import { createEvent, getEvent, rsvpEvent, getEventRsvps, cancelRsvp, listEvents, deleteEvent } from "./routes/events";
router.post("/api/:v/events", (req, env, corsHdrs, requestId) => createEvent(req, env, requestId, corsHdrs));
router.get("/api/:v/events", (req, env, corsHdrs, requestId) => listEvents(req, env, requestId, corsHdrs));
router.get("/api/:v/events/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return getEvent(req, env, requestId, corsHdrs, params.id);
});
router.delete("/api/:v/events/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return deleteEvent(req, env, requestId, corsHdrs, params.id);
});
router.post("/api/:v/events/:id/rsvp", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return rsvpEvent(req, env, requestId, corsHdrs, params.id);
});
router.get("/api/:v/events/:id/rsvps", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return getEventRsvps(req, env, requestId, corsHdrs, params.id);
});
router.delete("/api/:v/events/:id/rsvp", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return cancelRsvp(req, env, requestId, corsHdrs, params.id);
});

// Match Routes
import { handleMatchUpdates, handleCreateMatchEvent } from "./routes/matches";
router.post("/api/:v/matches/:id/events", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleCreateMatchEvent(req, env, corsHdrs, params.id);
});
router.get("/api/:v/matches/:id/updates", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleMatchUpdates(req, env, corsHdrs, params.id);
});

// Chat Routes
import {
    handleListRooms,
    handleSendMessage,
    handleGetHistory,
    handleTyping,
    handleCreateRoom
} from "./routes/chat";
router.get("/api/:v/chat/rooms", (req, env, corsHdrs) => handleListRooms(req, env, corsHdrs));
router.post("/api/:v/chat/rooms", (req, env, corsHdrs) => handleCreateRoom(req, env, corsHdrs));
router.post("/api/:v/chat/:roomId/send", (req, env, corsHdrs) => handleSendMessage(req, env, corsHdrs));
router.get("/api/:v/chat/:roomId/history", (req, env, corsHdrs) => handleGetHistory(req, env, corsHdrs));
router.post("/api/:v/chat/:roomId/typing", (req, env, corsHdrs) => handleTyping(req, env, corsHdrs));

// Gallery Routes
import {
    handlePhotoUpload,
    handleListPhotos,
    handleGetPhoto,
    handleDeletePhoto,
    handleCreateAlbum,
    handleListAlbums,
    handleDeleteAlbum
} from "./routes/gallery";
router.post("/api/:v/gallery/upload", (req, env, corsHdrs) => handlePhotoUpload(req, env, corsHdrs));
router.get("/api/:v/gallery/photos", (req, env, corsHdrs) => handleListPhotos(req, env, corsHdrs));
router.get("/api/:v/gallery/photos/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetPhoto(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/gallery/photos/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeletePhoto(req, env, corsHdrs, params.id);
});
router.post("/api/:v/gallery/albums", (req, env, corsHdrs) => handleCreateAlbum(req, env, corsHdrs));
router.get("/api/:v/gallery/albums", (req, env, corsHdrs) => handleListAlbums(req, env, corsHdrs));
router.delete("/api/:v/gallery/albums/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteAlbum(req, env, corsHdrs, params.id);
});

// Training Routes
import {
    handleCreateSession,
    handleListSessions,
    handleDeleteSession,
    handleCreateDrill,
    handleListDrills,
    handleDeleteDrill,
    handleAddDrillToSession,
    handleGetSessionDrills
} from "./routes/training";
router.post("/api/:v/training/sessions", (req, env, corsHdrs) => handleCreateSession(req, env, corsHdrs));
router.get("/api/:v/training/sessions", (req, env, corsHdrs) => handleListSessions(req, env, corsHdrs));
router.delete("/api/:v/training/sessions/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteSession(req, env, corsHdrs, params.id);
});
router.post("/api/:v/training/drills", (req, env, corsHdrs) => handleCreateDrill(req, env, corsHdrs));
router.get("/api/:v/training/drills", (req, env, corsHdrs) => handleListDrills(req, env, corsHdrs));
router.delete("/api/:v/training/drills/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteDrill(req, env, corsHdrs, params.id);
});
router.post("/api/:v/training/session-drills", (req, env, corsHdrs) => handleAddDrillToSession(req, env, corsHdrs));
router.get("/api/:v/training/sessions/:id/drills", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetSessionDrills(req, env, corsHdrs, params.id);
});

// Content Moderation Routes
router.post("/api/:v/content/report", (req, env, corsHdrs) => handleReportContent(req, env, corsHdrs));
router.get("/api/:v/content/reports", (req, env, corsHdrs) => handleGetReports(req, env, corsHdrs));
router.put("/api/:v/content/reports/:reportId", (req, env, corsHdrs) => {
    const url = new URL(req.url);
    const reportId = url.pathname.split('/').pop() || '';
    return handleUpdateReport(req, env, corsHdrs, reportId);
});

// MOTM Voting Routes
import {
    handleInitVote,
    handleCastVote,
    handleGetResults
} from "./routes/motm";
router.get("/api/:v/motm/:matchId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleInitVote(req, env, corsHdrs, params.matchId);
});
router.post("/api/:v/motm/:matchId/vote", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleCastVote(req, env, corsHdrs, params.matchId);
});
router.get("/api/:v/motm/:matchId/results", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetResults(req, env, corsHdrs, params.matchId);
});

// Social Media Routes
import {
    handleCreatePost as handleCreateSocialPost,
    handleListPosts as handleListSocialPosts,
    handleDeletePost as handleDeleteSocialPost,
    handleUpdateSocialConfig,
    handleGetSocialConfig
} from "./routes/social";
router.post("/api/:v/social/posts", (req, env, corsHdrs) => handleCreateSocialPost(req, env, corsHdrs));
router.get("/api/:v/social/posts", (req, env, corsHdrs) => handleListSocialPosts(req, env, corsHdrs));
router.delete("/api/:v/social/posts/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteSocialPost(req, env, corsHdrs, params.id);
});
router.put("/api/:v/social/config", (req, env, corsHdrs) => handleUpdateSocialConfig(req, env, corsHdrs));
router.get("/api/:v/social/config", (req, env, corsHdrs) => handleGetSocialConfig(req, env, corsHdrs));

// Player Photo Routes
import {
    handlePlayerPhotoUpload,
    handlePlayerPhotoDelete,
    handleGetPlayerGoals,
    handleGetPlayer as handleGetPlayerDetails,
    handleUpdatePlayer as handleUpdatePlayerDetails,
    handleRegenerateCode,
    handleGenerateCoachCode,
    handleGetFanCode
} from "./routes/players";
router.post("/api/:v/players/:id/photo", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handlePlayerPhotoUpload(req, env, corsHdrs);
});
router.delete("/api/:v/players/:id/photo", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handlePlayerPhotoDelete(req, env, corsHdrs, params.id);
});
router.get("/api/:v/players/:id/goals", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetPlayerGoals(req, env, corsHdrs, params.id);
});
// Player details with contacts and login code
router.get("/api/:v/players/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetPlayerDetails(req, env, corsHdrs, params.id);
});
router.put("/api/:v/players/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleUpdatePlayerDetails(req, env, corsHdrs, params.id);
});
router.post("/api/:v/players/:id/regenerate-code", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleRegenerateCode(req, env, corsHdrs, params.id);
});
// Coach and Fan code management
router.post("/api/:v/codes/coach", (req, env, corsHdrs) => handleGenerateCoachCode(req, env, corsHdrs));
router.get("/api/:v/codes/fan", (req, env, corsHdrs) => handleGetFanCode(req, env, corsHdrs));

// Team Discussion Routes
import {
    handleListDiscussions,
    handleCreateDiscussion,
    handleGetDiscussion,
    handleUpdateDiscussion,
    handleDeleteDiscussion,
    handleCreateComment,
    handleUpdateComment,
    handleDeleteComment
} from "./routes/discussions";

router.get("/api/:v/discussions", (req, env, corsHdrs) => handleListDiscussions(req, env, corsHdrs));
router.post("/api/:v/discussions", (req, env, corsHdrs) => handleCreateDiscussion(req, env, corsHdrs));
router.get("/api/:v/discussions/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetDiscussion(req, env, corsHdrs, params.id);
});
router.patch("/api/:v/discussions/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleUpdateDiscussion(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/discussions/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteDiscussion(req, env, corsHdrs, params.id);
});
router.post("/api/:v/discussions/:id/comments", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleCreateComment(req, env, corsHdrs, params.id);
});
router.patch("/api/:v/comments/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleUpdateComment(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/comments/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteComment(req, env, corsHdrs, params.id);
});

// Notification Routes
import {
    handleListNotifications,
    handleUnreadCount,
    handleMarkRead,
    handleMarkAllRead
} from "./routes/notifications";

router.get("/api/:v/notifications", (req, env, corsHdrs) => handleListNotifications(req, env, corsHdrs));
router.get("/api/:v/notifications/unread-count", (req, env, corsHdrs) => handleUnreadCount(req, env, corsHdrs));
router.post("/api/:v/notifications/:id/read", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleMarkRead(req, env, corsHdrs, params.id);
});
router.post("/api/:v/notifications/read-all", (req, env, corsHdrs) => handleMarkAllRead(req, env, corsHdrs));

// Member Routes (for mentions/search)
import { handleSearchMembers } from "./routes/members";
router.get("/api/:v/members/search", (req, env, corsHdrs) => handleSearchMembers(req, env, corsHdrs));

// Video Routes
router.post("/api/:v/videos/upload", (req, env, corsHdrs, requestId) => handleVideoUpload(req, env, corsHdrs));
router.get("/api/:v/videos", (req, env, corsHdrs, requestId) => handleVideoList(req, env, corsHdrs));
router.get("/api/:v/videos/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoGet(req, env, corsHdrs, params.id);
});
router.get("/api/:v/videos/:id/status", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoStatus(req, env, corsHdrs, params.id);
});
router.post("/api/:v/videos/:id/process", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoProcess(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/videos/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoDelete(req, env, corsHdrs, params.id);
});
router.get("/api/:v/videos/:id/clips", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoClips(req, env, corsHdrs, params.id);
});
router.get("/api/:v/videos/:id/stream", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleVideoStream(req, env, corsHdrs, params.id);
});

// ===== AI ASSISTANT COACH ROUTES =====

// Analyze video for coaching opportunities
router.post("/api/:v/videos/:id/analyze-mistakes", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleAnalyzeMistakes(req, env, corsHdrs, params.id);
});

// Get detected mistakes for a video
router.get("/api/:v/videos/:id/mistakes", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleGetMistakes(req, env, corsHdrs, params.id);
});

// Generate training drills from mistakes
router.post("/api/:v/coaching/generate-drills", (req, env, corsHdrs, requestId) =>
    handleGenerateDrills(req, env, corsHdrs)
);

// Generate complete training session
router.post("/api/:v/coaching/generate-session", (req, env, corsHdrs, requestId) =>
    handleGenerateSession(req, env, corsHdrs)
);

// Save training session plan
router.post("/api/:v/coaching/sessions", (req, env, corsHdrs, requestId) =>
    handleSaveTrainingSession(req, env, corsHdrs)
);

// Get all training sessions
router.get("/api/:v/coaching/sessions", (req, env, corsHdrs, requestId) =>
    handleGetTrainingSessions(req, env, corsHdrs)
);

// Get specific training session
router.get("/api/:v/coaching/sessions/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleGetTrainingSession(req, env, corsHdrs, params.id);
});

// Delete training session
router.delete("/api/:v/coaching/sessions/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleDeleteTrainingSession(req, env, corsHdrs, params.id);
});


// Get coaching job status (for polling)
router.get("/api/:v/coaching/jobs/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleGetJobStatus(req, env, corsHdrs, params.id);
});

// Squad Routes
import {
    handleUpdateSquad, handleGetSquad, handleGetPlayer,
    handleAddPlayer, handleUpdatePlayer, handleDeletePlayer,
    handlePreviewWelcomePost
} from "./routes/squad";
router.get("/api/:v/squad", (req, env, corsHdrs) => handleGetSquad(req, env, corsHdrs));
router.post("/api/:v/squad", (req, env, corsHdrs) => handleUpdateSquad(req, env, corsHdrs)); // Legacy bulk update
router.post("/api/:v/squad/add", (req, env, corsHdrs) => handleAddPlayer(req, env, corsHdrs));
router.post("/api/:v/squad/welcome-preview", (req, env, corsHdrs) => handlePreviewWelcomePost(req, env, corsHdrs));
router.get("/api/:v/squad/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetPlayer(req, env, corsHdrs, params.id);
});
router.put("/api/:v/squad/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleUpdatePlayer(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/squad/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeletePlayer(req, env, corsHdrs, params.id);
});

// Player Transfer Routes
import {
    handleGenerateTransferCode,
    handleVerifyTransferCode,
    handleClaimTransfer,
    handleGetCareerStats as handleGetTransferCareerStats
} from "./routes/transfers";
router.post("/api/:v/squad/:playerId/generate-transfer", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGenerateTransferCode(req, env, corsHdrs, params.playerId);
});
router.get("/api/:v/transfers/:code", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleVerifyTransferCode(req, env, corsHdrs, params.code);
});
router.post("/api/:v/squad/claim-transfer", (req, env, corsHdrs) => handleClaimTransfer(req, env, corsHdrs));
router.get("/api/:v/squad/:playerId/career-stats", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetTransferCareerStats(req, env, corsHdrs, params.playerId);
});

// Tactics Routes
import { handleSaveTactics, handleGetTactics } from "./routes/tactics";
router.post("/api/:v/tactics", (req, env, corsHdrs) => handleSaveTactics(req, env, corsHdrs));
router.get("/api/:v/tactics", (req, env, corsHdrs) => handleGetTactics(req, env, corsHdrs));

// Content Routes
import {
    handleCreateFixture, handleDeleteFixture,
    handleCreateResult, handleDeleteResult,
    handleCreatePost, handleDeletePost,
    handleUpdateTable, handleResignTeam,
    handleAutoImportFixtures, handleAutoCalculateTable
} from "./routes/content";

import { handleReportContent, handleGetReports, handleUpdateReport } from "./routes/content-moderation";

import { handleUpdateFixtureSettings, handleGetFixtureSettings } from "./routes/settings";

import { handleSaveMatchReport, handleGetMatchReport, handleGetPlayerStats } from "./routes/match-report";

router.post("/api/:v/matches/:id/report", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleSaveMatchReport(req, env, params.id);
});
router.get("/api/:v/matches/:id/report", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetMatchReport(req, env, params.id);
});
router.get("/api/:v/stats/players", (req, env, corsHdrs) => handleGetPlayerStats(req, env));

router.post("/api/:v/fixtures", (req, env, corsHdrs) => handleCreateFixture(req, env, corsHdrs));
router.delete("/api/:v/fixtures/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteFixture(req, env, corsHdrs, params.id);
});

router.post("/api/:v/results", (req, env, corsHdrs) => handleCreateResult(req, env, corsHdrs));
router.delete("/api/:v/results/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteResult(req, env, corsHdrs, params.id);
});

router.post("/api/:v/feed", (req, env, corsHdrs) => handleCreatePost(req, env, corsHdrs));
router.delete("/api/:v/feed/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeletePost(req, env, corsHdrs, params.id);
});

router.post("/api/:v/table", (req, env, corsHdrs) => handleUpdateTable(req, env, corsHdrs));
router.post("/api/:v/table/resign", (req, env, corsHdrs) => handleResignTeam(req, env, corsHdrs));
router.post("/api/:v/table/auto-calculate", (req, env, corsHdrs) => handleAutoCalculateTable(req, env, corsHdrs));
router.post("/api/:v/fixtures/auto-import", (req, env, corsHdrs) => handleAutoImportFixtures(req, env, corsHdrs));

// GOTM Voting Routes
import { handleStartGOTMVoting, handleGetGOTMVoting, handleCastGOTMVote, handleCloseGOTMVoting } from "./routes/gotm";
router.post("/api/:v/gotm/start", (req, env, corsHdrs) => handleStartGOTMVoting(req, env, corsHdrs));
router.get("/api/:v/gotm", (req, env, corsHdrs) => handleGetGOTMVoting(req, env, corsHdrs));
router.post("/api/:v/gotm/vote", (req, env, corsHdrs) => handleCastGOTMVote(req, env, corsHdrs));
router.post("/api/:v/gotm/close", (req, env, corsHdrs) => handleCloseGOTMVoting(req, env, corsHdrs));

// Calendar Routes
import { handleExportCalendarICS } from "./routes/calendar";
router.get("/api/:v/calendar/export", (req, env, corsHdrs) => handleExportCalendarICS(req, env, corsHdrs));

// Seasons Routes
import {
    handleListSeasons, handleCreateSeason, handleSetCurrentSeason,
    handleArchiveSeason, handleGetCurrentSeason, handleAddPlayerToSeason,
    handleGetSeasonRoster,
    // New season management endpoints
    handleEndSeasonPreview, handleEndSeason, handleReopenSeason,
    handleStartNewSeason, handleGetAvailablePlayers,
    handleGetSeasonAwards, handleAddSeasonAward, handleDeleteSeasonAward,
    handleGetSeasonSnapshots, handleMarkPlayerDeparted,
    handleGetSeasonStats
} from "./routes/seasons";

router.get("/api/:v/seasons", (req, env, corsHdrs) => handleListSeasons(req, env, corsHdrs));
router.post("/api/:v/seasons", (req, env, corsHdrs) => handleCreateSeason(req, env, corsHdrs));
router.post("/api/:v/seasons/start-new", (req, env, corsHdrs) => handleStartNewSeason(req, env, corsHdrs));
router.get("/api/:v/seasons/current", (req, env, corsHdrs) => handleGetCurrentSeason(req, env, corsHdrs));
router.post("/api/:v/seasons/set-current", (req, env, corsHdrs) => handleSetCurrentSeason(req, env, corsHdrs));
router.post("/api/:v/seasons/archive", (req, env, corsHdrs) => handleArchiveSeason(req, env, corsHdrs));
router.get("/api/:v/seasons/:id/stats", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetSeasonStats(req, env, corsHdrs, params.id);
});

// Season Lifecycle
router.get("/api/:v/seasons/:id/end-preview", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleEndSeasonPreview(req, env, corsHdrs, params.id);
});
router.post("/api/:v/seasons/:id/end", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleEndSeason(req, env, corsHdrs, params.id);
});
router.post("/api/:v/seasons/:id/reopen", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleReopenSeason(req, env, corsHdrs, params.id);
});

// Season Awards
router.get("/api/:v/seasons/:id/awards", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetSeasonAwards(req, env, corsHdrs, params.id);
});
router.post("/api/:v/seasons/:id/awards", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleAddSeasonAward(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/seasons/:id/awards/:awardId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteSeasonAward(req, env, corsHdrs, params.id, params.awardId);
});

// Roster
router.post("/api/:v/seasons/:id/roster", (req, env, corsHdrs) => handleAddPlayerToSeason(req, env, corsHdrs));
router.get("/api/:v/seasons/:id/roster", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetSeasonRoster(req, env, corsHdrs, params.id);
});

// New Season Management Routes
router.post("/api/:v/seasons/start-new", (req, env, corsHdrs) => handleStartNewSeason(req, env, corsHdrs));
router.get("/api/:v/seasons/available-players", (req, env, corsHdrs) => handleGetAvailablePlayers(req, env, corsHdrs));
router.post("/api/:v/seasons/player-departed", (req, env, corsHdrs) => handleMarkPlayerDeparted(req, env, corsHdrs));
router.get("/api/:v/seasons/:id/end-preview", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleEndSeasonPreview(req, env, corsHdrs, params.id);
});
router.post("/api/:v/seasons/:id/end", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleEndSeason(req, env, corsHdrs, params.id);
});
router.post("/api/:v/seasons/:id/reopen", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleReopenSeason(req, env, corsHdrs, params.id);
});
router.get("/api/:v/seasons/:id/awards", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetSeasonAwards(req, env, corsHdrs, params.id);
});
router.post("/api/:v/seasons/:id/awards", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleAddSeasonAward(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/seasons/:seasonId/awards/:awardId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteSeasonAward(req, env, corsHdrs, params.seasonId, params.awardId);
});
router.get("/api/:v/seasons/:id/snapshots", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetSeasonSnapshots(req, env, corsHdrs, params.id);
});

// Career Stats Routes
import { handleGetCareerStats, handleCompareCareerStats, handleGetAllTimeRecords } from "./routes/career-stats";
router.get("/api/:v/players/:id/career-stats", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetCareerStats(req, env, corsHdrs, params.id);
});
router.get("/api/:v/stats/compare", (req, env, corsHdrs) => handleCompareCareerStats(req, env, corsHdrs));
router.get("/api/:v/stats/records", (req, env, corsHdrs) => handleGetAllTimeRecords(req, env, corsHdrs));


// Fun Stats Routes
import { handleGetTeamFunStats, handleGetPlayerFunStats, handleGetSeasonSummary } from "./routes/fun-stats";
router.get("/api/:v/stats/fun", (req, env, corsHdrs) => handleGetTeamFunStats(req, env, corsHdrs));
router.get("/api/:v/stats/fun/player/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetPlayerFunStats(req, env, corsHdrs, params.id);
});
router.get("/api/:v/seasons/:id/summary", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetSeasonSummary(req, env, corsHdrs, params.id);
});

// Shop Routes
import { handleGetProducts, handleProductSync } from "./routes/shop/products";
import { handleCreateCart, handleGetCart, handleAddToCart, handleRemoveFromCart } from "./routes/shop/cart";
import { handleCreateCheckout as handleShopCheckout, handleStripeWebhook as handleShopWebhook } from "./routes/shop/checkout";

router.get("/api/:v/shop/products", (req, env, corsHdrs) => handleGetProducts(req, env, corsHdrs));
router.post("/api/:v/shop/sync", (req, env, corsHdrs) => handleProductSync(req, env, corsHdrs));

router.post("/api/:v/shop/cart", (req, env, corsHdrs) => handleCreateCart(req, env, corsHdrs));
router.get("/api/:v/shop/cart/:id", (req, env, corsHdrs) => handleGetCart(req, env, corsHdrs));
router.post("/api/:v/shop/cart/:id/items", (req, env, corsHdrs) => handleAddToCart(req, env, corsHdrs));
router.delete("/api/:v/shop/cart/:id/items", (req, env, corsHdrs) => handleRemoveFromCart(req, env, corsHdrs));

router.post("/api/:v/shop/checkout", (req, env, corsHdrs) => handleShopCheckout(req, env, corsHdrs));

// Dev Auth Routes (only in development)
router.post("/dev/admin-jwt", (req, env) => handleDevAdminJWT(req, env));
router.post("/dev/magic-link", (req, env) => handleDevMagicLink(req, env));
router.get("/dev/info", (req, env) => handleDevInfo(req, env));

// CSV Import Routes
router.post("/api/:v/import/fixtures", (req, env, corsHdrs) => handleImportFixtures(req, env, corsHdrs));
router.post("/api/:v/import/results", (req, env, corsHdrs) => handleImportResults(req, env, corsHdrs));
router.post("/api/:v/import/players", (req, env, corsHdrs) => handleImportPlayers(req, env, corsHdrs));
router.post("/api/:v/import/match-events", (req, env, corsHdrs) => handleImportMatchEvents(req, env, corsHdrs));
router.get("/api/:v/import/template/:type", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetImportTemplate(req, env, corsHdrs, params.type);
});
router.get("/api/:v/import/status", (req, env, corsHdrs) => handleGetImportStatus(req, env, corsHdrs));

// FA Sync Routes (Fixture data from FA Full-Time)
router.post("/api/:v/fixtures/sync/website", (req, env, corsHdrs) => handleSyncFromWebsite(req, env, corsHdrs));
router.post("/api/:v/fixtures/sync/snippet", (req, env, corsHdrs) => handleSyncFromSnippet(req, env, corsHdrs));
router.post("/api/:v/fixtures/sync/email", (req, env, corsHdrs) => handleParseEmail(req, env, corsHdrs));
router.post("/api/:v/fixtures/sync/all", (req, env, corsHdrs) => handleSyncAll(req, env, corsHdrs));
router.get("/api/:v/fixtures/fa-config", (req, env, corsHdrs) => handleGetFAConfig(req, env, corsHdrs));
router.put("/api/:v/fixtures/fa-config", (req, env, corsHdrs) => handleSetFAConfig(req, env, corsHdrs));
// Email webhook for Cloudflare Email Workers
router.post("/webhooks/fa-email", (req, env, corsHdrs) => handleEmailWebhook(req, env, corsHdrs));

// Season Scraper Configuration Routes
import {
    handleGetScraperConfigs,
    handleGetScraperConfig,
    handleSaveScraperConfig,
    handleDeleteScraperConfig,
    handleRunScraperForSeason
} from "./routes/scraper";
router.get("/api/:v/scraper/configs", (req, env, corsHdrs) => handleGetScraperConfigs(req, env, corsHdrs));
router.get("/api/:v/scraper/configs/:seasonId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetScraperConfig(req, env, corsHdrs, params.seasonId);
});
router.post("/api/:v/scraper/configs", (req, env, corsHdrs) => handleSaveScraperConfig(req, env, corsHdrs));
router.delete("/api/:v/scraper/configs/:seasonId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteScraperConfig(req, env, corsHdrs, params.seasonId);
});
router.post("/api/:v/scraper/run/:seasonId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleRunScraperForSeason(req, env, corsHdrs, params.seasonId);
});

// Seasons Management Routes
import { handleListSeasons, handleCreateSeason } from "./routes/seasons";
router.get("/api/:v/seasons", (req, env, corsHdrs) => handleListSeasons(req, env, corsHdrs));
router.post("/api/:v/seasons", (req, env, corsHdrs) => handleCreateSeason(req, env, corsHdrs));

// ===== WEARABLES / GPS TRACKING ROUTES =====

// Device Management
router.get("/api/:v/wearables/devices", (req, env, corsHdrs) => handleListDevices(req, env, corsHdrs));
router.post("/api/:v/wearables/devices", (req, env, corsHdrs) => handleCreateDevice(req, env, corsHdrs));
router.get("/api/:v/wearables/devices/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetDevice(req, env, corsHdrs, params.id);
});
router.put("/api/:v/wearables/devices/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleUpdateDevice(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/wearables/devices/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteDevice(req, env, corsHdrs, params.id);
});

// Sessions
router.get("/api/:v/wearables/sessions", (req, env, corsHdrs) => handleListWearableSessions(req, env, corsHdrs));
router.post("/api/:v/wearables/sessions", (req, env, corsHdrs) => handleCreateWearableSession(req, env, corsHdrs));
router.get("/api/:v/wearables/sessions/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetWearableSession(req, env, corsHdrs, params.id);
});
router.get("/api/:v/wearables/sessions/:id/gps-track", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetGPSTrack(req, env, corsHdrs, params.id);
});

// Data Sync & Manual Entry
router.post("/api/:v/wearables/sync", (req, env, corsHdrs) => handleSyncData(req, env, corsHdrs));
router.post("/api/:v/wearables/manual", (req, env, corsHdrs) => handleManualEntry(req, env, corsHdrs));
router.post("/api/:v/wearables/import", (req, env, corsHdrs) => handleImportData(req, env, corsHdrs));

// Metrics & Analytics
router.get("/api/:v/wearables/metrics/:playerId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetPlayerMetrics(req, env, corsHdrs, params.playerId);
});
router.get("/api/:v/wearables/summary/:playerId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetPlayerSummary(req, env, corsHdrs, params.playerId);
});
router.get("/api/:v/wearables/fatigue/:playerId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetFatigueAssessment(req, env, corsHdrs, params.playerId);
});

// Pitch Definitions
router.get("/api/:v/wearables/pitches", (req, env, corsHdrs) => handleListPitches(req, env, corsHdrs));
router.post("/api/:v/wearables/pitches", (req, env, corsHdrs) => handleCreatePitch(req, env, corsHdrs));

// Default 404
router.all("*", () => new Response("Not Found", { status: 404 }));

function mergeHeaders(base: Headers, extra?: HeadersInit) {
    const merged = new Headers(base);
    if (extra) {
        const addition = new Headers(extra);
        addition.forEach((value, key) => merged.set(key, value));
    }
    return merged;
}

function respondWithCors(res: Response, base: Headers) {
    const headers = mergeHeaders(base, res.headers);
    return new Response(res.body, withSecurity({ status: res.status, headers }));
}

export default {
    async fetch(req: Request, env: any, ctx: ExecutionContext): Promise<Response> {
        const requestId = newRequestId();
        const origin = req.headers.get("Origin");
        const corsHdrs = corsHeaders(origin, env);

        corsHdrs.set("Access-Control-Expose-Headers", "X-Request-Id, X-Release");
        corsHdrs.set("X-Request-Id", requestId);

        if (isPreflight(req)) {
            return new Response(null, withSecurity({ status: 204, headers: corsHdrs }));
        }

        try {
            const response = await router.handle(req, env, corsHdrs, requestId);
            if (response instanceof Response) {
                return respondWithCors(response, corsHdrs);
            }
            return respondWithCors(new Response("Internal Error", { status: 500 }), corsHdrs);
        } catch (err: any) {
            const errorResponse = errorHandler(err, env, requestId);
            return respondWithCors(errorResponse, corsHdrs);
        }
    },

    // Scheduled handler for cron jobs
    async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext): Promise<void> {
        const scheduledTime = new Date(event.scheduledTime);
        const hour = scheduledTime.getUTCHours();
        const minute = scheduledTime.getUTCMinutes();
        const dayOfWeek = scheduledTime.getUTCDay();
        const dayOfMonth = scheduledTime.getUTCDate();

        logJSON({ level: 'info', msg: 'Cron triggered', hour, minute, dayOfWeek, dayOfMonth });

        try {
            // Every 5 minutes: Cleanup expired data
            ctx.waitUntil(runCleanup(env, ctx));

            // 06:00 UTC: Birthdays and daily quotes
            if (hour === 6 && minute < 5) {
                ctx.waitUntil(runDaily(env, ctx));
            }

            // 08:00 UTC: Match day countdowns
            if (hour === 8 && minute < 5) {
                ctx.waitUntil(runDaily(env, ctx, { countdownsOnly: true }));
            }

            // Thursday 19:00 UTC: Throwback Thursday (photos + on this day)
            if (dayOfWeek === 4 && hour === 19 && minute < 5) {
                ctx.waitUntil(runThrowback(env, ctx));
            }

            // Sunday 18:00 UTC: Player of the Week
            if (dayOfWeek === 0 && hour === 18 && minute < 5) {
                ctx.waitUntil(runPlayerOfPeriod(env, ctx, { period: 'week' }));
            }

            // 1st of month, 10:00 UTC: Player of the Month
            if (dayOfMonth === 1 && hour === 10 && minute < 5) {
                ctx.waitUntil(runPlayerOfPeriod(env, ctx, { period: 'month' }));
            }

            // Saturday/Sunday 21:00 UTC: Check for player milestones
            if ((dayOfWeek === 0 || dayOfWeek === 6) && hour === 21 && minute < 5) {
                ctx.waitUntil(runMilestones(env, ctx));
            }

            // Every 6 hours: League table updates
            if (hour % 6 === 0 && minute < 5) {
                ctx.waitUntil(runLeague(env, ctx));
            }

            // 06:00 UTC: FA Full-Time Sync
            if (hour === 6 && minute < 5) {
                ctx.waitUntil(runFASync(env, ctx));
            }

        } catch (error) {
            logJSON({ level: 'error', msg: 'Cron error', error: error instanceof Error ? error.message : String(error) });
        }
    }
};
