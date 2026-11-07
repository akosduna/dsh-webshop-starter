import { neonConfig } from '@neondatabase/serverless';

declare global {
  var __neonConfigApplied: boolean | undefined;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableNeonFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const cause = error.cause instanceof Error ? error.cause.message.toLowerCase() : '';

  return (
    message.includes('fetch failed') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    cause.includes('fetch failed') ||
    cause.includes('etimedout') ||
    cause.includes('econnreset')
  );
}

if (!globalThis.__neonConfigApplied) {
  const baseFetch = neonConfig.fetchFunction ?? globalThis.fetch.bind(globalThis);

  // Use fetch-backed pool queries for short auth/session reads and retry the
  // transient fetch failures that show up most often during cold starts.
  neonConfig.poolQueryViaFetch = true;
  neonConfig.fetchFunction = async (...args: Parameters<typeof fetch>) => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await baseFetch(...args);
      } catch (error) {
        lastError = error;

        if (!isRetryableNeonFetchError(error) || attempt === 2) {
          throw error;
        }

        await wait(attempt * 150);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Neon request failed.');
  };

  globalThis.__neonConfigApplied = true;
}
