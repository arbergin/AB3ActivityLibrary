import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { paddle } from "@/lib/paddleServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SubscriptionProfile = {
  role: string | null;
  paddle_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean | null;
  subscription_exempt: boolean | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unknown subscription cancellation error.";
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
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

  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
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
  } = await userSupabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "role, paddle_subscription_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, subscription_exempt"
    )
    .eq("id", user.id)
    .single<SubscriptionProfile>();

  if (profileError || !profile) {
    console.error("Unable to load subscription profile.", profileError);

    return NextResponse.json(
      { error: "Your subscription profile could not be loaded." },
      { status: 404 }
    );
  }

  if (profile.role === "admin" || profile.subscription_exempt === true) {
    return NextResponse.json(
      { error: "This account does not have a cancelable subscription." },
      { status: 400 }
    );
  }

  if (profile.subscription_cancel_at_period_end === true) {
    return NextResponse.json({
      canceled: true,
      alreadyScheduled: true,
      currentPeriodEnd: profile.subscription_current_period_end,
    });
  }

  if (!profile.paddle_subscription_id) {
    return NextResponse.json(
      { error: "No Paddle subscription was found for this account." },
      { status: 400 }
    );
  }

  if (
    profile.subscription_status !== "active" &&
    profile.subscription_status !== "trialing" &&
    profile.subscription_status !== "past_due"
  ) {
    return NextResponse.json(
      { error: "This subscription cannot currently be canceled." },
      { status: 400 }
    );
  }

  try {
    const canceledSubscription = await paddle.subscriptions.cancel(
      profile.paddle_subscription_id,
      {
        effectiveFrom: "next_billing_period",
      }
    );

    const currentPeriodEnd =
      canceledSubscription.currentBillingPeriod?.endsAt ??
      profile.subscription_current_period_end;

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_cancel_at_period_end: true,
        subscription_current_period_end: currentPeriodEnd,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(
        "Paddle scheduled cancellation, but the profile update failed.",
        updateError
      );
    }

    return NextResponse.json({
      canceled: true,
      currentPeriodEnd,
    });
  } catch (error) {
    console.error("Paddle subscription cancellation failed.", error);

    const message = getErrorMessage(error);

    return NextResponse.json(
      {
        error:
          message ||
          "The subscription could not be canceled. Please try again.",
      },
      { status: 500 }
    );
  }
}
