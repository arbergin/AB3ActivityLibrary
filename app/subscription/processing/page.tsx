"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type SubscriptionStatusResponse = {
  status?: string;
  hasAccess?: boolean;
  error?: string;
};

const MAX_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2000;

export default function SubscriptionProcessingPage() {
  const router = useRouter();

  const [statusMessage, setStatusMessage] = useState(
    "Waiting for Paddle to confirm your subscription."
  );
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    async function checkSubscription() {
      if (cancelled) {
        return;
      }

      attempts += 1;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login?next=/subscription/processing");
        return;
      }

      try {
        const response = await fetch("/api/subscription/status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const result =
          (await response.json()) as SubscriptionStatusResponse;

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to check subscription status."
          );
        }

        if (result.hasAccess) {
          setStatusMessage(
            "Your subscription is active. Redirecting..."
          );

          router.replace("/my-activities");
          router.refresh();
          return;
        }

        if (
          result.status === "past_due" ||
          result.status === "paused" ||
          result.status === "canceled"
        ) {
          setStatusMessage(
            `Your subscription status is ${result.status}.`
          );
          setHasTimedOut(true);
          return;
        }
      } catch (error) {
        console.error("Subscription status check failed.", error);
      }

      if (attempts >= MAX_ATTEMPTS) {
        setStatusMessage(
          "Paddle is taking longer than expected to confirm the subscription."
        );
        setHasTimedOut(true);
        return;
      }

      timeoutId = setTimeout(
        checkSubscription,
        POLL_INTERVAL_MS
      );
    }

    void checkSubscription();

    return () => {
      cancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="relative min-h-[calc(100vh-72px)] overflow-hidden px-4 py-12 sm:px-6 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/login-background.png')] bg-[length:100%_auto] bg-top bg-repeat-y opacity-65"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-100/20"
        />

        <div className="relative z-10 mx-auto max-w-xl rounded-[28px] bg-white/92 p-8 text-center shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-10">
          {!hasTimedOut && (
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#0d2140]" />
          )}

          <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            AB3 Activity Library
          </p>

          <h1 className="mt-3 text-3xl font-black text-[#0d2140]">
            {hasTimedOut
              ? "Subscription confirmation pending"
              : "Activating your subscription"}
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-700">
            {statusMessage}
          </p>

          {hasTimedOut && (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-[#0d2140] px-5 py-3 font-bold text-white shadow-md transition hover:bg-[#17345f]"
              >
                Check Again
              </button>

              <Link
                href="/subscribe"
                className="rounded-lg border border-[#0d2140] bg-white px-5 py-3 font-bold text-[#0d2140] transition hover:bg-slate-50"
              >
                Subscription Options
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}