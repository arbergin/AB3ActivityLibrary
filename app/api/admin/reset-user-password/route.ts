import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ResetPasswordRequestBody = {
  userId?: string;
  password?: string;
  mustChangePassword?: boolean;
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
      error: "Only admins can manage users.",
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

    const body = (await request.json()) as ResetPasswordRequestBody;

    const userId = body.userId || "";
    const password = body.password || "";
    const mustChangePassword = body.mustChangePassword ?? true;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    if (userId === adminCheck.user.id) {
      return NextResponse.json(
        { error: "You cannot reset your own password here." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const { data: updatedUserData, error: updateUserError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      });

    if (updateUserError || !updatedUserData.user) {
      return NextResponse.json(
        {
          error:
            updateUserError?.message ||
            "The user password could not be reset.",
        },
        { status: 400 }
      );
    }

    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        must_change_password: mustChangePassword,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (profileError) {
      return NextResponse.json(
        {
          error:
            "Password was reset, but the password reset flag could not be updated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        id: updatedUserData.user.id,
        email: updatedUserData.user.email,
      },
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Admin reset password route failed.", error);

    return NextResponse.json(
      { error: "Unexpected server error while resetting password." },
      { status: 500 }
    );
  }
}