"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { signUpForAB3 } from "@/lib/supabaseSignup";

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError("");

    if (!firstName.trim()) return setFormError("First name is required.");
    if (!lastName.trim()) return setFormError("Last name is required.");
    if (!email.trim()) return setFormError("Email is required.");
    if (password.length < 8) return setFormError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setFormError("The passwords do not match.");

    setIsSubmitting(true);
    try {
      const result = await signUpForAB3({ firstName, lastName, email, password });
      if (result.requiresEmailConfirmation) {
        setConfirmationEmail(email.trim());
      } else {
        router.push("/subscribe");
        router.refresh();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />
      <section className="relative min-h-[calc(100vh-72px)] overflow-hidden px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <div aria-hidden="true" className="absolute inset-0 bg-[url('/login-background.png')] bg-[length:100%_auto] bg-top bg-repeat-y opacity-65" />
        <div aria-hidden="true" className="absolute inset-0 bg-slate-100/20" />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-12">
          <section className="rounded-[28px] bg-white/92 p-7 shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-9">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">AB3 Activity Library</p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-[#0d2140] sm:text-4xl">Create your account</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">Create, organize, animate, and find your soccer activities in one user-friendly library.</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {["Create professional activity diagrams", "Turn activity frames into animations", "Organize activities with searchable details", "Sync supported activities with the iOS app"].map((feature) => (
                <div key={feature} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                  <p className="font-semibold leading-6 text-[#0d2140]">{feature}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl bg-[#0d2140] p-6 text-white shadow-lg">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">Simple pricing</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><p className="text-2xl font-black">$1.99/month</p><p className="mt-1 text-sm text-slate-300">Flexible monthly access</p></div>
                <div><p className="text-2xl font-black">$14.99/year</p><p className="mt-1 text-sm text-slate-300">Save $8.89 annually</p></div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl bg-white/92 p-6 shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-7">
            {confirmationEmail ? (
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
                <h2 className="mt-5 text-2xl font-black text-[#0d2140]">Check your email</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">We sent a confirmation link to <strong>{confirmationEmail}</strong>. Confirm your email, then log in to choose your subscription.</p>
                <Link href="/login?next=/subscribe" className="mt-6 inline-flex w-full justify-center rounded-lg bg-[#0d2140] px-4 py-3 font-bold text-white shadow-md transition hover:bg-[#17345f]">Go to Login</Link>
              </div>
            ) : (
              <>
                <div className="mb-6"><h2 className="text-2xl font-black text-[#0d2140]">Sign Up</h2><p className="mt-2 text-sm leading-6 text-slate-600">Confirm your email before completing your subscription.</p></div>
                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1"><span className="text-sm font-semibold">First name</span><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2" autoComplete="given-name" /></label>
                    <label className="grid gap-1"><span className="text-sm font-semibold">Last name</span><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2" autoComplete="family-name" /></label>
                  </div>
                  <label className="grid gap-1"><span className="text-sm font-semibold">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="you@example.com" autoComplete="email" /></label>
                  <label className="grid gap-1"><span className="text-sm font-semibold">Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="At least 8 characters" autoComplete="new-password" /></label>
                  <label className="grid gap-1"><span className="text-sm font-semibold">Confirm password</span><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2" autoComplete="new-password" /></label>
                  {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
                  <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#0d2140] px-4 py-3 font-bold text-white shadow-md transition hover:bg-[#17345f] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Creating account..." : "Create Account"}</button>
                </form>

                <p className="mt-5 text-xs leading-5 text-slate-500">By creating an account, you agree to the <Link href="/terms-of-service" className="font-semibold text-[#0d2140] underline">Terms of Service</Link> and acknowledge the <Link href="/privacy-policy" className="font-semibold text-[#0d2140] underline">Privacy Policy</Link> and <Link href="/refund-policy" className="font-semibold text-[#0d2140] underline">Refund Policy</Link>.</p>
                <div className="mt-5 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">Already have an account? <Link href="/login" className="font-bold text-[#0d2140]">Log in</Link></div>
              </>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
