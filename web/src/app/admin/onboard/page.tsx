'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, signupStart, signupBrand, signupStarterMake, signupProConfirm, getProvisionStatus } from '@/lib/api';

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clubName: '',
    clubSlug: '',
    contactEmail: '',
    contactName: '',
    plan: 'starter' as 'starter' | 'pro',
    primaryColor: '#6CC5FF',
    secondaryColor: '#9AA1AC',
    badgeFile: null as File | null,
    badgePreview: '',
    sheetsId: '',
    faSnippetUrl: '',
    makeWebhookUrl: '',
    webhookSecret: '',
    enableGallery: true,
    enableShop: false,
    enablePayments: false,
    enableHighlights: true,
  });
  const [jwt, setJwt] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<'idle' | 'polling' | 'completed' | 'failed'>('idle');
  const [step4Completed, setStep4Completed] = useState(false);
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
      setError('Session expired. Please start over.');
      setJwt(null);
      setTenantId(null);
      setStep(1);
      setCanRetry(false);
      return true;
    }
    return false;
  }

  const handleNext = async () => {
    if (isSubmitting) return;

    // Step 1 → Step 2: Create tenant via signupStart
    if (step === 1) {
      const clubName = formData.clubName.trim();
      const clubSlug = (formData.clubSlug || generateSlug(formData.clubName)).trim();
      const contactEmail = formData.contactEmail.trim();

      if (!clubName || !clubSlug || !contactEmail) {
        setError('Please complete all required fields (club name, slug, and email).');
        return;
      }

      setError(null);
      setStatus(null);
      setIsSubmitting(true);
      setCanRetry(false);

      try {
        const result = await signupStart({
          clubName,
          clubSlug,
          email: contactEmail,
          plan: formData.plan,
        });

        setJwt(result.jwt);
        setTenantId(result.tenant.id);
        setStatus('✓ Tenant created successfully!');
        setStep(2);
      } catch (err) {
        if (handleAuthError(err)) return;
        const message = err instanceof ApiError ? err.message : (err as Error)?.message || 'Failed to create tenant.';
        setError(message);
        setCanRetry(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Step 2 → Step 3: Set branding via signupBrand
    if (step === 2) {
      if (!jwt) {
        setError('Missing JWT. Please restart the signup process.');
        return;
      }

      setError(null);
      setIsSubmitting(true);
      setCanRetry(false);

      try {
        await signupBrand(jwt, {
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
        });

        setStatus('✓ Branding configured!');
        setStep(3);
      } catch (err) {
        if (handleAuthError(err)) return;
        const message = err instanceof ApiError ? err.message : (err as Error)?.message || 'Failed to set branding.';
        setError(message);
        setCanRetry(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Step 3 → Step 4: Just move forward (no API call yet)
    if (step === 3) {
      setStep(4);
      return;
    }
  };

  const handlePrev = () => {
    if (step > 1 && !isSubmitting && provisioningStatus !== 'polling') {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || provisioningStatus === 'polling') return;

    if (!jwt || !tenantId) {
      setError('Missing authentication. Please restart the signup process.');
      return;
    }

    // Idempotency check
    if (step4Completed) {
      setError('Signup already completed. Checking provisioning status...');
      setProvisioningStatus('polling');
      pollProvisioningStatus();
      return;
    }

    setError(null);
    setStatus(null);
    setIsSubmitting(true);
    setCanRetry(false);

    try {
      // Step 4: Complete signup based on plan
      if (formData.plan === 'starter') {
        // Require webhook URL for Starter plan
        if (!formData.makeWebhookUrl.trim()) {
          setError('Make.com webhook URL is required for Starter plan. Please fill it in Step 3.');
          setStep(3);
          setIsSubmitting(false);
          setCanRetry(false);
          return;
        }

        const webhookSecret = formData.webhookSecret.trim() || generateWebhookSecret();

        await signupStarterMake(jwt, {
          webhookUrl: formData.makeWebhookUrl.trim(),
          webhookSecret,
        });

        setStatus('✓ Webhook configured! Provisioning in background...');
      } else {
        // Pro plan
        await signupProConfirm(jwt);
        setStatus('✓ Pro plan confirmed! Provisioning in background...');
      }

      // Mark as completed
      setStep4Completed(true);

      // Start polling provisioning status
      setProvisioningStatus('polling');
      pollProvisioningStatus();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof ApiError ? err.message : (err as Error)?.message || 'Failed to complete signup.';
      setError(message);
      setCanRetry(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollProvisioningStatus = async () => {
    if (!jwt || !tenantId) return;

    // Prevent multiple polling loops
    if (isPollingRef.current) {
      console.log('Polling already in progress, skipping...');
      return;
    }

    isPollingRef.current = true;
    let attempts = 0;
    const maxAttempts = 40; // Poll for up to 2 minutes (40 * 3s)

    const poll = async () => {
      // Check if polling was cancelled
      if (!isPollingRef.current) {
        console.log('Polling cancelled');
        return;
      }

      try {
        const result = await getProvisionStatus(jwt!, tenantId!);

        if (result.status === 'completed') {
          isPollingRef.current = false;
          setProvisioningStatus('completed');
          setStatus('✓ Provisioning complete! Redirecting to your admin console...');
          setTimeout(() => {
            router.push(`/admin/${tenantId!}`);
          }, 2000);
          return;
        }

        if (result.status === 'failed') {
          isPollingRef.current = false;
          setProvisioningStatus('failed');
          setError(`Provisioning failed: ${result.error || 'Unknown error'}. Contact support if this persists.`);
          setCanRetry(false);
          return;
        }

        // Still processing
        attempts++;
        if (attempts < maxAttempts && isPollingRef.current) {
          setStatus(`⏳ Provisioning in progress... (${result.status})`);
          pollTimeoutRef.current = setTimeout(poll, 3000); // Poll every 3 seconds
        } else {
          isPollingRef.current = false;
          setProvisioningStatus('idle');
          setStatus('⏳ Provisioning is taking longer than expected. You can check status later in your admin console.');
          setTimeout(() => {
            router.push(`/admin/${tenantId!}`);
          }, 3000);
        }
      } catch (err) {
        if (handleAuthError(err)) {
          isPollingRef.current = false;
          return;
        }

        // Check if it's a network error (retryable)
        const isNetworkError = err instanceof TypeError || (err as any)?.message?.includes('fetch');

        if (isNetworkError && attempts < maxAttempts && isPollingRef.current) {
          // Retry on network errors
          setStatus(`⏳ Network issue, retrying... (attempt ${attempts + 1}/${maxAttempts})`);
          pollTimeoutRef.current = setTimeout(poll, 5000); // Longer delay on errors
          attempts++;
        } else {
          // Give up after too many failures
          isPollingRef.current = false;
          setProvisioningStatus('failed');
          setError('Failed to check provisioning status. Please check your admin console or contact support.');
          setCanRetry(true);
        }
      }
    };

    poll();
  };

  const generateWebhookSecret = (): string => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleBadgeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, badgeFile: file });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, badgePreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 'var(--spacing-2xl)' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-sm)' }}>Set Up Your Club</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Step {step} of 4: {step === 1 ? 'Club Details' : step === 2 ? 'Branding' : step === 3 ? 'Connections' : 'Features'}
          </p>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: 'var(--spacing-md)' }}>
            <div
              style={{
                width: `${(step / 4) * 100}%`,
                height: '100%',
                background: 'var(--brand)',
                borderRadius: '2px',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                marginBottom: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,0,0,0.06)',
                color: 'var(--error)',
              }}
            >
              <div>{error}</div>
              {canRetry && step === 1 && (
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  style={{
                    marginTop: 'var(--spacing-sm)',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    background: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  Retry
                </button>
              )}
              {canRetry && step === 2 && (
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  style={{
                    marginTop: 'var(--spacing-sm)',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    background: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  Retry
                </button>
              )}
              {canRetry && step === 4 && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || provisioningStatus === 'polling'}
                  style={{
                    marginTop: 'var(--spacing-sm)',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    background: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: (isSubmitting || provisioningStatus === 'polling') ? 'not-allowed' : 'pointer',
                    opacity: (isSubmitting || provisioningStatus === 'polling') ? 0.5 : 1,
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {status && !error && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginBottom: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0,128,0,0.08)',
                color: 'var(--success)',
              }}
            >
              {status}
            </div>
          )}

          {/* Step 1: Club Details */}
          {step === 1 && (
            <div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Club Details</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {/* Plan Selection */}
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                    Select Plan *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, plan: 'starter' })}
                      style={{
                        padding: 'var(--spacing-md)',
                        border: formData.plan === 'starter' ? '2px solid var(--brand)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        background: formData.plan === 'starter' ? 'var(--bg)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Starter Plan</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Use Make.com for automation
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, plan: 'pro' })}
                      style={{
                        padding: 'var(--spacing-md)',
                        border: formData.plan === 'pro' ? '2px solid var(--brand)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        background: formData.plan === 'pro' ? 'var(--bg)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Pro Plan</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Full automation with Google Sheets
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
                    Club Name *
                  </label>
                  <input
                    type="text"
                    value={formData.clubName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({ ...formData, clubName: name, clubSlug: generateSlug(name) });
                    }}
                    placeholder="e.g., Syston Tigers U16"
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-sm)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
                    Club Slug *
                    <span style={{ fontWeight: '400', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {' '}
                      (your unique URL: yoursite.com/{formData.clubSlug || 'club-name'})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.clubSlug}
                    onChange={(e) => setFormData({ ...formData, clubSlug: generateSlug(e.target.value) })}
                    placeholder="syston-tigers"
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-sm)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Danny Clayton"
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-sm)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="danny@systontigers.co.uk"
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-sm)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Branding */}
          {step === 2 && (
            <div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Branding</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                {/* Badge Upload */}
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                    Club Badge
                  </label>
                  <div
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--spacing-xl)',
                      textAlign: 'center',
                    }}
                  >
                    {formData.badgePreview ? (
                      <div>
                        <img
                          src={formData.badgePreview}
                          alt="Club badge"
                          style={{ maxWidth: '200px', maxHeight: '200px', marginBottom: 'var(--spacing-md)' }}
                        />
                        <br />
                        <button
                          onClick={() => setFormData({ ...formData, badgeFile: null, badgePreview: '' })}
                          className="btn btn-outline"
                          style={{ marginTop: 'var(--spacing-sm)' }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ marginBottom: 'var(--spacing-sm)' }}>Click to upload club badge</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBadgeUpload}
                          style={{ display: 'none' }}
                          id="badge-upload"
                        />
                        <label htmlFor="badge-upload" className="btn btn-primary" style={{ cursor: 'pointer' }}>
                          Choose File
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Color Pickers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                      Primary Color
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        style={{ width: '60px', height: '60px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        style={{
                          flex: 1,
                          padding: 'var(--spacing-sm)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1rem',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                      Secondary Color
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                        style={{ width: '60px', height: '60px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                        style={{
                          flex: 1,
                          padding: 'var(--spacing-sm)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1rem',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ padding: 'var(--spacing-lg)', background: formData.primaryColor, borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <h3 style={{ color: '#000', marginBottom: 'var(--spacing-sm)' }}>Preview</h3>
                  <button
                    className="btn"
                    style={{ background: formData.secondaryColor, color: '#fff', border: 'none' }}
                  >
                    Sample Button
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Plan-Specific Configuration */}
          {step === 3 && (
            <div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                {formData.plan === 'starter' ? 'Configure Make.com Webhook' : 'Pro Plan Setup'}
              </h2>

              {formData.plan === 'starter' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div
                    style={{
                      padding: 'var(--spacing-md)',
                      background: 'rgba(var(--brand-rgb), 0.08)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--spacing-md)',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <strong>Starter Plan:</strong> Connect your Make.com webhook to automate content posting.
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
                      Make.com Webhook URL *
                    </label>
                    <input
                      type="url"
                      value={formData.makeWebhookUrl}
                      onChange={(e) => setFormData({ ...formData, makeWebhookUrl: e.target.value })}
                      placeholder="https://hook.us1.make.com/..."
                      required
                      style={{
                        width: '100%',
                        padding: 'var(--spacing-sm)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                      }}
                    />
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                      Get this from your Make.com scenario webhook trigger
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
                      Webhook Secret
                      <span style={{ fontWeight: '400', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {' '}
                        (optional - will generate if empty)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.webhookSecret}
                      onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                      placeholder="Leave empty to auto-generate"
                      style={{
                        width: '100%',
                        padding: 'var(--spacing-sm)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div
                    style={{
                      padding: 'var(--spacing-lg)',
                      background: 'var(--bg)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)' }}>✓ Automatic Provisioning</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                      Your Pro plan includes:
                    </p>
                    <ul style={{ color: 'var(--text-muted)', paddingLeft: 'var(--spacing-lg)' }}>
                      <li>Automatic Google Sheets creation</li>
                      <li>Pre-configured Apps Script automation</li>
                      <li>Team management spreadsheet</li>
                      <li>Content automation workflows</li>
                    </ul>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                      Everything will be set up automatically after you complete signup.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Features */}
          {step === 4 && (
            <div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Enable Features</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {[
                  { key: 'enableGallery', label: 'Photo Gallery', desc: 'Upload and share match photos' },
                  { key: 'enableShop', label: 'Team Shop', desc: 'Sell merchandise via Printify' },
                  { key: 'enablePayments', label: 'Payments', desc: 'Collect fees and subscriptions' },
                  { key: 'enableHighlights', label: 'Video Highlights', desc: 'YouTube integration for match videos' },
                ].map((feature) => (
                  <label
                    key={feature.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 'var(--spacing-md)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: formData[feature.key as keyof typeof formData] ? 'var(--bg)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData[feature.key as keyof typeof formData] as boolean}
                      onChange={(e) => setFormData({ ...formData, [feature.key]: e.target.checked })}
                      style={{ marginRight: 'var(--spacing-md)', width: '20px', height: '20px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{feature.label}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{feature.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--border)' }}>
            <button onClick={handlePrev} disabled={step === 1 || isSubmitting} className="btn btn-outline">
              Previous
            </button>

            {step < 4 ? (
              <button onClick={handleNext} className="btn btn-primary" disabled={isSubmitting}>
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create Club'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
