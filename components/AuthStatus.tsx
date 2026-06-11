"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/supabaseAuth";
import { supabase } from "@/lib/supabaseClient";

export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setUser(data.session?.user ?? null);
      setIsLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out failed.", error);
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <div className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-slate-300">
        Checking login...
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#0d2140] hover:bg-slate-100"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="max-w-48 truncate text-sm font-semibold text-slate-200">
        {user.email}
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="whitespace-nowrap rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? "Signing out..." : "Logout"}
      </button>
    </div>
  );
}