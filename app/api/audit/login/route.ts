import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getBearerToken(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.replace("Bearer ", "").trim();
}

function getClientIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null
  );
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
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to audit a login." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email")
      .eq("id", user.id)
      .maybeSingle();

    const userAgent = request.headers.get("user-agent");
    const ipAddress = getClientIpAddress(request);

    const { error: insertError } = await supabaseAdmin
      .from("user_login_audit")
      .insert({
        user_id: user.id,
        name:
          typeof profile?.name === "string"
            ? profile.name
            : typeof user.user_metadata?.name === "string"
              ? user.user_metadata.name
              : "",
        email: profile?.email || user.email || "",
        user_agent: userAgent,
        ip_address: ipAddress,
      });

    if (insertError) {
      console.error("Unable to insert login audit row.", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });

      return NextResponse.json(
        { error: "Login succeeded, but the audit row could not be saved." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login audit route failed.", error);

    return NextResponse.json(
      { error: "Unexpected server error while logging login audit." },
      { status: 500 }
    );
  }
}
