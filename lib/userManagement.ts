import { supabase } from "@/lib/supabaseClient";
import type { UserProfile, UserRole } from "@/lib/userProfile";

export type LoginAuditEntry = {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  login_at: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
};

export async function getAllUserProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("name", { ascending: true })
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

export async function getRecentLoginAudit(limit = 50) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabase
    .from("user_login_audit")
    .select("*")
    .order("login_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("Unable to load login audit entries.", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return (data || []) as LoginAuditEntry[];
}
