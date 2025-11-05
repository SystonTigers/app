"use client";

import { useState, useRef, useEffect } from "react";
import { signupStart, signupBrand, signupStarterMake, signupProConfirm, getProvisionStatus, ApiError } from "@/lib/api";

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
    plan: "starter" as "starter" | "pro"
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
        plan: form.plan
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold">Get Started</h1>
      <p className="text-sm text-neutral-600">
        Create your club in 3 easy steps. We'll automatically provision your workspace with all the tools you need.
      </p>

      {/* Step Indicator */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded ${
              s === step ? "bg-black" : s < step ? "bg-green-600" : "bg-neutral-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <>
          <div className="mb-4">
            <p className="text-sm font-semibold mb-2">Select Plan</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, plan: "starter" })}
                className={`p-3 rounded border-2 text-left ${
                  form.plan === "starter" ? "border-black bg-neutral-50" : "border-neutral-200"
                }`}
              >
                <div className="font-semibold">Starter</div>
                <div className="text-xs text-neutral-600">Use Make.com</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, plan: "pro" })}
                className={`p-3 rounded border-2 text-left ${
                  form.plan === "pro" ? "border-black bg-neutral-50" : "border-neutral-200"
                }`}
              >
                <div className="font-semibold">Pro</div>
                <div className="text-xs text-neutral-600">Full automation</div>
              </button>
            </div>
          </div>

          <input
            placeholder="Club name *"
            value={form.teamName}
            onChange={(e) => setForm({ ...form, teamName: e.target.value })}
            className="w-full rounded border p-2"
            required
          />
          <input
            placeholder="Tenant ID (slug) *"
            value={form.tenantId}
            onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            className="w-full rounded border p-2"
            required
          />
          <input
            placeholder="Contact Email *"
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="w-full rounded border p-2"
            required
          />
          <button
            onClick={handleStep1Submit}
            disabled={submitting}
            className="rounded bg-black px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Next: Branding"}
          </button>
        </>
      )}

      {/* Step 2: Branding */}
      {step === 2 && (
        <>
          <p className="text-sm text-neutral-600 mb-2">Configure your club colors</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-neutral-600 mb-1 block">Primary Color</label>
              <input
                type="color"
                value={form.primary}
                onChange={(e) => setForm({ ...form, primary: e.target.value })}
                className="w-full h-12 rounded border"
              />
              <input
                type="text"
                value={form.primary}
                onChange={(e) => setForm({ ...form, primary: e.target.value })}
                className="w-full rounded border p-1 mt-1 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-neutral-600 mb-1 block">Secondary Color</label>
              <input
                type="color"
                value={form.secondary}
                onChange={(e) => setForm({ ...form, secondary: e.target.value })}
                className="w-full h-12 rounded border"
              />
              <input
                type="text"
                value={form.secondary}
                onChange={(e) => setForm({ ...form, secondary: e.target.value })}
                className="w-full rounded border p-1 mt-1 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              disabled={submitting}
              className="flex-1 rounded bg-neutral-200 px-4 py-2 font-semibold disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleStep2Submit}
              disabled={submitting}
              className="flex-1 rounded bg-black px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : `Next: ${form.plan === "starter" ? "Webhook" : "Finish"}`}
            </button>
          </div>
        </>
      )}

      {/* Step 3: Plan-Specific Config */}
      {step === 3 && (
        <>
          {form.plan === "starter" ? (
            <>
              <p className="text-sm text-neutral-600 mb-2">Configure Make.com webhook for automation</p>
              <input
                placeholder="Make.com Webhook URL *"
                type="url"
                value={form.makeWebhookUrl}
                onChange={(e) => setForm({ ...form, makeWebhookUrl: e.target.value })}
                className="w-full rounded border p-2"
                required
              />
              <input
                placeholder="Webhook Secret (optional - will auto-generate)"
                value={form.webhookSecret}
                onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                className="w-full rounded border p-2"
              />
            </>
          ) : (
            <div className="p-4 bg-neutral-50 rounded border">
              <h3 className="font-semibold mb-2">✓ Automatic Provisioning</h3>
              <p className="text-sm text-neutral-600 mb-2">Your Pro plan includes:</p>
              <ul className="text-sm text-neutral-600 list-disc pl-5 space-y-1">
                <li>Automatic Google Sheets creation</li>
                <li>Pre-configured Apps Script automation</li>
                <li>Team management spreadsheet</li>
                <li>Content automation workflows</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              disabled={submitting || provisioningStatus === "polling"}
              className="flex-1 rounded bg-neutral-200 px-4 py-2 font-semibold disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleStep3Submit}
              disabled={submitting || provisioningStatus === "polling"}
              className="flex-1 rounded bg-black px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Completing..." : provisioningStatus === "polling" ? "Provisioning..." : "Complete Setup"}
            </button>
          </div>
        </>
      )}

      {/* Status Messages */}
      {status && !error && (
        <div role="status" aria-live="polite" className="text-sm text-green-600 font-medium">
          {status}
        </div>
      )}
      {error && (
        <div role="alert" className="text-sm text-red-600">
          {error}
          {canRetry && step === 1 && (
            <button
              onClick={handleStep1Submit}
              disabled={submitting}
              className="ml-2 underline hover:no-underline disabled:opacity-50"
            >
              Retry
            </button>
          )}
          {canRetry && step === 2 && (
            <button
              onClick={handleStep2Submit}
              disabled={submitting}
              className="ml-2 underline hover:no-underline disabled:opacity-50"
            >
              Retry
            </button>
          )}
          {canRetry && step === 3 && (
            <button
              onClick={handleStep3Submit}
              disabled={submitting || provisioningStatus === "polling"}
              className="ml-2 underline hover:no-underline disabled:opacity-50"
            >
              Retry
            </button>
          )}
        </div>
      )}
      {result && provisioningStatus === "completed" && (
        <div className="rounded bg-green-50 border border-green-200 p-3" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-green-800">✓ Success!</p>
          <p className="text-xs text-green-700 mt-1">Your club is ready to use.</p>
        </div>
      )}
    </div>
  );
}
