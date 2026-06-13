"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ActivityCreator from "@/components/ActivityCreator";
import ProtectedPage from "@/components/ProtectedPage";
import { getStoredActivityById } from "@/lib/activityStorage";
import { getSupabaseActivityById } from "@/lib/supabaseActivities";
import type { Activity } from "@/types/activity";

type ActivityEditClientProps = {
  activityId: string;
};

export default function ActivityEditClient({ activityId }: ActivityEditClientProps) {
  const [activity, setActivity] = useState<Activity | undefined>(undefined);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      setHasLoaded(false);

      try {
        const supabaseActivity = await getSupabaseActivityById(activityId);

        if (!isMounted) {
          return;
        }

        if (supabaseActivity) {
          setActivity(supabaseActivity);
          setHasLoaded(true);
          return;
        }
      } catch (error) {
        console.error("Unable to load editable activity from Supabase.", error);
      }

      const storedActivity = getStoredActivityById(activityId);

      if (!isMounted) {
        return;
      }

      setActivity(storedActivity);
      setHasLoaded(true);
    }

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, [activityId]);

  if (!hasLoaded) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100 text-slate-900">
          <AppHeader />

          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              Loading activity editor...
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  if (!activity) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100 text-slate-900">
          <AppHeader />

          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold">Activity not found</h2>
              <p className="mt-2 text-slate-600">
                This activity could not be found.
              </p>

              <Link
                href="/search"
                className="mt-6 inline-block rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
              >
                Back to Search
              </Link>
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  if (!activity.creatorState) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100 text-slate-900">
          <AppHeader />

          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold">This activity is not editable</h2>
              <p className="mt-2 text-slate-600">
                Imported PNG/PDF activities can be viewed and managed, but only
                activities created with the Activity Creator can be reopened and
                edited on the pitch.
              </p>

              <Link
                href={`/activity/${activity.id}`}
                className="mt-6 inline-block rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
              >
                Back to Activity
              </Link>
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Edit Activity</h2>
              <p className="mt-2 text-slate-600">
                Adjust the saved pitch icons, lines, colors, and metadata.
              </p>
            </div>

            <Link
              href={`/activity/${activity.id}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
            >
              Back to Activity
            </Link>
          </div>

          <ActivityCreator initialActivity={activity} />
        </section>
      </main>
    </ProtectedPage>
  );
}
