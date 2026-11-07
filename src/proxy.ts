import { NextResponse, type NextRequest } from 'next/server';

/**
 * Cheap gate for /admin and /moj-racun: only checks that a Better Auth
 * session cookie exists and sends visitors without one to the login page.
 * The real check (valid session, admin role) runs on the server in
 * src/app/admin/layout.tsx, every admin action / route, and requireUser() —
 * the proxy never talks to the database.
 */
const AUTH_COOKIE_NAMES = ['better-auth.session_token', '__Secure-better-auth.session_token'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = AUTH_COOKIE_NAMES.some((name) => request.cookies.get(name)?.value);

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/prijava';
    url.search = '';
    url.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/moj-racun/:path*'],
};
