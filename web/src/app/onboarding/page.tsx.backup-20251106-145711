"use client";

import { useState, useRef, useEffect } from "react";
import { signupStart, signupBrand, signupStarterMake, signupProConfirm, getProvisionStatus, ApiError } from "@/lib/api";

interface PromoData {
  code: string;
  discountPercent: number;
  lifetime: boolean;
  usesRemaining: number | null;
  appliedPlan?: string | null;  // Plan override from promo code
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1); // 1: basic info, 2: branding, 3: plan-specific
  const [form, setForm] = useState({
    teamName: "",
    tenantId: "",
    primary: "#FFD400",
    secondary: "#111111",
    badgeUrl: "",
    contactEmail: "",
    makeWebhookUrl: "",
    webhookSecret: "",
    youtubeChannelId: "",
    plan: "starter" as "starter" | "pro",
    promoCode: ""
  });
  const [jwt, setJwt] = useState<string | null>(null);
  const [tenantDbId, setTenantDbId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<"idle" | "polling" | "completed" | "failed">("idle");
  const [step3Completed, setStep3Completed] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [promoData, setPromoData] = useState<PromoData | null>(null);
  const [verifyingPromo, setVerifyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Refs for polling control
  const isPollingRef = useRef(false);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isPollingRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof ApiError && err.status === 401) {
      setError("Session expired. Please start over.");
      setJwt(null);
      setTenantDbId(null);
      setStep(1);
      setCanRetry(false);
      return true;
    }
    return false;
  }

  async function handleVerifyPromo() {
    const code = form.promoCode.trim();
    if (!code) {
      setPromoError("Please enter a promo code");
      return;
    }

    // Check if tenantId is filled for whitelist validation
    const slug = form.tenantId.trim();

    setVerifyingPromo(true);
    setPromoError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/signup/verify-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoCode: code,
          tenantSlug: slug || undefined  // Pass tenant slug for whitelist validation
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error?.message || 'Invalid promo code';
        setPromoError(errorMsg);
        setPromoData(null);
        return;
      }

      // Update promo data with new fields (appliedPlan, lifetime)
      setPromoData(data.data);
      setPromoError(null);

      // If promo has a plan override, update the form plan
      if (data.data.appliedPlan) {
        setForm({ ...form, plan: data.data.appliedPlan });
      }
    } catch (err) {
      setPromoError('Failed to verify promo code');
      setPromoData(null);
    } finally {
      setVerifyingPromo(false);
    }
  }

  function clearPromo() {
    setPromoData(null);
    setPromoError(null);
    setForm({ ...form, promoCode: "" });
  }

  async function handleStep1Submit() {
    if (!form.teamName.trim() || !form.tenantId.trim() || !form.contactEmail.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatus(null);
    setCanRetry(false);

    try {
      const res = await signupStart({
        clubName: form.teamName.trim(),
        clubSlug: form.tenantId.trim().toLowerCase(),
        email: form.contactEmail.trim(),
        plan: form.plan,
        promoCode: promoData?.code // Use validated promo code
      });

      setJwt(res.jwt);
      setTenantDbId(res.tenant.id);
      setStatus("✓ Tenant created! Moving to branding...");
      setStep(2);
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof ApiError ? err.message : (err as Error)?.message || "Failed to create tenant";
      setError(message);
      setCanRetry(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStep2Submit() {
    if (!jwt) {
      setError("Missing authentication. Please restart.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setCanRetry(false);

    try {
      await signupBrand(jwt, {
        primaryColor: form.primary,
        secondaryColor: form.secondary
      });

      setStatus("✓ Branding configured!");
      setStep(3);
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof ApiError ? err.message : (err as Error)?.message || "Failed to set branding";
      setError(message);
      setCanRetry(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStep3Submit() {
    if (!jwt || !tenantDbId) {
      setError("Missing authentication. Please restart.");
      return;
    }

    // Idempotency check
    if (step3Completed) {
      setError("Signup already completed. Checking provisioning status...");
      setProvisioningStatus("polling");
      pollProvisioningStatus();
      return;
    }

    setSubmitting(true);
    setError(null);
    setCanRetry(false);

    try {
      if (form.plan === "starter") {
        if (!form.makeWebhookUrl.trim()) {
          setError("Make.com webhook URL is required for Starter plan");
          setSubmitting(false);
          setCanRetry(false);
          return;
        }

        const webhookSecret = form.webhookSecret.trim() || generateWebhookSecret();

        await signupStarterMake(jwt, {
          webhookUrl: form.makeWebhookUrl.trim(),
          webhookSecret
        });

        setStatus("✓ Webhook configured! Provisioning in background...");
      } else {
        await signupProConfirm(jwt);
        setStatus("✓ Pro plan confirmed! Provisioning in background...");
      }

      setStep3Completed(true);
      setProvisioningStatus("polling");
      pollProvisioningStatus();
      setResult({ success: true, message: "Provisioning started!" });
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof ApiError ? err.message : (err as Error)?.message || "Failed to complete signup";
      setError(message);
      setCanRetry(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function pollProvisioningStatus() {
    if (!jwt || !tenantDbId) return;

    // Prevent multiple polling loops
    if (isPollingRef.current) {
      console.log("Polling already in progress, skipping...");
      return;
    }

    isPollingRef.current = true;
    let attempts = 0;
    const maxAttempts = 40;

    const poll = async () => {
      // Check if polling was cancelled
      if (!isPollingRef.current) {
        console.log("Polling cancelled");
        return;
      }

      try {
        const res = await getProvisionStatus(jwt!, tenantDbId!);

        if (res.status === "completed") {
          isPollingRef.current = false;
          setProvisioningStatus("completed");
          setStatus("✓ Provisioning complete! Your club is ready.");
          setResult({ success: true, message: "Your club is ready!", tenant: { id: tenantDbId! } });
          return;
        }

        if (res.status === "failed") {
          isPollingRef.current = false;
          setProvisioningStatus("failed");
          setError(`Provisioning failed: ${res.error || "Unknown error"}. Contact support if this persists.`);
          setCanRetry(false);
          return;
        }

        // Still processing
        attempts++;
        if (attempts < maxAttempts && isPollingRef.current) {
          setStatus(`⏳ Provisioning in progress... (${res.status})`);
          pollTimeoutRef.current = setTimeout(poll, 3000);
        } else {
          isPollingRef.current = false;
          setProvisioningStatus("idle");
          setStatus("⏳ Provisioning is taking longer than expected. Check back in your admin console.");
        }
      } catch (err) {
        if (handleAuthError(err)) {
          isPollingRef.current = false;
          return;
        }

        // Check if it's a network error (retryable)
        const isNetworkError = err instanceof TypeError || (err as any)?.message?.includes("fetch");

        if (isNetworkError && attempts < maxAttempts && isPollingRef.current) {
          // Retry on network errors
          setStatus(`⏳ Network issue, retrying... (attempt ${attempts + 1}/${maxAttempts})`);
          pollTimeoutRef.current = setTimeout(poll, 5000); // Longer delay on errors
          attempts++;
        } else {
          // Give up after too many failures
          isPollingRef.current = false;
          setProvisioningStatus("failed");
          setError("Failed to check provisioning status. Please refresh the page or check your admin console.");
          setCanRetry(true);
        }
      }
    };

    poll();
  }

  function generateWebhookSecret(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-4" style={{ fontSize: '3rem', fontWeight: 800 }}>
            Launch Your Club Platform
          </h1>
          <p className="text-xl text-gray-300">
            Choose your plan and get started in minutes
          </p>
        </header>

        {/* Step Indicator */}
        <div className="flex gap-3 mb-12">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-3 rounded-full transition-colors ${
                s === step ? "bg-yellow-400" : s < step ? "bg-yellow-600" : "bg-gray-700"
              }`}
              role="progressbar"
              aria-valuenow={s}
              aria-valuemin={1}
              aria-valuemax={3}
              aria-label={`Step ${s} of 3`}
            />
          ))}
        </div>

        {/* Step 1: Plan Selection & Basic Info */}
        {step === 1 && (
          <div className="space-y-8">
            {/* Promo Code Section */}
            <div className="bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-800">
              <h2 className="text-2xl font-bold mb-4">Have a Promo Code?</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={form.promoCode}
                  onChange={(e) => setForm({ ...form, promoCode: e.target.value.toUpperCase() })}
                  disabled={!!promoData}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                  aria-label="Promo code input"
                />
                {!promoData ? (
                  <button
                    type="button"
                    onClick={handleVerifyPromo}
                    disabled={verifyingPromo || !form.promoCode.trim()}
                    className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Apply promo code"
                  >
                    {verifyingPromo ? "Checking..." : "Apply"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={clearPromo}
                    className="px-6 py-3 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors"
                    aria-label="Remove promo code"
                  >
                    Remove
                  </button>
                )}
              </div>
              {promoError && (
                <p className="mt-3 text-red-400 text-sm" role="alert">{promoError}</p>
              )}
              {promoData && (
                <div className="mt-4 p-4 bg-green-900 border border-green-700 rounded-xl">
                  <p className="text-green-100 font-semibold">
                    ✓ {promoData.code} applied: {promoData.discountPercent}% off
                    {promoData.lifetime && " (Lifetime access)"}
                  </p>
                  {promoData.usesRemaining && (
                    <p className="text-green-300 text-sm mt-1">{promoData.usesRemaining} uses remaining</p>
                  )}
                </div>
              )}
            </div>

            {/* Plan Selection */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Select Your Plan</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Starter Plan */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, plan: "starter" })}
                  className={`p-8 rounded-2xl text-left transition-all shadow-xl border-2 ${
                    form.plan === "starter"
                      ? "bg-yellow-400 border-yellow-400 text-black"
                      : "bg-gray-900 border-gray-800 text-white hover:border-gray-700"
                  }`}
                  aria-pressed={form.plan === "starter"}
                  aria-label="Select Starter plan"
                >
                  <h3 className={`text-2xl font-bold mb-3 ${form.plan === "starter" ? "text-black" : "text-white"}`}>
                    Starter
                  </h3>
                  <p className={`text-lg mb-6 ${form.plan === "starter" ? "text-black" : "text-gray-300"}`}>
                    Perfect for getting started with Make.com integration
                  </p>
                  <ul className={`space-y-2 text-sm ${form.plan === "starter" ? "text-black" : "text-gray-400"}`}>
                    <li>✓ Custom branding</li>
                    <li>✓ Make.com webhooks</li>
                    <li>✓ Team management</li>
                    <li>✓ Content feeds</li>
                  </ul>
                </button>

                {/* Pro Plan */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, plan: "pro" })}
                  className={`p-8 rounded-2xl text-left transition-all shadow-xl border-2 ${
                    form.plan === "pro"
                      ? "bg-yellow-400 border-yellow-400 text-black"
                      : "bg-gray-900 border-gray-800 text-white hover:border-gray-700"
                  }`}
                  aria-pressed={form.plan === "pro"}
                  aria-label="Select Pro plan"
                >
                  <h3 className={`text-2xl font-bold mb-3 ${form.plan === "pro" ? "text-black" : "text-white"}`}>
                    Pro
                  </h3>
                  <p className={`text-lg mb-6 ${form.plan === "pro" ? "text-black" : "text-gray-300"}`}>
                    Full automation with Google Sheets and Apps Script
                  </p>
                  <ul className={`space-y-2 text-sm ${form.plan === "pro" ? "text-black" : "text-gray-400"}`}>
                    <li>✓ Everything in Starter</li>
                    <li>✓ Auto Google Sheets setup</li>
                    <li>✓ Apps Script automation</li>
                    <li>✓ Advanced workflows</li>
                  </ul>
                </button>
              </div>
            </div>

            {/* Basic Info Form */}
            <div className="bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800 space-y-6">
              <h2 className="text-2xl font-bold mb-4">Club Details</h2>

              <div>
                <label htmlFor="teamName" className="block text-sm font-semibold mb-2 text-gray-300">
                  Club Name *
                </label>
                <input
                  id="teamName"
                  type="text"
                  placeholder="Syston Town Tigers"
                  value={form.teamName}
                  onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="tenantId" className="block text-sm font-semibold mb-2 text-gray-300">
                  Club Slug * <span className="text-gray-500 font-normal">(letters, numbers, hyphens only)</span>
                </label>
                <input
                  id="tenantId"
                  type="text"
                  placeholder="syston-tigers"
                  value={form.tenantId}
                  onChange={(e) => setForm({ ...form, tenantId: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                  aria-required="true"
                  pattern="[a-z0-9-]+"
                />
              </div>

              <div>
                <label htmlFor="contactEmail" className="block text-sm font-semibold mb-2 text-gray-300">
                  Contact Email *
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  placeholder="admin@systontigers.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                  aria-required="true"
                />
              </div>

              <button
                onClick={handleStep1Submit}
                disabled={submitting}
                className="w-full py-4 bg-yellow-400 text-black font-bold text-lg rounded-xl hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Continue to branding"
              >
                {submitting ? "Creating Your Club..." : "Continue to Branding"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Branding */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">Customize Your Brand Colors</h2>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label htmlFor="primaryColor" className="block text-sm font-semibold mb-3 text-gray-300">
                    Primary Color
                  </label>
                  <input
                    id="primaryColor"
                    type="color"
                    value={form.primary}
                    onChange={(e) => setForm({ ...form, primary: e.target.value })}
                    className="w-full h-16 rounded-xl border-2 border-gray-700 cursor-pointer"
                    aria-label="Select primary color"
                  />
                  <input
                    type="text"
                    value={form.primary}
                    onChange={(e) => setForm({ ...form, primary: e.target.value })}
                    className="w-full mt-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    aria-label="Primary color hex code"
                  />
                </div>

                <div>
                  <label htmlFor="secondaryColor" className="block text-sm font-semibold mb-3 text-gray-300">
                    Secondary Color
                  </label>
                  <input
                    id="secondaryColor"
                    type="color"
                    value={form.secondary}
                    onChange={(e) => setForm({ ...form, secondary: e.target.value })}
                    className="w-full h-16 rounded-xl border-2 border-gray-700 cursor-pointer"
                    aria-label="Select secondary color"
                  />
                  <input
                    type="text"
                    value={form.secondary}
                    onChange={(e) => setForm({ ...form, secondary: e.target.value })}
                    className="w-full mt-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    aria-label="Secondary color hex code"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="flex-1 py-4 bg-gray-700 text-white font-bold text-lg rounded-xl hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Go back to plan selection"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Submit}
                  disabled={submitting}
                  className="flex-1 py-4 bg-yellow-400 text-black font-bold text-lg rounded-xl hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label={`Continue to ${form.plan === "starter" ? "webhook configuration" : "finish setup"}`}
                >
                  {submitting ? "Saving..." : `Next: ${form.plan === "starter" ? "Webhook" : "Finish"}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Plan-Specific Config */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800">
              {form.plan === "starter" ? (
                <>
                  <h2 className="text-2xl font-bold mb-6">Configure Make.com Webhook</h2>

                  <div className="space-y-6 mb-8">
                    <div>
                      <label htmlFor="makeWebhookUrl" className="block text-sm font-semibold mb-2 text-gray-300">
                        Make.com Webhook URL *
                      </label>
                      <input
                        id="makeWebhookUrl"
                        type="url"
                        placeholder="https://hook.make.com/..."
                        value={form.makeWebhookUrl}
                        onChange={(e) => setForm({ ...form, makeWebhookUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        required
                        aria-required="true"
                      />
                    </div>

                    <div>
                      <label htmlFor="webhookSecret" className="block text-sm font-semibold mb-2 text-gray-300">
                        Webhook Secret <span className="text-gray-500 font-normal">(optional - auto-generated)</span>
                      </label>
                      <input
                        id="webhookSecret"
                        type="text"
                        placeholder="Will be auto-generated if not provided"
                        value={form.webhookSecret}
                        onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-6">Ready to Launch</h2>
                  <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 mb-8">
                    <h3 className="text-xl font-bold mb-4 text-yellow-400">✓ Automatic Provisioning Included</h3>
                    <p className="text-gray-300 mb-4">Your Pro plan includes:</p>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-start">
                        <span className="text-yellow-400 mr-2">✓</span>
                        Automatic Google Sheets creation and setup
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-400 mr-2">✓</span>
                        Pre-configured Apps Script automation workflows
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-400 mr-2">✓</span>
                        Team management and content automation
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-400 mr-2">✓</span>
                        Full integration ready in minutes
                      </li>
                    </ul>
                  </div>
                </>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={submitting || provisioningStatus === "polling"}
                  className="flex-1 py-4 bg-gray-700 text-white font-bold text-lg rounded-xl hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Go back to branding"
                >
                  Back
                </button>
                <button
                  onClick={handleStep3Submit}
                  disabled={submitting || provisioningStatus === "polling"}
                  className="flex-1 py-4 bg-yellow-400 text-black font-bold text-lg rounded-xl hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Complete setup and launch"
                >
                  {submitting ? "Launching..." : provisioningStatus === "polling" ? "Provisioning..." : "Launch My Club"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {status && !error && (
          <div role="status" aria-live="polite" className="mt-6 p-4 bg-green-900 border border-green-700 rounded-xl text-green-100">
            {status}
          </div>
        )}
        {error && (
          <div role="alert" className="mt-6 p-4 bg-red-900 border border-red-700 rounded-xl text-red-100">
            {error}
            {canRetry && (
              <button
                onClick={step === 1 ? handleStep1Submit : step === 2 ? handleStep2Submit : handleStep3Submit}
                disabled={submitting || provisioningStatus === "polling"}
                className="ml-3 underline hover:no-underline disabled:opacity-50"
                aria-label="Retry action"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {result && provisioningStatus === "completed" && (
          <div className="mt-6 p-6 bg-green-900 border border-green-700 rounded-xl" role="status" aria-live="polite">
            <p className="text-xl font-bold text-green-100 mb-2">✓ Success!</p>
            <p className="text-green-200">Your club is ready to use. Check your email for the magic link to access your admin console.</p>
          </div>
        )}
      </div>
    </div>
  );
}
