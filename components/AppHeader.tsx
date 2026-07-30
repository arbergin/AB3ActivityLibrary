"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

const DISPLAY_NAME_STORAGE_KEY = "ab3_user_display_name";
const USER_ROLE_STORAGE_KEY = "ab3_user_role";
const IS_LOGGED_IN_STORAGE_KEY = "ab3_is_logged_in";

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06A2 2 0 1 1 7.03 3.8l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function readStorageValue(key: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || "";
}

export default function AppHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const cachedIsLoggedIn =
      readStorageValue(IS_LOGGED_IN_STORAGE_KEY) === "true";
    const cachedDisplayName = readStorageValue(DISPLAY_NAME_STORAGE_KEY);
    const cachedUserRole = readStorageValue(USER_ROLE_STORAGE_KEY) || null;

    if (cachedIsLoggedIn) {
      setIsLoggedIn(true);
      setDisplayName(cachedDisplayName);
      setUserRole(cachedUserRole);
    }

    async function refreshUserProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session?.user) {
        setIsLoggedIn(false);
        setDisplayName("");
        setUserRole(null);

        window.localStorage.removeItem(IS_LOGGED_IN_STORAGE_KEY);
        window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
        window.localStorage.removeItem(USER_ROLE_STORAGE_KEY);
        return;
      }

      setIsLoggedIn(true);
      window.localStorage.setItem(IS_LOGGED_IN_STORAGE_KEY, "true");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("id", session.user.id)
        .single<ProfileRow>();

      if (!isMounted) return;

      const latestName = profile?.name?.trim() || "";
      const latestRole = profile?.role || null;

      setDisplayName(latestName);
      setUserRole(latestRole);

      if (latestName) {
        window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, latestName);
      } else {
        window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
      }

      if (latestRole) {
        window.localStorage.setItem(USER_ROLE_STORAGE_KEY, latestRole);
      } else {
        window.localStorage.removeItem(USER_ROLE_STORAGE_KEY);
      }
    }

    refreshUserProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsLoggedIn(false);
        setDisplayName("");
        setUserRole(null);

        window.localStorage.removeItem(IS_LOGGED_IN_STORAGE_KEY);
        window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
        window.localStorage.removeItem(USER_ROLE_STORAGE_KEY);
        return;
      }

      setIsLoggedIn(true);
      window.localStorage.setItem(IS_LOGGED_IN_STORAGE_KEY, "true");

      supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("id", session.user.id)
        .single<ProfileRow>()
        .then(({ data: profile }) => {
          const latestName = profile?.name?.trim() || "";
          const latestRole = profile?.role || null;

          setDisplayName(latestName);
          setUserRole(latestRole);

          if (latestName) {
            window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, latestName);
          } else {
            window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
          }

          if (latestRole) {
            window.localStorage.setItem(USER_ROLE_STORAGE_KEY, latestRole);
          } else {
            window.localStorage.removeItem(USER_ROLE_STORAGE_KEY);
          }
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed.", error);
      return;
    }

    setIsLoggedIn(false);
    setDisplayName("");
    setUserRole(null);

    window.localStorage.removeItem(IS_LOGGED_IN_STORAGE_KEY);
    window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
    window.localStorage.removeItem(USER_ROLE_STORAGE_KEY);

    window.location.replace("/login");
  }

  const isAdmin = userRole === "admin";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d2140] text-white shadow-sm">
      <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 flex-shrink items-center gap-2 sm:gap-3"
        >
          <Image
            src="/ab3-activity-library-logo.png"
            alt="AB3 Soccer Activity Library"
            width={44}
            height={44}
            priority
            className="h-11 w-11 flex-shrink-0 rounded-md object-contain"
          />

          <span className="hidden truncate text-lg font-bold tracking-tight sm:block sm:text-xl">
            AB3 Soccer Activity Library
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:flex-initial sm:gap-3">
          <nav className="flex min-w-0 items-center gap-0 sm:gap-2">
            <Link
              href="/"
              aria-label="Home"
              title="Home"
              className="rounded-md px-2 py-2 text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              <HomeIcon />
            </Link>

            <Link
              href="/create"
              className="rounded-md px-1.5 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-white sm:px-3 sm:text-sm"
            >
              Create
            </Link>

            <Link
              href="/search"
              className="rounded-md px-1.5 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-white sm:px-3 sm:text-sm"
            >
              Search
            </Link>

            <Link
              href="/import"
              className="rounded-md px-1.5 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-white sm:px-3 sm:text-sm"
            >
              Import
            </Link>
          </nav>

          <div className="ml-1 flex min-w-0 flex-shrink-0 items-center justify-end gap-1 border-l border-white/20 pl-2 sm:ml-2 sm:min-w-[220px] sm:gap-3 sm:pl-4">
            {isLoggedIn ? (
              <>
                <Link
                  href="/account"
                  title="My Account"
                  aria-label="My Account"
                  className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  <span className="sm:hidden">
                    <AccountIcon />
                  </span>
                  <span className="hidden max-w-[140px] truncate sm:inline">
                    {displayName || "My Account"}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="whitespace-nowrap rounded-md bg-white px-2.5 py-2 text-sm font-semibold text-[#0d2140] transition hover:bg-slate-100 sm:px-3"
                >
                  Logout
                </button>

                {isAdmin ? (
                  <Link
                    href="/settings"
                    aria-label="Settings"
                    title="Settings"
                    className="rounded-md px-2 py-2 text-white/90 transition hover:bg-white/10 hover:text-white"
                  >
                    <SettingsIcon />
                  </Link>
                ) : (
                  <span className="hidden h-9 w-9 sm:block" aria-hidden="true" />
                )}
              </>
            ) : (
              <>
                <span
                  className="hidden max-w-[140px] truncate text-sm font-semibold text-white/90 sm:inline"
                  aria-hidden="true"
                />

                <Link
                  href="/login#login-form"
                  className="whitespace-nowrap rounded-md bg-white px-2.5 py-2 text-sm font-semibold text-[#0d2140] transition hover:bg-slate-100 sm:px-3"
                >
                  Login
                </Link>

                <span className="hidden h-9 w-9 sm:block" aria-hidden="true" />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
