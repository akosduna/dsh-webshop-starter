import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { supabasePublishableKey, supabaseUrl } from '@/lib/env';

/**
 * Anonymous client without cookies, for public catalog reads.
 * Pages that use only this client can be cached (ISR) instead of rendering
 * on every request. RLS returns only active products/categories.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
