"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import AppHeader from "@/components/AppHeader";
import PaddleCheckoutButton from "@/components/PaddleCheckoutButton";
import { getCurrentAB3User } from "@/lib/supabaseSignup";

const monthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID || undefined;
const annualPriceId = process.env.NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID || undefined;

export default function SubscribePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const currentUser = await getCurrentAB3User();
        if (cancelled) return;
        if (!currentUser) return router.replace("/login?next=/subscribe");
        setUser(currentUser);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load your account.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadUser();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />
      <section className="relative min-h-[calc(100vh-72px)] overflow-hidden px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <div aria-hidden="true" className="absolute inset-0 bg-[url('/login-background.png')] bg-[length:100%_auto] bg-top bg-repeat-y opacity-65" />
        <div aria-hidden="true" className="absolute inset-0 bg-slate-100/20" />
        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <div className="rounded-[28px] bg-white/92 p-6 shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-9">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">AB3 Activity Library</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-[#0d2140] sm:text-4xl">Choose your subscription</h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">Both plans include full access to activity creation, animations, organization, search, supported exports, and iOS synchronization.</p>
            </div>

            {isLoading && <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-slate-600">Loading your account...</div>}
            {loadError && <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-red-700">{loadError}</div>}

            {!isLoading && user && (
              <>
                <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
                  <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Monthly</p>
                    <div className="mt-4 flex items-end gap-1 text-[#0d2140]"><span className="text-5xl font-black">$1.99</span><span className="pb-1 font-semibold text-slate-500">/month</span></div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">Flexible month-to-month access with no annual commitment.</p>
                    <ul className="mt-6 grid gap-3 text-sm leading-6 text-slate-700"><li>✓ Full Activity Library access</li><li>✓ Create and animate activities</li><li>✓ Organize, search, import, and export</li><li>✓ Supported iOS app synchronization</li></ul>
                    <div className="mt-auto pt-8"><PaddleCheckoutButton plan="monthly" priceId={monthlyPriceId} userId={user.id} email={user.email || ""} className="bg-white text-[#0d2140] ring-1 ring-[#0d2140] hover:bg-slate-50" /></div>
                  </article>

                  <article className="relative flex flex-col rounded-3xl border-2 border-[#0d2140] bg-[#0d2140] p-6 text-white shadow-xl sm:p-8">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-black uppercase tracking-wide text-white shadow-md">Best value</div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-300">Annual</p>
                    <div className="mt-4 flex items-end gap-1"><span className="text-5xl font-black">$14.99</span><span className="pb-1 font-semibold text-slate-300">/year</span></div>
                    <p className="mt-4 text-sm font-semibold leading-6 text-emerald-300">Save $8.89 compared with 12 monthly payments.</p>
                    <ul className="mt-6 grid gap-3 text-sm leading-6 text-slate-200"><li>✓ Everything included in monthly</li><li>✓ Approximately $1.25 per month</li><li>✓ One annual renewal</li><li>✓ Cancel before the next renewal</li></ul>
                    <div className="mt-auto pt-8"><PaddleCheckoutButton plan="annual" priceId={annualPriceId} userId={user.id} email={user.email || ""} className="bg-white text-[#0d2140] hover:bg-slate-100" /></div>
                  </article>
                </div>

                {(!monthlyPriceId || !annualPriceId) && <div className="mx-auto mt-7 max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm leading-6 text-amber-900">The subscription pages are ready, but Paddle Checkout remains disabled until the sandbox client token and price IDs are added.</div>}
                <p className="mx-auto mt-7 max-w-3xl text-center text-xs leading-5 text-slate-500">Subscriptions renew automatically until canceled. By subscribing, you agree to the <Link href="/terms-of-service" className="font-semibold text-[#0d2140] underline">Terms of Service</Link> and acknowledge the <Link href="/privacy-policy" className="font-semibold text-[#0d2140] underline">Privacy Policy</Link> and <Link href="/refund-policy" className="font-semibold text-[#0d2140] underline">Refund Policy</Link>.</p>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
