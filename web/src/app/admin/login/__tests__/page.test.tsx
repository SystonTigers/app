/// <reference types="vitest" />

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AdminLoginPage from '../page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('AdminLoginPage', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    pushMock.mockReset();
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    fetchMock = vi.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    (global as any).fetch = originalFetch;
  });

  it('requests a magic link and shows confirmation messaging', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { message: 'Link sent' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<AdminLoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('you@club.co.uk'), 'owner@systontigers.co.uk');
    await user.type(screen.getByPlaceholderText('syston-tigers'), 'syston');

    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/link sent/i);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/auth/magic-link');
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toBeTruthy();
    const body = JSON.parse(String(requestInit?.body));
    expect(body).toMatchObject({
      email: 'owner@systontigers.co.uk',
      tenantId: 'syston',
    });
  });

  it('logs in with password, stores the token cookie, and routes to admin', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            token: 'jwt-123',
            tenantId: 'syston',
            redirectUrl: '/admin/dashboard',
            expiresAt: '2030-01-01T00:00:00Z',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<AdminLoginPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /password/i }));
    await user.clear(screen.getByPlaceholderText('you@club.co.uk'));
    await user.type(screen.getByPlaceholderText('you@club.co.uk'), 'admin@systontigers.co.uk');
    await user.type(screen.getByPlaceholderText('syston-tigers'), 'syston');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secretpass');

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/admin/dashboard');
    });

    expect(document.cookie).toContain('admin_token=jwt-123');
  });
});
