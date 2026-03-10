import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client using the service role key — bypasses RLS.
 * Use ONLY in server-side routes where the caller has already been
 * authenticated via the session-based client (getUser()).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
