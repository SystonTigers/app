import { describe, expect, it } from 'vitest';
import { ownerBackendPath, ownerQuery, sameOrigin } from '../proxy';
import { ago, paymentText, rolesText, trialText } from '../format';

describe('owner proxy allow-list', () => {
  it('forwards only the owner panel calls', () => {
    expect(ownerBackendPath('GET', ['overview'])).toBe('/api/v1/owner/overview');
    expect(ownerBackendPath('GET', ['clubs'])).toBe('/api/v1/owner/clubs');
    expect(ownerBackendPath('GET', ['clubs', 'club_123-abc'])).toBe('/api/v1/owner/clubs/club_123-abc');
    expect(ownerBackendPath('POST', ['clubs', 'abc', 'actions'])).toBe('/api/v1/owner/clubs/abc/actions');
  });

  it('refuses anything else', () => {
    expect(ownerBackendPath('GET', ['login'])).toBeNull();
    expect(ownerBackendPath('POST', ['overview'])).toBeNull();
    expect(ownerBackendPath('GET', ['clubs', '..'])).toBeNull();
    expect(ownerBackendPath('GET', ['clubs', 'a%2F..'])).toBeNull();
    expect(ownerBackendPath('DELETE', ['clubs', 'abc'])).toBeNull();
    expect(ownerBackendPath('GET', ['..', 'admin', 'tenants'])).toBeNull();
    expect(ownerBackendPath('POST', ['clubs', 'abc', 'actions', 'x'])).toBeNull();
    expect(ownerBackendPath('GET', [])).toBeNull();
  });

  it('keeps only known query parameters', () => {
    expect(ownerQuery(new URLSearchParams('q=rovers&status=trial&token=x'))).toBe('?q=rovers&status=trial');
    expect(ownerQuery(new URLSearchParams('evil=1'))).toBe('');
  });

  it('checks the request came from our own pages', () => {
    const req = (origin?: string, site?: string) => new Request('https://boost.example/api/owner/clubs/a/actions', {
      method: 'POST', headers: { ...(origin ? { origin } : {}), ...(site ? { 'sec-fetch-site': site } : {}) },
    });
    expect(sameOrigin(req('https://boost.example'))).toBe(true);
    expect(sameOrigin(req('https://evil.example'))).toBe(false);
    expect(sameOrigin(req(undefined, 'cross-site'))).toBe(false);
    expect(sameOrigin(req(undefined, 'same-origin'))).toBe(true);
  });
});

describe('owner formatting', () => {
  it('formats times', () => {
    const now = Date.UTC(2026, 8, 30, 12);
    expect(ago(null)).toBe('Never');
    expect(ago(now - 30_000, now)).toBe('Just now');
    expect(ago(now - 3 * 3600_000, now)).toBe('3 hours ago');
    expect(ago(now - 86400_000, now)).toBe('1 day ago');
    expect(trialText(1)).toBe('1 day of trial left');
    expect(trialText(0)).toBe('Trial ends today');
    expect(trialText(-2)).toBe('Trial ended 2 days ago');
  });

  it('names roles and payment status in words', () => {
    expect(rolesText(['tenant_member'])).toBe('Member');
    expect(rolesText(['tenant_member', 'supporter'])).toBe('Supporter');
    expect(rolesText(['owner', 'tenant_admin', 'admin'])).toBe('Owner, Admin');
    expect(paymentText(null)).toBe('Not set up');
    expect(paymentText('trialing')).toBe('On trial');
    expect(paymentText('past_due')).toBe('Payment overdue');
  });
});
