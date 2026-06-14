import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type UpdateUserNameRequestBody = {
  userId?: string;
  name?: string;
};

function getBearerToken(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.replace("Bearer ", "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing authorization token." },
        { status: 401 }
      );
    }

    const {
      data: { user: requestingUser },
      error: requestingUserError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (requestingUserError || !requestingUser) {
      return NextResponse.json(
        { error: "You must be logged in to update users." },
        { status: 401 }
      );
    }

    const { data: requestingProfile, error: requestingProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, email, role")
        .eq("id", requestingUser.id)
        .single();

    if (requestingProfileError || requestingProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can update user names." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as UpdateUserNameRequestBody;
    const userId = body.userId?.trim() || "";
    const name = body.name?.trim() || "";

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    const { data: existingProfile, error: existingProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, email, role, must_change_password")
        .eq("id", userId)
        .single();

    if (existingProfileError || !existingProfile) {
      return NextResponse.json(
        { error: "User profile was not found." },
        { status: 404 }
      );
    }

    const { error: authUpdateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          name,
        },
      });

    if (authUpdateError) {
      return NextResponse.json(
        { error: authUpdateError.message || "Unable to update Auth user." },
        { status: 400 }
      );
    }

    const { data: updatedProfile, error: profileUpdateError } =
      await supabaseAdmin
        .from("profiles")
        .update({
          name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("*")
        .single();

    if (profileUpdateError || !updatedProfile) {
      return NextResponse.json(
        { error: "Auth user was updated, but profile name could not be saved." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Admin update user name route failed.", error);

    return NextResponse.json(
      { error: "Unexpected server error while updating user name." },
      { status: 500 }
    );
  }
}
