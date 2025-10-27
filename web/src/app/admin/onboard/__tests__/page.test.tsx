/// <reference types="vitest" />

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import OnboardPage from '../page';

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

describe('OnboardPage', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    pushMock.mockReset();
    fetchMock = vi.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    (global as any).fetch = originalFetch;
  });

  it('submits signup data and navigates to the admin console', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'syston',
            adminConsoleUrl: 'https://admin.example.com/syston',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<OnboardPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('e.g., Syston Tigers U16'), 'Syston Tigers');
    await user.type(screen.getByPlaceholderText('syston-tigers'), 'syston-tigers');
    await user.type(screen.getByPlaceholderText('Danny Clayton'), 'Danny Clayton');
    await user.type(screen.getByPlaceholderText('danny@systontigers.co.uk'), 'owner@systontigers.co.uk');

    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.type(screen.getByPlaceholderText('https://hook.us1.make.com/...'), 'https://hook.example.com/tenant');
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    await user.click(screen.getByRole('button', { name: /create club/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('https://admin.example.com/syston');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/signup');
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(requestInit?.body));
    expect(body).toMatchObject({
      clubName: 'Syston Tigers',
      clubShortName: 'syston-tigers',
      contactEmail: 'owner@systontigers.co.uk',
      contactName: 'Danny Clayton',
      makeWebhookUrl: 'https://hook.example.com/tenant',
    });
  });
});
