"use client";

import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export default function SubscriptionProcessingPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />
      <section className="relative min-h-[calc(100vh-72px)] overflow-hidden px-4 py-12 sm:px-6 lg:px-10">
        <div aria-hidden="true" className="absolute inset-0 bg-[url('/login-background.png')] bg-[length:100%_auto] bg-top bg-repeat-y opacity-65" />
        <div aria-hidden="true" className="absolute inset-0 bg-slate-100/20" />
        <div className="relative z-10 mx-auto max-w-xl rounded-[28px] bg-white/92 p-8 text-center shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-10">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#0d2140]" />
          <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">AB3 Activity Library</p>
          <h1 className="mt-3 text-3xl font-black text-[#0d2140]">Activating your subscription</h1>
          <p className="mt-4 text-base leading-7 text-slate-700">Your checkout was completed. AB3 is waiting for Paddle to confirm the subscription through the secure webhook.</p>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">This page is ready for the subscription-status polling logic that will be added with the Paddle webhook integration.</div>
          <Link href="/subscribe" className="mt-7 inline-flex rounded-lg bg-[#0d2140] px-5 py-3 font-bold text-white shadow-md transition hover:bg-[#17345f]">Return to Subscription Options</Link>
        </div>
      </section>
    </main>
  );
}
