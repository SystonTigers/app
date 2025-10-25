'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clubName: '',
    clubSlug: '',
    contactEmail: '',
    contactName: '',
    primaryColor: '#6CC5FF',
    secondaryColor: '#9AA1AC',
    badgeFile: null as File | null,
    badgePreview: '',
    sheetsId: '',
    faSnippetUrl: '',
    makeWebhookUrl: '',
    enableGallery: true,
    enableShop: false,
    enablePayments: false,
    enableHighlights: true,
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      // TODO: Call API to create tenant
      console.log('Creating tenant with data:', formData);

      // For now, just redirect to the new tenant
      router.push(`/${formData.clubSlug}`);
    } catch (error) {
      console.error('Failed to create tenant:', error);
      alert('Failed to create club. Please try again.');
    }
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
          {/* Step 1: Club Details */}
          {step === 1 && (
            <div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Club Details</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
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

          {/* Step 3: Connections */}
          {step === 3 && (
            <div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Connect Data Sources</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
                    Google Sheets ID
                    <span style={{ fontWeight: '400', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {' '}
                      (optional - for fixtures sync)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.sheetsId}
                    onChange={(e) => setFormData({ ...formData, sheetsId: e.target.value })}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
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
                    FA Snippet URL
                    <span style={{ fontWeight: '400', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {' '}
                      (optional - for fixtures import)
                    </span>
                  </label>
                  <input
                    type="url"
                    value={formData.faSnippetUrl}
                    onChange={(e) => setFormData({ ...formData, faSnippetUrl: e.target.value })}
                    placeholder="https://fulltime.thefa.com/..."
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
                    Make.com Webhook URL
                    <span style={{ fontWeight: '400', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {' '}
                      (optional - for social posts)
                    </span>
                  </label>
                  <input
                    type="url"
                    value={formData.makeWebhookUrl}
                    onChange={(e) => setFormData({ ...formData, makeWebhookUrl: e.target.value })}
                    placeholder="https://hook.us1.make.com/..."
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
            <button onClick={handlePrev} disabled={step === 1} className="btn btn-outline">
              Previous
            </button>

            {step < 4 ? (
              <button onClick={handleNext} className="btn btn-primary">
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn btn-primary">
                Create Club
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
