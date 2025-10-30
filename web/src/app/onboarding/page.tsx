"use client";

import { useState } from "react";

export default function OnboardingPage() {
  const [form, setForm] = useState({
    teamName: "",
    tenantId: "",
    primary: "#FFD400",
    secondary: "#111111",
    badgeUrl: "",
    contactEmail: "",
    makeWebhookUrl: "",
    youtubeChannelId: ""
  });
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      setResult(json);
      if (!res.ok) {
        setError(json?.error ?? "Provisioning failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold">Get Started</h1>
      <p className="text-sm text-neutral-600">
        Enter your club details to provision your automation workspace. We will copy the template
        spreadsheet, configure your colours, and run the validator automatically.
      </p>
      <input
        placeholder="Club name"
        value={form.teamName}
        onChange={(e) => setForm({ ...form, teamName: e.target.value })}
        className="w-full rounded border p-2"
      />
      <input
        placeholder="Tenant ID (slug)"
        value={form.tenantId}
        onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
        className="w-full rounded border p-2"
      />
      <input
        placeholder="Badge URL"
        value={form.badgeUrl}
        onChange={(e) => setForm({ ...form, badgeUrl: e.target.value })}
        className="w-full rounded border p-2"
      />
      <input
        placeholder="Contact Email"
        value={form.contactEmail}
        onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
        className="w-full rounded border p-2"
      />
      <input
        placeholder="Make Webhook URL (optional)"
        value={form.makeWebhookUrl}
        onChange={(e) => setForm({ ...form, makeWebhookUrl: e.target.value })}
        className="w-full rounded border p-2"
      />
      <input
        placeholder="YouTube Channel ID (optional)"
        value={form.youtubeChannelId}
        onChange={(e) => setForm({ ...form, youtubeChannelId: e.target.value })}
        className="w-full rounded border p-2"
      />
      <div className="flex gap-2">
        <input
          placeholder="# Primary"
          value={form.primary}
          onChange={(e) => setForm({ ...form, primary: e.target.value })}
          className="w-1/2 rounded border p-2"
        />
        <input
          placeholder="# Secondary"
          value={form.secondary}
          onChange={(e) => setForm({ ...form, secondary: e.target.value })}
          className="w-1/2 rounded border p-2"
        />
      </div>
      <button
        onClick={submit}
        disabled={submitting}
        className="rounded bg-black px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Provisioning..." : "Provision"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <pre className="rounded bg-neutral-100 p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
