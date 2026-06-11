import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { UserRole } from "@/lib/userProfile";

type CreateUserRequestBody = {
  email?: string;
  password?: string;
  role?: UserRole;
};

function getBearerToken(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.replace("Bearer ", "").trim();
}

function isValidRole(role: unknown): role is UserRole {
  return role === "user" || role === "admin";
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
        { error: "You must be logged in to create users." },
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
        { error: "Only admins can create users." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateUserRequestBody;

    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";
    const role = isValidRole(body.role) ? body.role : "user";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Initial password is required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Initial password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const { data: createdUserData, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createUserError || !createdUserData.user) {
      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            "The user could not be created. They may already exist.",
        },
        { status: 400 }
      );
    }

    const createdUser = createdUserData.user;

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: createdUser.id,
          email,
          role,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      )
      .select("*")
      .single();

    if (profileError) {
      return NextResponse.json(
        {
          error:
            "User was created in Auth, but the profile row could not be created.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        id: createdUser.id,
        email: createdUser.email,
      },
      profile: profileData,
    });
  } catch (error) {
    console.error("Admin create user route failed.", error);

    return NextResponse.json(
      { error: "Unexpected server error while creating user." },
      { status: 500 }
    );
  }
}