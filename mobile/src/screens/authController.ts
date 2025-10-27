import { authApi, AuthError, AuthResult, LoginParams, RegisterParams } from '../services/api';

export type LoginSubmission = LoginParams;
export type RegistrationSubmission = RegisterParams;

export type LoginOutcome =
  | { success: true; result: AuthResult }
  | { success: false; error: string };

export type RegistrationOutcome =
  | { success: true; result: AuthResult }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

type LoginExecutor = Pick<typeof authApi, 'login'>;
type RegistrationExecutor = Pick<typeof authApi, 'register'>;

export const submitLogin = async (
  payload: LoginSubmission,
  api: LoginExecutor = authApi,
): Promise<LoginOutcome> => {
  try {
    const result = await api.login({
      email: payload.email,
      password: payload.password,
    });

    return { success: true, result };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message || 'Unable to sign in. Please try again.' };
    }

    if (error instanceof Error) {
      return { success: false, error: error.message || 'Unable to sign in. Please try again.' };
    }

    return { success: false, error: 'Unable to sign in. Please try again.' };
  }
};

export const submitRegistration = async (
  payload: RegistrationSubmission,
  api: RegistrationExecutor = authApi,
): Promise<RegistrationOutcome> => {
  try {
    const result = await api.register(payload);
    return { success: true, result };
  } catch (error) {
    if (error instanceof AuthError) {
      const fieldErrors = Object.keys(error.fieldErrors || {}).length ? error.fieldErrors : undefined;
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.',
        fieldErrors,
      };
    }

    if (error instanceof Error) {
      return { success: false, error: error.message || 'Registration failed. Please try again.' };
    }

    return { success: false, error: 'Registration failed. Please try again.' };
  }
};
