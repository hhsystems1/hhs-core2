'use client';

import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config';

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export { isSupabaseConfigured };
