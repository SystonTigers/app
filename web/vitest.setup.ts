import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';
});
