import { supabase } from "@/lib/supabaseClient";
import type { UserProfile, UserRole } from "@/lib/userProfile";

export async function getAllUserProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("email", { ascending: true });

  if (error) {
    console.error("Unable to load user profiles.", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return (data || []) as UserProfile[];
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("Unable to update user role.", {
      userId,
      role,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return data as UserProfile;
}