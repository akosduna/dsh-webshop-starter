import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { supabaseSecretKey, supabaseUrl } from '@/lib/env';

/**
 * Service-role client: bypasses RLS. Server-only (checkout, Stripe webhook).
 * Never import this from a Client Component.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
