import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Current user or null (verified with Supabase Auth, not just the cookie). */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}

/** For customer pages: redirects to login and back afterwards. */
export async function requireUser(nextPath: string) {
  const { user, supabase } = await getUser();
  if (!user) redirect(`/prijava?next=${encodeURIComponent(nextPath)}`);
  return { user, supabase };
}

export async function isAdminUser(): Promise<boolean> {
  const { user, supabase } = await getUser();
  if (!user) return false;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin';
}

/** For admin pages and admin server actions. */
export async function requireAdmin() {
  const { user, supabase } = await getUser();
  if (!user) redirect('/prijava?next=/admin');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') redirect('/');
  return { user, supabase };
}
