"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import {
  getCurrentUserProfile,
  isAdminProfile,
  type UserProfile,
} from "@/lib/userProfile";
import {
  getRecentLoginAudit,
  type LoginAuditEntry,
} from "@/lib/userManagement";

export default function LoginAuditPage() {
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [auditEntries, setAuditEntries] = useState<LoginAuditEntry[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = isAdminProfile(profile);

  async function loadAuditEntries() {
    setIsLoadingAudit(true);
    setMessage("");

    try {
      const entries = await getRecentLoginAudit(100);
      setAuditEntries(entries);
    } catch (error) {
      console.error("Unable to load login audit entries.", error);
      setMessage(
        "Unable to load login audit entries. Confirm the audit table and RLS policies are correct."
      );
    } finally {
      setIsLoadingAudit(false);
    }
  }

  useEffect(() => {
    async function loadPage() {
      setIsLoadingProfile(true);
      setMessage("");

      try {
        const currentProfile = await getCurrentUserProfile();
        setProfile(currentProfile);

        if (currentProfile?.role === "admin") {
          await loadAuditEntries();
        }
      } catch (error) {
        console.error("Unable to load current user profile.", error);
        setMessage("Unable to load your user profile.");
      } finally {
        setIsLoadingProfile(false);
      }
    }

    loadPage();
  }, []);

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-6xl px-8 py-10">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Login Audit</h2>
              <p className="mt-2 text-slate-600">
                Review recent successful user logins.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/settings"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Settings
              </Link>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={loadAuditEntries}
                  disabled={isLoadingAudit}
                  className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white transition hover:bg-[#15345f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingAudit ? "Refreshing..." : "Refresh Audit"}
                </button>
              ) : null}
            </div>
          </div>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            {message ? (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {message}
              </div>
            ) : null}

            {isLoadingProfile ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Loading user access...
              </div>
            ) : !isAdmin ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Login audit is available to admins only.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[1fr_1.2fr_1fr_1.2fr_0.8fr] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                  <div>Name</div>
                  <div>Email</div>
                  <div>Login Time</div>
                  <div>User Agent</div>
                  <div>IP Address</div>
                </div>

                {isLoadingAudit ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    Loading audit entries...
                  </div>
                ) : auditEntries.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No login audit entries found yet.
                  </div>
                ) : (
                  auditEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[1fr_1.2fr_1fr_1.2fr_0.8fr] items-start border-t border-slate-200 px-4 py-4 text-sm"
                    >
                      <div className="font-semibold text-slate-800">
                        {entry.name || "—"}
                      </div>
                      <div className="break-words text-slate-700">
                        {entry.email || "—"}
                      </div>
                      <div className="text-slate-600">
                        {entry.login_at
                          ? new Date(entry.login_at).toLocaleString()
                          : "—"}
                      </div>
                      <div className="break-words text-xs text-slate-500">
                        {entry.user_agent || "—"}
                      </div>
                      <div className="break-words text-xs text-slate-500">
                        {entry.ip_address || "—"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </section>
      </main>
    </ProtectedPage>
  );
}
