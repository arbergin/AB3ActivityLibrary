import { supabase } from "@/lib/supabaseClient";

export type Club = {
  id: string;
  name: string;
  contact: string | null;
  created_at: string;
  updated_at: string;
};

export async function getClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as Club[];
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export async function createClub(name: string, contact: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("You must be logged in to add a club.");

  const response = await fetch("/api/admin/create-club", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name, contact }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to add club.");
  return result.club as Club;
}

export async function updateUserClub(userId: string, clubId: string | null) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("You must be logged in to assign a club.");

  const response = await fetch("/api/admin/update-user-club", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userId, clubId }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to assign club.");
  return result.profile;
}
