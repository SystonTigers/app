import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthError, AuthResult, LoginParams, RegisterParams } from '../../services/api';
import { submitLogin, submitRegistration } from '../authController';

test('submitLogin delegates to authApi and returns success outcome', async () => {
  let capturedParams: LoginParams | null = null;
  const mockResult: AuthResult = {
    token: 'jwt-token',
    refreshToken: 'refresh-token',
    user: {
      id: 'user-9',
      role: 'parent',
      firstName: 'Jamie',
      lastName: 'Rivera',
      email: 'jamie@example.com',
    },
  };

  const outcome = await submitLogin(
    { email: 'jamie@example.com', password: 'password123' },
    {
      async login(params) {
        capturedParams = params;
        return mockResult;
      },
    },
  );

  if ('error' in outcome) {
    assert.fail('Expected successful login outcome');
  } else {
    assert.equal(outcome.result.token, mockResult.token);
    assert.equal(outcome.result.user.id, mockResult.user.id);
  }
  assert.deepEqual(capturedParams, { email: 'jamie@example.com', password: 'password123' });
});

test('submitLogin surfaces server validation errors', async () => {
  const outcome = await submitLogin(
    { email: 'jamie@example.com', password: 'wrong' },
    {
      async login() {
        throw new AuthError('Invalid credentials');
      },
    },
  );

  assert.ok('error' in outcome);
  if ('error' in outcome) {
    assert.equal(outcome.error, 'Invalid credentials');
  }
});

test('submitRegistration returns field errors from server', async () => {
  const payload: RegisterParams = {
    firstName: 'Lee',
    lastName: 'Park',
    email: 'lee@example.com',
    password: 'password123',
    role: 'parent',
    phone: '1234567890',
    playerName: 'Jordan Park',
    promoCode: 'WELCOME',
  };

  const outcome = await submitRegistration(payload, {
    async register() {
      throw new AuthError('Email already in use', { email: 'Email already in use' });
    },
  });

  assert.ok('error' in outcome);
  if ('error' in outcome) {
    assert.equal(outcome.error, 'Email already in use');
    assert.deepEqual(outcome.fieldErrors, { email: 'Email already in use' });
  }
});

test('submitRegistration returns auth result on success', async () => {
  let capturedParams: RegisterParams | null = null;
  const mockResult: AuthResult = {
    token: 'jwt-token',
    user: {
      id: 'new-user',
      role: 'coach',
      firstName: 'Ava',
      lastName: 'King',
      email: 'ava@example.com',
    },
  };

  const outcome = await submitRegistration(
    {
      firstName: 'Ava',
      lastName: 'King',
      email: 'ava@example.com',
      password: 'complex-pass',
      role: 'coach',
    },
    {
      async register(params) {
        capturedParams = params;
        return mockResult;
      },
    },
  );

  if ('error' in outcome) {
    assert.fail('Expected registration success outcome');
  } else {
    assert.equal(outcome.result.user.id, 'new-user');
  }
  assert.deepEqual(capturedParams, {
    firstName: 'Ava',
    lastName: 'King',
    email: 'ava@example.com',
    password: 'complex-pass',
    role: 'coach',
  });
});
