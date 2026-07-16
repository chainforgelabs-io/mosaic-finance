/**
 * Refreshes the Supabase auth session and enforces access on matched routes
 * (dashboard, admin, onboarding, auth pages, and API).
 */
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/onboarding/:path*',
    '/api/:path*',
  ],
};
