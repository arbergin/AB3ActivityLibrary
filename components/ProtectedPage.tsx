"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { ensureUserProfile } from "@/lib/userProfile";

type ProtectedPageProps = {
  children: React.ReactNode;
};

export default function ProtectedPage({ children }: ProtectedPageProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      const sessionUser = data.session?.user ?? null;

      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      try {
        const profile = await ensureUserProfile(sessionUser);

        if (profile.must_change_password && pathname !== "/reset-password") {
          router.replace("/reset-password");
          return;
        }
      } catch (error) {
        console.error("Unable to check profile access.", error);
      }

      setUser(sessionUser);
      setHasCheckedAuth(true);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;

      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      try {
        const profile = await ensureUserProfile(sessionUser);

        if (profile.must_change_password && pathname !== "/reset-password") {
          router.replace("/reset-password");
          return;
        }
      } catch (error) {
        console.error("Unable to check profile access.", error);
      }

      setUser(sessionUser);
      setHasCheckedAuth(true);
    });

    return () => {
      isMounted = false;
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