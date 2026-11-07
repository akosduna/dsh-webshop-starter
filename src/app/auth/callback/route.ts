import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Landing URL for Supabase e-mail links (sign-up confirmation, password
 * reset). Exchanges the one-time code for a session cookie, then redirects.
 * Add <SITE_URL>/auth/callback to Supabase → Authentication → URL Configuration.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/moj-racun';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/moj-racun';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/prijava?greska=poveznica`);
}
