import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { paddle } from "@/lib/paddleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLED_SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.activated",
  "subscription.past_due",
  "subscription.paused",
  "subscription.canceled",
]);

type PaddleCustomData = {
  supabase_user_id?: unknown;
  plan?: unknown;
};

type PaddleSubscriptionPayload = {
  id?: unknown;
  customer_id?: unknown;
  status?: unknown;
  custom_data?: PaddleCustomData | null;
  current_billing_period?: {
    starts_at?: unknown;
    ends_at?: unknown;
  } | null;
  scheduled_change?: {
    action?: unknown;
  } | null;
  items?: Array<{
    price?: {
      id?: unknown;
    } | null;
  }> | null;
};

type PaddleWebhookPayload = {
  event_id?: unknown;
  event_type?: unknown;
  occurred_at?: unknown;
  data?: PaddleSubscriptionPayload | Record<string, unknown> | null;
};

type ExistingWebhookEvent = {
  id: string;
  processing_status: string;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSubscriptionStatus(value: unknown) {
  switch (value) {
    case "trialing":
    case "active":
    case "past_due":
    case "paused":
    case "canceled":
      return value;
    default:
      return "none";
  }
}

function normalizePlan(value: unknown): "monthly" | "annual" | null {
  return value === "monthly" || value === "annual" ? value : null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unknown webhook processing error.";
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or PADDLE_WEBHOOK_SECRET."
    );

    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("paddle-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Paddle-Signature header." },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  try {
    await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
  } catch (error) {
    console.error("Invalid Paddle webhook signature.", error);

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  let payload: PaddleWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as PaddleWebhookPayload;
  } catch (error) {
    console.error("Verified Paddle webhook contained invalid JSON.", error);

    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400 }
    );
  }

  const paddleEventId = asString(payload.event_id);
  const eventType = asString(payload.event_type);
  const occurredAt = asString(payload.occurred_at);

  if (!paddleEventId || !eventType) {
    return NextResponse.json(
      { error: "Webhook payload is missing event metadata." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  let eventRowId: string;

  const { data: insertedEvent, error: insertError } = await supabaseAdmin
    .from("paddle_webhook_events")
    .insert({
      paddle_event_id: paddleEventId,
      event_type: eventType,
      occurred_at: occurredAt,
      processing_status: "processing",
      processing_error: null,
      processed_at: null,
      payload,
    })
    .select("id")
    .single();

  if (!insertError && insertedEvent) {
    eventRowId = insertedEvent.id as string;
  } else if (insertError?.code === "23505") {
    const { data: existingEvent, error: existingEventError } =
      await supabaseAdmin
        .from("paddle_webhook_events")
        .select("id, processing_status")
        .eq("paddle_event_id", paddleEventId)
        .single<ExistingWebhookEvent>();

    if (existingEventError || !existingEvent) {
      return NextResponse.json(
        { error: "Unable to load existing webhook." },
        { status: 500 }
      );
    }

    if (
      existingEvent.processing_status === "processed" ||
      existingEvent.processing_status === "ignored"
    ) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (existingEvent.processing_status === "processing") {
      return NextResponse.json({
        received: true,
        duplicate: true,
        processing: true,
      });
    }

    eventRowId = existingEvent.id;

    const { error: resetError } = await supabaseAdmin
      .from("paddle_webhook_events")
      .update({
        event_type: eventType,
        occurred_at: occurredAt,
        processing_status: "processing",
        processing_error: null,
        processed_at: null,
        payload,
      })
      .eq("id", eventRowId);

    if (resetError) {
      return NextResponse.json(
        { error: "Unable to retry webhook." },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Unable to record webhook." },
      { status: 500 }
    );
  }

  try {
    if (!HANDLED_SUBSCRIPTION_EVENTS.has(eventType)) {
      const { error: ignoredError } = await supabaseAdmin
        .from("paddle_webhook_events")
        .update({
          processing_status: "ignored",
          processed_at: new Date().toISOString(),
          processing_error: null,
        })
        .eq("id", eventRowId);

      if (ignoredError) {
        throw ignoredError;
      }

      return NextResponse.json({ received: true, ignored: true });
    }

    const subscription = payload.data as PaddleSubscriptionPayload | null;

    if (!subscription) {
      throw new Error("Subscription webhook did not contain data.");
    }

    const subscriptionId = asString(subscription.id);
    const paddleCustomerId = asString(subscription.customer_id);
    const userId = asString(subscription.custom_data?.supabase_user_id);
    const plan = normalizePlan(subscription.custom_data?.plan);
    const status = normalizeSubscriptionStatus(subscription.status);
    const priceId = asString(subscription.items?.[0]?.price?.id);
    const periodStart = asString(
      subscription.current_billing_period?.starts_at
    );
    const periodEnd = asString(subscription.current_billing_period?.ends_at);
    const cancelAtPeriodEnd =
      subscription.scheduled_change?.action === "cancel";

    if (!subscriptionId) {
      throw new Error("Subscription webhook did not contain a subscription ID.");
    }

    if (!userId) {
      throw new Error(
        "Subscription webhook did not contain custom_data.supabase_user_id."
      );
    }

    const { data: authUserData, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authUserError || !authUserData.user) {
      throw new Error(`Supabase auth user ${userId} could not be loaded.`);
    }

    const authUser = authUserData.user;
    const metadata = authUser.user_metadata ?? {};
    const fallbackName =
      (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
      (typeof metadata.name === "string" && metadata.name.trim()) ||
      authUser.email?.split("@")[0] ||
      "AB3 User";

    const { error: ensureProfileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: authUser.email ?? null,
          name: fallbackName,
          role: "user",
        },
        {
          onConflict: "id",
          ignoreDuplicates: true,
        }
      );

    if (ensureProfileError) {
      throw ensureProfileError;
    }

    const gracePeriodEnd =
      status === "past_due"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        paddle_customer_id: paddleCustomerId,
        paddle_subscription_id: subscriptionId,
        subscription_status: status,
        subscription_plan: plan,
        subscription_price_id: priceId,
        subscription_current_period_start: periodStart,
        subscription_current_period_end: periodEnd,
        subscription_cancel_at_period_end: cancelAtPeriodEnd,
        subscription_grace_period_end: gracePeriodEnd,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!updatedProfile) {
      throw new Error(`No public.profiles row matched Supabase user ID ${userId}.`);
    }

    const { error: processedError } = await supabaseAdmin
      .from("paddle_webhook_events")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq("id", eventRowId);

    if (processedError) {
      throw processedError;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("Paddle webhook processing failed.", error);

    await supabaseAdmin
      .from("paddle_webhook_events")
      .update({
        processing_status: "failed",
        processed_at: new Date().toISOString(),
        processing_error: message,
      })
      .eq("id", eventRowId);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
