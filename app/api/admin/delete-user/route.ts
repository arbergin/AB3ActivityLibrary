import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DeleteUserRequestBody = {
  userId?: string;
};

function getBearerToken(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.replace("Bearer ", "").trim();
}

async function getRequestingAdmin(request: NextRequest) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      user: null,
      error: "Missing authorization token.",
      status: 401,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      user: null,
      error: "You must be logged in.",
      status: 401,
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      user: null,
      error: "Only admins can delete users.",
      status: 403,
    };
  }

  return {
    user,
    error: null,
    status: 200,
  };
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await getRequestingAdmin(request);

    if (!adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = (await request.json()) as DeleteUserRequestBody;
    const userId = body.userId || "";

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    if (userId === adminCheck.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const { error: deleteUserError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return NextResponse.json(
        {
          error: deleteUserError.message || "The user could not be deleted.",
        },
        { status: 400 }
      );
    }

    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Admin delete user route failed.", error);

    return NextResponse.json(
      { error: "Unexpected server error while deleting user." },
      { status: 500 }
    );
  }
}