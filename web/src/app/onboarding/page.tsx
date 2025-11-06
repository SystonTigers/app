"use client";

import React, { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL!;

const box: React.CSSProperties = {
  background: "#0b0b0b",
  color: "#efefef",
  minHeight: "100vh",
  padding: "32px",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
};

const heading: React.CSSProperties = {
  fontSize: "44px",
  fontWeight: 900,
  marginBottom: "8px",
};

const sub: React.CSSProperties = {
  opacity: 0.8,
  marginBottom: "24px",
};

const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const cardWrap: React.CSSProperties = { display: "flex", gap: 12, marginBottom: 16 };
const cardBase: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid #2a2a2a",
  padding: "14px 16px",
  width: 180,
  cursor: "pointer",
  background: "#121212",
  color: "#efefef",
};
const cardSelected: React.CSSProperties = {
  ...cardBase,
  background: "#FFD400",
  color: "#000",
  fontWeight: 800,
  boxShadow: "0 8px 24px rgba(255,212,0,0.25)",
};

const input: React.CSSProperties = {
  background: "#111",
  border: "1px solid #2a2a2a",
  color: "#efefef",
  borderRadius: 10,
  padding: "10px 12px",
  minWidth: 240,
};

const btnPrimary: React.CSSProperties = {
  background: "#FFD400",
  color: "#000",
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
  marginLeft: 8,
  background: "#0f5132",
  color: "#d1fae5",
  border: "1px solid #14532d",
};

export default function OnboardingPage() {
  console.log("Onboarding PAGE LOADED"); // sanity that this file is used

  const [plan, setPlan] = useState<"starter" | "pro">("starter");
  const [clubName, setClubName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState<null | { ok: boolean; text: string; lifetime?: boolean; appliedPlan?: string }>(null);

  async function verifyPromo() {
    setPromoMsg(null);
    if (!promo) return;
    try {
      const r = await fetch(`${API}/public/signup/verify-promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoCode: promo, plan, tenantSlug: slug }),
      });
      const j = await r.json();
      if (j.success) {
        if (j.data.appliedPlan === "pro") setPlan("pro");
        setPromoMsg({ ok: true, text: `Applied ✓ ${j.data.lifetime ? "(Lifetime Pro)" : ""}`, lifetime: j.data.lifetime, appliedPlan: j.data.appliedPlan });
      } else {
        setPromoMsg({ ok: false, text: j.error?.message || "Invalid code" });
      }
    } catch (e: any) {
      setPromoMsg({ ok: false, text: e?.message || "Network error" });
    }
  }

  async function nextBranding() {
    const payload: any = { clubName, clubSlug: slug, email, plan };
    if (promo) payload.promoCode = promo;
    const r = await fetch(`${API}/public/signup/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok || j.success === false) {
      alert(`Signup failed: ${j?.error || r.status}`);
      return;
    }
    // Save JWT for later steps if needed (your SDK normally does this)
    localStorage.setItem("signup_jwt", j.jwt || "");
    localStorage.setItem("tenant_id", j.tenantId || "");
    location.href = "/onboarding/branding"; // or whatever your Step 2 route is
  }

  const card = (k: "starter" | "pro", title: string, subline: string) => (
    <button
      type="button"
      onClick={() => setPlan(k)}
      style={plan === k ? cardSelected : cardBase}
      aria-pressed={plan === k}
      aria-label={`Select plan ${title}`}
    >
      <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{subline}</div>
      {plan === k && promoMsg?.ok && promoMsg.lifetime && <span style={badge}>Lifetime Pro</span>}
    </button>
  );

  return (
    <div style={box}>
      <h1 style={heading}>Get Started</h1>
      <div style={sub}>Create your club in 3 easy steps. We'll automatically provision everything you need.</div>

      {/* Plan selector */}
      <div style={cardWrap} role="tablist" aria-label="Select Plan">
        {card("starter", "Starter", "Use Make.com")}
        {card("pro", "Pro", "Full automation")}
      </div>

      {/* Promo row */}
      <div style={{ ...row, marginBottom: 16 }}>
        <input
          placeholder="Promo code (optional)"
          style={{ ...input, minWidth: 220 }}
          value={promo}
          onChange={(e) => {
            setPromo(e.target.value.toUpperCase());
            setPromoMsg(null);
          }}
          onBlur={verifyPromo}
        />
        <button type="button" style={{ ...btnPrimary, background: "#222", color: "#fff" }} onClick={verifyPromo}>
          Apply
        </button>
        {promoMsg && (
          <span
            style={{
              marginLeft: 6,
              fontWeight: 700,
              color: promoMsg.ok ? "#22c55e" : "#ef4444",
            }}
          >
            {promoMsg.text}
          </span>
        )}
      </div>

      {/* Form */}
      <div style={{ ...row, marginBottom: 16 }}>
        <input placeholder="Club name *" style={input} value={clubName} onChange={(e) => setClubName(e.target.value)} />
        <input placeholder="Tenant ID (slug) *" style={input} value={slug} onChange={(e) => setSlug(e.target.value)} />
        <input placeholder="Contact Email *" style={input} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <button
        type="button"
        onClick={nextBranding}
        disabled={!clubName || !slug || !email}
        style={{ ...btnPrimary, opacity: !clubName || !slug || !email ? 0.5 : 1 }}
      >
        Next: Branding
      </button>
    </div>
  );
}
