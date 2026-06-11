"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from "@/lib/supabaseAuth";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoginMode = authMode === "login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError("");
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setFormError("Email is required.");
      return;
    }

    if (!password) {
      setFormError("Password is required.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLoginMode) {
        await signInWithEmailPassword(trimmedEmail, password);
        router.push("/");
        router.refresh();
        return;
      }

      const signUpResult = await signUpWithEmailPassword(
        trimmedEmail,
        password
      );

      if (signUpResult.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your account, then log in."
      );
    } catch (error) {
      console.error("Auth error.", error);

      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setFormError("");
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-xl px-8 py-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              {isLoginMode ? "Login" : "Create Account"}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Use email and password to access the AB3 Activity Library.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                isLoginMode
                  ? "bg-white text-[#0d2140] shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                !isLoginMode
                  ? "bg-white text-[#0d2140] shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Sign Up
            </button>
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

            <label className="grid gap-1">
              <span className="text-sm font-semibold">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Minimum 6 characters"
                autoComplete={isLoginMode ? "current-password" : "new-password"}
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
              {isSubmitting
                ? "Please wait..."
                : isLoginMode
                  ? "Login"
                  : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <Link href="/" className="font-semibold text-[#0d2140]">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}