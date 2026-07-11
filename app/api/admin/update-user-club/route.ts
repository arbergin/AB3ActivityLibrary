import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can assign clubs." }, { status: 403 });
    }

    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const clubId = typeof body.clubId === "string" && body.clubId.trim() ? body.clubId.trim() : null;

    if (!userId) return NextResponse.json({ error: "User ID is required." }, { status: 400 });

    if (clubId) {
      const { data: club } = await supabaseAdmin.from("clubs").select("id").eq("id", clubId).maybeSingle();
      if (!club) return NextResponse.json({ error: "The selected club was not found." }, { status: 400 });
    }

    const { data: updatedProfile, error } = await supabaseAdmin
      .from("profiles")
      .update({ club_id: clubId, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("Update user club failed.", error);
    return NextResponse.json({ error: "Unexpected server error while assigning club." }, { status: 500 });
  }
}
