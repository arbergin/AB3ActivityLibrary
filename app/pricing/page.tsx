import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="relative min-h-[calc(100vh-72px)] overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/login-background.png')] bg-[length:100%_auto] bg-top bg-repeat-y opacity-65"
        />

        <div aria-hidden="true" className="absolute inset-0 bg-slate-100/20" />

        <div className="relative z-10 mx-auto max-w-5xl rounded-[24px] bg-white/95 p-5 shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-7 lg:p-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500 sm:text-sm">
              Simple pricing
            </p>

            <h1 className="mx-auto mt-2 max-w-4xl text-3xl font-black leading-tight text-[#0d2140] sm:text-4xl lg:text-5xl">
              Professional tools without the professional-tool price
            </h1>

            <p className="mx-auto mt-3 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
              Get the full AB3 Soccer Activity Library for a fraction of the
              cost of competing tools that can run around $60 per year.
            </p>
          </div>

          <div className="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-lg sm:p-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                Monthly
              </p>

              <div className="mt-3 flex items-end justify-center gap-1 text-[#0d2140]">
                <span className="text-5xl font-black">$1.99</span>
                <span className="pb-1 text-base font-semibold text-slate-500">
                  /month
                </span>
              </div>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
                Flexible month-to-month access with no long-term commitment.
              </p>
            </div>

            <div className="relative rounded-3xl border-2 border-[#0d2140] bg-[#0d2140] p-5 text-center text-white shadow-xl sm:p-6">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-5 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-md">
                Best value
              </div>

              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
                Annual
              </p>

              <div className="mt-3 flex items-end justify-center gap-1">
                <span className="text-5xl font-black">$14.99</span>
                <span className="pb-1 text-base font-semibold text-slate-300">
                  /year
                </span>
              </div>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-200 sm:text-base">
                Save nearly 37% compared with paying monthly for a full year.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-4 max-w-4xl rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-center">
            <p className="text-base font-bold text-emerald-900">
              About $45 less per year than a $60 competitor subscription.
            </p>
          </div>

          <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-[#0d2140] px-5 py-3 font-bold text-white shadow-md transition hover:bg-[#17345f]"
            >
              Create Account
            </Link>

            <Link
              href="/login#login-form"
              className="inline-flex items-center justify-center rounded-lg border border-[#0d2140] bg-white px-5 py-3 font-bold text-[#0d2140] transition hover:bg-slate-50"
            >
              Already have an account?
            </Link>
          </div>

          <p className="mx-auto mt-3 max-w-2xl text-center text-xs leading-5 text-slate-500 sm:text-sm">
            Create an account or log in before selecting a subscription so AB3
            can securely connect the Paddle subscription to your account.
          </p>
        </div>
      </section>
    </main>
  );
}
