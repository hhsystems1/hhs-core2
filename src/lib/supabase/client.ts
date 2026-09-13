'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { CookieMethodsBrowser, CookieOptionsWithName } from '@supabase/ssr';
import type { SupabaseClientOptions } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config';

type BrowserClientOptions = SupabaseClientOptions<'public'> & {
  cookies?: CookieMethodsBrowser;
  cookieOptions?: CookieOptionsWithName;
  cookieEncoding?: 'raw' | 'base64url';
  isSingleton?: boolean;
};

export function createClient(options?: BrowserClientOptions) {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, options);
}

export { isSupabaseConfigured };
