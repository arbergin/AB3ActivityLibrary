import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type BulkCreateUserInput = {
  name?: string;
  email?: string;
  password?: string;
  mustChangePassword?: boolean;
};

type BulkCreateUsersRequestBody = {
  users?: BulkCreateUserInput[];
};

type BulkCreateUserResult = {
  rowNumber: number;
  name?: string;
  email?: string;
  status: "created" | "skipped" | "error";
  message: string;
};

function getBearerToken(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.replace("Bearer ", "").trim();
}

async function requireAdmin(request: NextRequest) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      error: NextResponse.json(
        { error: "Missing authorization token." },
        { status: 401 }
      ),
    };
  }

  const {
    data: { user: requestingUser },
    error: requestingUserError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (requestingUserError || !requestingUser) {
    return {
      error: NextResponse.json(
        { error: "You must be logged in to bulk import users." },
        { status: 401 }
      ),
    };
  }

  const { data: requestingProfile, error: requestingProfileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .eq("id", requestingUser.id)
      .single();

  if (requestingProfileError || requestingProfile?.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Only admins can bulk import users." },
        { status: 403 }
      ),
    };
  }

  return { requestingUser };
}

function validateUserInput(user: BulkCreateUserInput, rowNumber: number) {
  const name = user.name?.trim() || "";
  const email = user.email?.trim().toLowerCase() || "";
  const password = user.password || "";
  const mustChangePassword = Boolean(user.mustChangePassword);

  if (!name) {
    return {
      result: {
        rowNumber,
        name,
        email,
        status: "error" as const,
        message: "Name is required.",
      },
    };
  }

  if (!email) {
    return {
      result: {
        rowNumber,
        name,
        email,
        status: "error" as const,
        message: "Email is required.",
      },
    };
  }

  if (!password) {
    return {
      result: {
        rowNumber,
        name,
        email,
        status: "error" as const,
        message: "Password is required.",
      },
    };
  }

  if (password.length < 6) {
    return {
      result: {
        rowNumber,
        name,
        email,
        status: "error" as const,
        message: "Password must be at least 6 characters.",
      },
    };
  }

  return {
    user: {
      name,
      email,
      password,
      mustChangePassword,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);

    if (adminCheck.error) {
      return adminCheck.error;
    }

    const body = (await request.json()) as BulkCreateUsersRequestBody;
    const users = Array.isArray(body.users) ? body.users : [];

    if (users.length === 0) {
      return NextResponse.json(
        { error: "No users were provided for bulk import." },
        { status: 400 }
      );
    }

    if (users.length > 200) {
      return NextResponse.json(
        { error: "Bulk import is limited to 200 users per CSV." },
        { status: 400 }
      );
    }

    const results: BulkCreateUserResult[] = [];
    const seenEmails = new Set<string>();

    for (const [index, rawUser] of users.entries()) {
      const rowNumber = index + 2;
      const validation = validateUserInput(rawUser, rowNumber);

      if (validation.result) {
        results.push(validation.result);
        continue;
      }

      const user = validation.user;

      if (!user) {
        results.push({
          rowNumber,
          status: "error",
          message: "Unable to validate this row.",
        });
        continue;
      }

      if (seenEmails.has(user.email)) {
        results.push({
          rowNumber,
          name: user.name,
          email: user.email,
          status: "skipped",
          message: "Duplicate email in this import file.",
        });
        continue;
      }

      seenEmails.add(user.email);

      const { data: createdUserData, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            name: user.name,
          },
        });

      if (createUserError || !createdUserData.user) {
        results.push({
          rowNumber,
          name: user.name,
          email: user.email,
          status: "error",
          message:
            createUserError?.message ||
            "The user could not be created. They may already exist.",
        });
        continue;
      }

      const createdUser = createdUserData.user;

      const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
        {
          id: createdUser.id,
          name: user.name,
          email: user.email,
          role: "user",
          must_change_password: user.mustChangePassword,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (profileError) {
        results.push({
          rowNumber,
          name: user.name,
          email: user.email,
          status: "error",
          message:
            "User was created in Auth, but the profile row could not be created.",
        });
        continue;
      }

      results.push({
        rowNumber,
        name: user.name,
        email: user.email,
        status: "created",
        message: "User created.",
      });
    }

    const summary = results.reduce(
      (currentSummary, result) => {
        if (result.status === "created") {
          currentSummary.created += 1;
        } else if (result.status === "skipped") {
          currentSummary.skipped += 1;
        } else {
          currentSummary.errors += 1;
        }

        return currentSummary;
      },
      {
        total: results.length,
        created: 0,
        skipped: 0,
        errors: 0,
      }
    );

    return NextResponse.json({
      summary,
      results,
    });
  } catch (error) {
    console.error("Admin bulk create users route failed.", error);

    return NextResponse.json(
      { error: "Unexpected server error while bulk importing users." },
      { status: 500 }
    );
  }
}
