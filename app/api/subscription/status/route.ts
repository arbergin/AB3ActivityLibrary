import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SubscriptionProfile = {
  role: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean | null;
  subscription_exempt: boolean | null;
};

function hasSubscriptionAccess(profile: SubscriptionProfile) {
  return (
    profile.role === "admin" ||
    profile.subscription_exempt === true ||
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing"
  );
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase public environment variables.");

    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "role, subscription_status, subscription_plan, subscription_current_period_end, subscription_cancel_at_period_end, subscription_exempt"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Unable to read subscription profile.", profileError);

    return NextResponse.json(
      { error: "Profile not found." },
      { status: 404 }
    );
  }

  const typedProfile: SubscriptionProfile = {
    role: typeof profile.role === "string" ? profile.role : null,
    subscription_status:
      typeof profile.subscription_status === "string"
        ? profile.subscription_status
        : null,
    subscription_plan:
      typeof profile.subscription_plan === "string"
        ? profile.subscription_plan
        : null,
    subscription_current_period_end:
      typeof profile.subscription_current_period_end === "string"
        ? profile.subscription_current_period_end
        : null,
    subscription_cancel_at_period_end:
      typeof profile.subscription_cancel_at_period_end === "boolean"
        ? profile.subscription_cancel_at_period_end
        : null,
    subscription_exempt:
      typeof profile.subscription_exempt === "boolean"
        ? profile.subscription_exempt
        : null,
  };

  return NextResponse.json(
    {
      status: typedProfile.subscription_status || "none",
      plan: typedProfile.subscription_plan,
      currentPeriodEnd: typedProfile.subscription_current_period_end,
      cancelAtPeriodEnd:
        typedProfile.subscription_cancel_at_period_end === true,
      exempt: typedProfile.subscription_exempt === true,
      hasAccess: hasSubscriptionAccess(typedProfile),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
