import { auth } from '@/lib/auth/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const runtime = 'nodejs';

const authHandlers = toNextJsHandler(auth);

type AuthRouteContext = {
  params: Promise<{
    all?: string[];
  }>;
};

type AuthHandler = (request: Request, context: AuthRouteContext) => Promise<Response>;

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldRetryAuthRequest(request: Request) {
  const pathname = new URL(request.url).pathname;

  return pathname.endsWith('/sign-in/email') || pathname.endsWith('/get-session');
}

function shouldRetryAuthResponse(response: Response) {
  return [500, 502, 503, 504].includes(response.status);
}

async function runAuthHandlerWithRetry(
  handler: AuthHandler,
  request: Request,
  context: AuthRouteContext,
) {
  const attempts = shouldRetryAuthRequest(request) ? 3 : 1;
  const requests = Array.from({ length: attempts }, (_, index) =>
    index === 0 ? request : request.clone(),
  );
  let lastResponse: Response | null = null;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await handler(requests[attempt - 1], context);

      if (!shouldRetryAuthResponse(response) || attempt === attempts) {
        return response;
      }

      lastResponse = response;
      console.warn(
        `Retrying auth request (${attempt}/${attempts})`,
        request.method,
        new URL(request.url).pathname,
        response.status,
      );
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        throw error;
      }

      console.warn(
        `Auth handler failed, retrying (${attempt}/${attempts})`,
        request.method,
        new URL(request.url).pathname,
        error,
      );
    }

    await wait(attempt * 150);
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError instanceof Error ? lastError : new Error('Authentication request failed.');
}

export async function GET(request: Request, context: AuthRouteContext) {
  return runAuthHandlerWithRetry(authHandlers.GET, request, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  return runAuthHandlerWithRetry(authHandlers.POST, request, context);
}
