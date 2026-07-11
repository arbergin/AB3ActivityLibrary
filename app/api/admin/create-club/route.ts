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
      return NextResponse.json({ error: "Only admins can add clubs." }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";

    if (!name) return NextResponse.json({ error: "Club Name is required." }, { status: 400 });

    const { data: club, error } = await supabaseAdmin
      .from("clubs")
      .insert({ name, contact: contact || null })
      .select("*")
      .single();

    if (error) {
      const duplicate = error.code === "23505";
      return NextResponse.json(
        { error: duplicate ? "A club with that name already exists." : error.message },
        { status: duplicate ? 409 : 400 }
      );
    }

    return NextResponse.json({ club });
  } catch (error) {
    console.error("Create club failed.", error);
    return NextResponse.json({ error: "Unexpected server error while adding club." }, { status: 500 });
  }
}
