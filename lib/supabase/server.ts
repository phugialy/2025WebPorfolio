import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseReadConfig() {
  return Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));
}

export function hasSupabaseWriteConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function createSupabaseReadClient() {
  if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRoleKey)) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
    },
  });
}

export function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
