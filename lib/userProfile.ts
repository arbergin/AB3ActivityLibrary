import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type UserRole = "user" | "admin";

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

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
      email: user.email || "",
      role: "user",
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

export function isAdminProfile(profile?: UserProfile | null) {
  return profile?.role === "admin";
}