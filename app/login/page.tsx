"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { signInWithEmailPassword } from "@/lib/supabaseAuth";

type PossibleSignInResult =
  | {
      session?: {
        access_token?: string | null;
      } | null;
      data?: {
        session?: {
          access_token?: string | null;
        } | null;
      } | null;
    }
  | undefined
  | null;

function getAccessTokenFromSignInResult(result: PossibleSignInResult) {
  return (
    result?.session?.access_token || result?.data?.session?.access_token || null
  );
}

function getSupabaseAccessTokenFromLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) {
      continue;
    }

    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      continue;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as {
        access_token?: string;
        currentSession?: {
          access_token?: string;
        };
      };

      const accessToken =
        parsedValue.access_token || parsedValue.currentSession?.access_token;

      if (accessToken) {
        return accessToken;
      }
    } catch {
      // Ignore non-JSON local storage values.
    }
  }

  return null;
}

async function logSuccessfulLogin(accessToken: string) {
  const response = await fetch("/api/audit/login", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const responseBody = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    console.error(
      "Login succeeded, but the audit log could not be saved.",
      responseBody?.error || response.statusText
    );
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setFormError("Email is required.");
      return;
    }

    if (!password) {
      setFormError("Password is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const signInResult = (await signInWithEmailPassword(
        trimmedEmail,
        password
      )) as PossibleSignInResult;

      const accessToken =
        getAccessTokenFromSignInResult(signInResult) ||
        getSupabaseAccessTokenFromLocalStorage();

      if (accessToken) {
        await logSuccessfulLogin(accessToken);
      } else {
        console.error(
          "Login succeeded, but no Supabase access token was available for audit logging."
        );
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Login error.", error);

      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="relative min-h-[calc(100vh-72px)] overflow-hidden px-8 py-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/login-background.png')] bg-cover bg-center bg-no-repeat opacity-50"
        />

        <div aria-hidden="true" className="absolute inset-0 bg-slate-100/20" />

        <div className="relative z-10 mx-auto max-w-xl">
          <div className="rounded-xl bg-white/90 p-6 shadow-lg ring-1 ring-slate-200/80 backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Login</h2>

              <p className="mt-2 text-sm text-slate-600">
                Use the email and password provided by an admin.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>

              <label className="grid gap-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold">Password</span>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-[#0d2140]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </label>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600">
              Need access? Ask an admin to create your account.
            </div>

            <div className="mt-6 text-center text-sm text-slate-600">
              <Link href="/" className="font-semibold text-[#0d2140]">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
