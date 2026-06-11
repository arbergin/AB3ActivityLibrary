"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type ProtectedPageProps = {
  children: React.ReactNode;
};

export default function ProtectedPage({ children }: ProtectedPageProps) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      setUser(data.session.user);
      setHasCheckedAuth(true);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setUser(session.user);
      setHasCheckedAuth(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

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