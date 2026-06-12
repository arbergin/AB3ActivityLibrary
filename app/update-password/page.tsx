"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { markCurrentUserPasswordChanged } from "@/lib/userProfile";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setHasSession(Boolean(data.session));
      setIsCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setIsCheckingSession(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError("");
    setMessage("");

    if (!password) {
      setFormError("New password is required.");
      return;
    }

    if (password.length < 6) {
      setFormError("New password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setFormError(error.message);
        setIsSubmitting(false);
        return;
      }

      try {
        await markCurrentUserPasswordChanged();
      } catch (profileError) {
        console.warn(
          "Password was updated, but profile password-reset flag was not updated.",
          profileError
        );
      }

      setMessage("Password updated. Redirecting...");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Update password error.", error);
      setFormError("Unexpected error while updating password.");
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-xl px-8 py-10">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            Checking password reset link...
          </div>
        </section>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-xl px-8 py-10">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Invalid or Expired Link</h2>

            <p className="mt-2 text-sm text-slate-600">
              This password reset link is invalid or has expired. Request a new
              password reset email.
            </p>

            <div className="mt-6">
              <a
                href="/forgot-password"
                className="inline-block rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
              >
                Request New Reset Link
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-xl px-8 py-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Update Password</h2>

            <p className="mt-2 text-sm text-slate-600">
              Enter a new password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-semibold">New Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">
                Confirm New Password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Re-enter new password"
                autoComplete="new-password"
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
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}