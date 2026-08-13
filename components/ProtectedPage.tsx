"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { ensureUserProfile } from "@/lib/userProfile";

type ProtectedPageProps = {
  children: React.ReactNode;
};

const AUTH_TIMEOUT_MS = 10000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);
    }),
  ]);
}

export default function ProtectedPage({ children }: ProtectedPageProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Prevent an older async auth check from overwriting a newer one.
  const authCheckIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function finishAuthCheck(session: Session | null) {
      const checkId = ++authCheckIdRef.current;
      const sessionUser = session?.user ?? null;

      if (!sessionUser) {
        if (isMounted && checkId === authCheckIdRef.current) {
          setUser(null);
          setHasCheckedAuth(true);
          router.replace("/login");
        }
        return;
      }

      try {
        const profile = await withTimeout(
          ensureUserProfile(sessionUser),
          AUTH_TIMEOUT_MS,
          "Timed out while checking the user profile.",
        );

        if (!isMounted || checkId !== authCheckIdRef.current) {
          return;
        }

        if (
          profile.must_change_password &&
          pathname !== "/reset-password"
        ) {
          setUser(sessionUser);
          setHasCheckedAuth(true);
          router.replace("/reset-password");
          return;
        }
      } catch (error) {
        // A profile lookup failure should not leave the app permanently
        // stuck on "Checking login...".
        console.error("Unable to check profile access.", error);
      }

      if (!isMounted || checkId !== authCheckIdRef.current) {
        return;
      }

      setUser(sessionUser);
      setHasCheckedAuth(true);
    }

    async function checkAuth() {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          "Timed out while checking the login session.",
        );

        if (!isMounted) {
          return;
        }

        if (error) {
          console.error("Unable to get auth session.", error);
        }

        await finishAuthCheck(data.session ?? null);
      } catch (error) {
        console.error("Unable to initialize authentication.", error);

        if (!isMounted) {
          return;
        }

        // Do not leave the page permanently stuck if Supabase fails to respond.
        setUser(null);
        setHasCheckedAuth(true);
        router.replace("/login");
      }
    }

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      /*
       * Keep the Supabase auth callback synchronous.
       *
       * Supabase recommends avoiding awaited Supabase/database work directly
       * inside onAuthStateChange callbacks. Scheduling the async profile check
       * for the next task prevents the auth callback from blocking Supabase's
       * internal auth processing.
       */
      window.setTimeout(() => {
        if (isMounted) {
          void finishAuthCheck(session);
        }
      }, 0);
    });

    return () => {
      isMounted = false;
      authCheckIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!hasCheckedAuth || !user) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <div className="mx-auto max-w-4xl px-8 py-10">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            Checking login...
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
