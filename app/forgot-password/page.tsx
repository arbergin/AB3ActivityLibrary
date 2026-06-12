"use client";

import Link from "next/link";
import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError("");
    setMessage("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setFormError("Email is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const redirectTo = `${window.location.origin}/update-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo,
        }
      );

      if (error) {
        setFormError(error.message);
        setIsSubmitting(false);
        return;
      }

      setMessage(
        "Password reset email sent. Check your inbox and follow the link to create a new password."
      );
      setEmail("");
    } catch (error) {
      console.error("Forgot password error.", error);
      setFormError("Unexpected error while sending password reset email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-xl px-8 py-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Forgot Password</h2>

            <p className="mt-2 text-sm text-slate-600">
              Enter your email address and we’ll send a password reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            {message && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending..." : "Send Reset Email"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <Link href="/login" className="font-semibold text-[#0d2140]">
              Back to Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}