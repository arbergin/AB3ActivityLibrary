"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  name: string | null;
  email: string | null;
  role: string | null;
  club_id: string | null;
};

type ClubRow = {
  name: string | null;
};

type SubscriptionStatus = {
  status: string;
  plan: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  exempt: boolean;
  hasAccess: boolean;
};

type AccountData = {
  name: string;
  email: string;
  role: string | null;
  clubName: string;
  activityCount: number;
  subscription: SubscriptionStatus;
};

const EMPTY_SUBSCRIPTION: SubscriptionStatus = {
  status: "none",
  plan: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  exempt: false,
  hasAccess: false,
};

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatPlan(value: string | null) {
  if (value === "annual") return "Annual";
  if (value === "monthly") return "Monthly";
  return "N/A";
}

function formatDate(value: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-base font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

export default function AccountClient() {
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);

  const loadAccount = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        throw new Error("Your login session could not be loaded.");
      }

      const user = session.user;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name, email, role, club_id")
        .eq("id", user.id)
        .single<ProfileRow>();

      if (profileError || !profile) {
        throw new Error("Your profile could not be loaded.");
      }

      const ownerEmail = user.email || profile.email || "";

      const activityCountPromise = ownerEmail
        ? supabase
            .from("activities")
            .select("id", { count: "exact", head: true })
            .eq("created_by", ownerEmail)
        : Promise.resolve({ count: 0, error: null });

      const clubPromise = profile.club_id
        ? supabase
            .from("clubs")
            .select("name")
            .eq("id", profile.club_id)
            .maybeSingle<ClubRow>()
        : Promise.resolve({ data: null, error: null });

      const subscriptionPromise = fetch("/api/subscription/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const [activityResult, clubResult, subscriptionResponse] =
        await Promise.all([
          activityCountPromise,
          clubPromise,
          subscriptionPromise,
        ]);

      if (activityResult.error) {
        throw new Error("Your activity count could not be loaded.");
      }

      if (clubResult.error) {
        throw new Error("Your club could not be loaded.");
      }

      let subscription = EMPTY_SUBSCRIPTION;

      if (subscriptionResponse.ok) {
        subscription =
          (await subscriptionResponse.json()) as SubscriptionStatus;
      } else if (subscriptionResponse.status !== 404) {
        throw new Error("Your subscription details could not be loaded.");
      }

      setAccountData({
        name: profile.name?.trim() || "AB3 User",
        email: ownerEmail || "N/A",
        role: profile.role,
        clubName: clubResult.data?.name?.trim() || "N/A",
        activityCount: activityResult.count ?? 0,
        subscription,
      });
    } catch (error) {
      console.error("Unable to load account details.", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Your account details could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("Your new password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Your password has been updated.");
    } catch (error) {
      console.error("Unable to update password.", error);
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Your password could not be updated."
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function handleCancelSubscription() {
    setCancelMessage("");
    setCancelError("");
    setIsCanceling(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Your login session could not be loaded.");
      }

      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = (await response.json()) as {
        error?: string;
        currentPeriodEnd?: string | null;
      };

      if (!response.ok) {
        throw new Error(result.error || "The subscription could not be canceled.");
      }

      setShowCancelConfirmation(false);
      setCancelMessage(
        result.currentPeriodEnd
          ? `Your subscription is scheduled to end on ${formatDate(
              result.currentPeriodEnd
            )}.`
          : "Your subscription is scheduled to end after the current billing period."
      );

      await loadAccount();
    } catch (error) {
      console.error("Unable to cancel subscription.", error);
      setCancelError(
        error instanceof Error
          ? error.message
          : "The subscription could not be canceled."
      );
    } finally {
      setIsCanceling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        Loading account details...
      </div>
    );
  }

  if (loadError || !accountData) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <p className="font-semibold text-red-700">
          {loadError || "Your account details could not be loaded."}
        </p>
        <button
          type="button"
          onClick={loadAccount}
          className="mt-4 rounded-md bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17345f]"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { subscription } = accountData;
  const isAdmin = accountData.role === "admin";
  const canCancel =
    !isAdmin &&
    !subscription.exempt &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "past_due") &&
    !subscription.cancelAtPeriodEnd;

  const renewalLabel = subscription.cancelAtPeriodEnd
    ? "Access Ends"
    : "Next Renewal";

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Account Details</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <DetailItem label="Name" value={accountData.name} />
          <DetailItem label="Email" value={accountData.email} />
          <DetailItem label="Club" value={accountData.clubName} />
          <DetailItem
            label="Activities Created"
            value={accountData.activityCount}
          />
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold">Subscription</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review your current AB3 subscription.
            </p>
          </div>

          {subscription.cancelAtPeriodEnd ? (
            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Cancellation Scheduled
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <DetailItem
            label="Status"
            value={
              isAdmin
                ? "Administrator Access"
                : subscription.exempt
                  ? "Subscription Exempt"
                  : formatStatus(subscription.status)
            }
          />
          <DetailItem label="Plan" value={formatPlan(subscription.plan)} />
          <DetailItem
            label={renewalLabel}
            value={formatDate(subscription.currentPeriodEnd)}
          />
        </div>

        {cancelMessage ? (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            {cancelMessage}
          </div>
        ) : null}

        {cancelError ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {cancelError}
          </div>
        ) : null}

        {subscription.cancelAtPeriodEnd ? (
          <p className="mt-5 text-sm text-slate-600">
            Your subscription remains available through{" "}
            <strong>{formatDate(subscription.currentPeriodEnd)}</strong>. It
            will not renew after that date.
          </p>
        ) : canCancel ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => {
                setCancelError("");
                setShowCancelConfirmation(true);
              }}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Cancel Subscription
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Change Password</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter and confirm your new password.
        </p>

        <form
          onSubmit={handlePasswordChange}
          className="mt-5 max-w-xl space-y-4"
        >
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-semibold text-slate-700"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-[#0d2140] focus:ring-2 focus:ring-[#0d2140]/20"
              required
              minLength={8}
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-semibold text-slate-700"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-[#0d2140] focus:ring-2 focus:ring-[#0d2140]/20"
              required
              minLength={8}
            />
          </div>

          {passwordMessage ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {passwordMessage}
            </div>
          ) : null}

          {passwordError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {passwordError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="rounded-md bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17345f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdatingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>

      {showCancelConfirmation ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-subscription-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2
              id="cancel-subscription-title"
              className="text-xl font-bold text-slate-900"
            >
              Cancel Subscription?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your subscription will remain active through{" "}
              <strong>{formatDate(subscription.currentPeriodEnd)}</strong> and
              will not renew after that date.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCancelConfirmation(false)}
                disabled={isCanceling}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Keep Subscription
              </button>

              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCanceling ? "Scheduling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
