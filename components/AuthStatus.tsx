"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import RoleBadge from "@/components/RoleBadge";
import { signOut } from "@/lib/supabaseAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  ensureUserProfile,
  type UserProfile,
} from "@/lib/userProfile";

export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function loadProfile(sessionUser: User | null) {
    if (!sessionUser) {
      setProfile(null);
      return;
    }

    try {
      const userProfile = await ensureUserProfile(sessionUser);
      setProfile(userProfile);
    } catch (error) {
      console.error("Unable to load profile in header.", error);
      setProfile(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      const sessionUser = data.session?.user ?? null;

      setUser(sessionUser);
      await loadProfile(sessionUser);
      setIsLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;

      setUser(sessionUser);
      await loadProfile(sessionUser);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
      setUser(null);
      setProfile(null);
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out failed.", error);
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300">
        Checking login...
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#0d2140] hover:bg-slate-100"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex max-w-72 flex-wrap items-center gap-2">
        <div className="max-w-56 truncate text-sm font-semibold text-slate-200">
          {user.email}
        </div>

        <RoleBadge role={profile?.role} />
      </div>

      {profile?.role === "admin" && (
        <Link
          href="/admin/users"
          className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-white/10"
        >
          Admin
        </Link>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? "Signing out..." : "Logout"}
      </button>
    </div>
  );
}