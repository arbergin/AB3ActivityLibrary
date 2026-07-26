"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { initializePaddle } from "@paddle/paddle-js";
import AppHeader from "@/components/AppHeader";

export default function PayPage() {
  const [statusMessage, setStatusMessage] = useState(
    "Loading secure payment options..."
  );
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPaddle() {
      const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      const configuredEnvironment =
        process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;

      if (!clientToken) {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
          setStatusMessage(
            "Payment services are not configured. Please contact Support@ab3soccer.com."
          );
        }
        return;
      }

      try {
        const paddle = await initializePaddle({
          token: clientToken,
          environment:
            configuredEnvironment === "sandbox" ? "sandbox" : "production",
        });

        if (!isMounted) {
          return;
        }

        if (!paddle) {
          throw new Error("Paddle.js did not initialize.");
        }

        const transactionId = new URLSearchParams(
          window.location.search
        ).get("_ptxn");

        if (transactionId) {
          setIsLoading(true);
          setStatusMessage(
            "Your secure Paddle payment window should open automatically."
          );
        } else {
          setIsLoading(false);
          setStatusMessage(
            "No payment link was provided. Use a Paddle payment or payment-method update link to open the secure checkout."
          );
        }
      } catch (error) {
        console.error("Unable to initialize Paddle on the payment page.", error);

        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
          setStatusMessage(
            "The secure payment window could not be loaded. Please refresh the page or contact Support@ab3soccer.com."
          );
        }
      }
    }

    void loadPaddle();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="relative min-h-[calc(100vh-72px)] overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/login-background.png')] bg-[length:100%_auto] bg-top bg-repeat-y opacity-65"
        />

        <div aria-hidden="true" className="absolute inset-0 bg-slate-100/20" />

        <div className="relative z-10 mx-auto max-w-xl rounded-[28px] bg-white/95 p-7 text-center shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            AB3 Activity Library
          </p>

          <h1 className="mt-3 text-3xl font-black text-[#0d2140] sm:text-4xl">
            Secure payment
          </h1>

          {isLoading && !hasError && (
            <div className="mx-auto mt-7 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#0d2140]" />
          )}

          <p
            className={`mt-6 text-base leading-7 ${
              hasError ? "text-red-700" : "text-slate-700"
            }`}
          >
            {statusMessage}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg border border-[#0d2140] bg-white px-5 py-3 font-bold text-[#0d2140] transition hover:bg-slate-50"
            >
              View Pricing
            </Link>

            <Link
              href="/login#login-form"
              className="inline-flex items-center justify-center rounded-lg bg-[#0d2140] px-5 py-3 font-bold text-white shadow-md transition hover:bg-[#17345f]"
            >
              Go to Login
            </Link>
          </div>

          <p className="mt-6 text-xs leading-5 text-slate-500">
            Payments and payment-method updates are securely handled by Paddle.
          </p>
        </div>
      </section>
    </main>
  );
}
