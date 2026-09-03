import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type UserStatus = "active" | "muted" | "banned";

export type Profile = {
  email: string;
  display_name: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

export type ProfileResult = { ok: true; profile: Profile } | { ok: false; error: string; status: number };

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 30;

function validateNickname(raw: string): string | null {
  const name = raw.trim();
  if (name.length < NICKNAME_MIN || name.length > NICKNAME_MAX) {
    return `Nickname must be ${NICKNAME_MIN}-${NICKNAME_MAX} characters.`;
  }
  return null;
}

/**
 * Registration is a separate, deliberate step from signing in with Google --
 * having a session proves who you are, not that you've agreed to show up as
 * a named participant. Absence of a row here means "signed in, not
 * registered," distinct from any Field-Notes-specific state.
 */
export async function getProfile(email: string): Promise<Profile | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return (data as Profile | null) || null;
}

export async function createProfile(email: string, displayName: string): Promise<ProfileResult> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Supabase write config is missing", status: 500 };
  }

  const nicknameError = validateNickname(displayName);
  if (nicknameError) {
    return { ok: false, error: nicknameError, status: 400 };
  }

  const existing = await getProfile(email);
  if (existing) {
    return { ok: false, error: "You're already registered.", status: 409 };
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({ email: email.toLowerCase(), display_name: displayName.trim() })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  return { ok: true, profile: data as Profile };
}

export async function updateDisplayName(email: string, displayName: string): Promise<ProfileResult> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Supabase write config is missing", status: 500 };
  }

  const nicknameError = validateNickname(displayName);
  if (nicknameError) {
    return { ok: false, error: nicknameError, status: 400 };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
    .eq("email", email.toLowerCase())
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }
  if (!data) {
    return { ok: false, error: "You're not registered yet.", status: 404 };
  }

  return { ok: true, profile: data as Profile };
}

// --- Admin: moderation ---

export async function setProfileStatus(email: string, status: UserStatus, updatedBy: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ status, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq("email", email.toLowerCase());

  if (error) {
    throw error;
  }
}
