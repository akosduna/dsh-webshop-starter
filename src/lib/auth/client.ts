'use client';

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();

const RETRYABLE_AUTH_STATUS_CODES = new Set([500, 502, 503, 504]);

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getLooseErrorField(error: unknown, field: string) {
  if (!error || typeof error !== 'object' || !(field in error)) {
    return null;
  }

  return (error as Record<string, unknown>)[field];
}

function isRetryableAuthError(error: unknown) {
  const status = getLooseErrorField(error, 'status');

  if (typeof status === 'number' && RETRYABLE_AUTH_STATUS_CODES.has(status)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnreset')
  );
}

function isRetryableAuthResult(result: unknown) {
  if (!result || typeof result !== 'object' || !('error' in result)) {
    return false;
  }

  const error = (result as { error?: unknown }).error;

  if (!error || typeof error !== 'object') {
    return false;
  }

  const status = getLooseErrorField(error, 'status');
  const message = getLooseErrorField(error, 'message');

  return (
    (typeof status === 'number' && RETRYABLE_AUTH_STATUS_CODES.has(status)) ||
    (typeof message === 'string' &&
      (message.toLowerCase().includes('fetch failed') ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('timeout')))
  );
}

async function runClientAuthWithRetry<T>(operation: () => Promise<T>) {
  let lastResult: T | null = null;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await operation();

      if (!isRetryableAuthResult(result) || attempt === 3) {
        return result;
      }

      lastResult = result;
    } catch (error) {
      lastError = error;

      if (!isRetryableAuthError(error) || attempt === 3) {
        throw error;
      }
    }

    await wait(attempt * 150);
  }

  if (lastResult) {
    return lastResult;
  }

  throw lastError instanceof Error ? lastError : new Error('Authentication request failed.');
}

type SignInEmailArgs = Parameters<typeof authClient.signIn.email>;
type SignUpEmailArgs = Parameters<typeof authClient.signUp.email>;

export function signInWithRetry(...args: SignInEmailArgs) {
  return runClientAuthWithRetry(() => authClient.signIn.email(...args));
}

export function signUpWithRetry(...args: SignUpEmailArgs) {
  return runClientAuthWithRetry(() => authClient.signUp.email(...args));
}

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
