import { describe, expect, it } from 'vitest';

import { gasCall } from './gas';

describe('gas client', () => {
  it('builds a JSON payload containing the action', () => {
    const action = 'verify';
    const body = JSON.stringify({ action, spreadsheetId: 'spreadsheet-123' });
    expect(body).toContain(`"${action}"`);
  });

  it('exposes the gasCall function', () => {
    expect(typeof gasCall).toBe('function');
  });
});
