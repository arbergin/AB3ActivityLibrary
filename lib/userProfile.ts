import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type UserRole = "user" | "admin";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  must_change_password: boolean;
  club_id: string | null;
  created_at: string;
  updated_at: string;
};

function getUserMetadataName(user: User) {
  const metadataName = user.user_metadata?.name;

  if (typeof metadataName === "string") {
    return metadataName.trim();
  }

  return "";
}

export async function getCurrentSessionUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return undefined;
  }

  return data.user ?? undefined;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load user profile.", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return data as UserProfile | null;
}

export async function ensureUserProfile(user: User) {
  const existingProfile = await getUserProfile(user.id);

  if (existingProfile) {
    return existingProfile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      name: getUserMetadataName(user),
      email: user.email || "",
      role: "user",
      must_change_password: false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Unable to create user profile.", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return data as UserProfile;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return undefined;
  }

  return ensureUserProfile(user);
}

export async function markCurrentUserPasswordChanged() {
  const user = await getCurrentSessionUser();

  if (!user) {
    throw new Error("No logged-in user found.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("Unable to mark password as changed.", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return data as UserProfile;
}

export function isAdminProfile(profile?: UserProfile | null) {
  return profile?.role === "admin";
}


export async function getUserDisplayName(identifier?: string | null) {
  const normalizedIdentifier = String(identifier ?? "").trim();

  if (!normalizedIdentifier) {
    return "—";
  }

  let query = supabase
    .from("profiles")
    .select("id, name, email")
    .limit(1);

  query = normalizedIdentifier.includes("@")
    ? query.ilike("email", normalizedIdentifier)
    : query.eq("id", normalizedIdentifier);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Unable to load user display name.", {
      identifier: normalizedIdentifier,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    return normalizedIdentifier;
  }

  const profile = data as Pick<UserProfile, "id" | "name" | "email"> | null;
  const profileName = profile?.name?.trim();

  return profileName || profile?.email || normalizedIdentifier;
}
