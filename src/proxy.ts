import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session cookie so Server Components see a valid
 * user. Skipped for visitors without a Supabase auth cookie, so anonymous
 * shoppers don't pay for an extra auth round-trip on every page.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!hasAuthCookie || !url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Aborted request or network hiccup: refreshing is best-effort.
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|demo/|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};
