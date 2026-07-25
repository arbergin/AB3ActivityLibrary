"use client";

import { useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

type Plan = "monthly" | "annual";
type Props = { plan: Plan; priceId?: string; userId: string; email: string; className?: string };
let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddle() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox";
  if (!token) return Promise.resolve(undefined);
  if (!paddlePromise) paddlePromise = initializePaddle({ token, environment });
  return paddlePromise;
}

export default function PaddleCheckoutButton({ plan, priceId, userId, email, className = "" }: Props) {
  const [isOpening, setIsOpening] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const configured = Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN && priceId);

  async function openCheckout() {
    if (!configured || !priceId || isOpening) return;
    setIsOpening(true);
    setErrorMessage("");

    try {
      const paddle = await getPaddle();
      if (!paddle) throw new Error("Paddle Checkout is not configured.");

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email },
        customData: { supabase_user_id: userId, plan },
        settings: {
          displayMode: "overlay",
          theme: "light",
          successUrl: `${window.location.origin}/subscription/processing`,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to open checkout.");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openCheckout}
        disabled={!configured || isOpening}
        className={`w-full rounded-xl px-5 py-3 font-bold shadow-md transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {!configured ? "Checkout setup pending" : isOpening ? "Opening checkout..." : `Choose ${plan === "monthly" ? "Monthly" : "Annual"}`}
      </button>
      {!configured && <p className="mt-3 text-center text-xs leading-5 text-slate-500">Add the Paddle sandbox client token and this plan&apos;s price ID to enable checkout.</p>}
      {errorMessage && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
    </div>
  );
}
