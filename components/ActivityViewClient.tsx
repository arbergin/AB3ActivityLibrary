"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { getStoredActivityById } from "@/lib/activityStorage";
import { mockActivities } from "@/lib/mockActivities";
import type { Activity } from "@/types/activity";

type ActivityViewClientProps = {
  activityId: string;
};

export default function ActivityViewClient({
  activityId,
}: ActivityViewClientProps) {
  const [activity, setActivity] = useState<Activity | undefined>(undefined);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const mockActivity = mockActivities.find((item) => item.id === activityId);
    const storedActivity = getStoredActivityById(activityId);

    setActivity(storedActivity ?? mockActivity);
    setHasLoaded(true);
  }, [activityId]);

  if (!hasLoaded) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-6xl px-8 py-10">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            Loading activity...
          </div>
        </section>
      </main>
    );
  }

  if (!activity) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-6xl px-8 py-10">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Activity not found</h2>
            <p className="mt-2 text-slate-600">
              The activity you are looking for does not exist.
            </p>

            <Link
              href="/search"
              className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Back to Search Results
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-7xl px-8 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{activity.activityName}</h2>
            <p className="mt-2 text-slate-600">
              Open activity view with larger preview and full metadata.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
            >
              Close
            </Link>

            <Link
              href="/"
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold">Large Activity Preview</h3>

              {activity.hidden && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Hidden — admin only
                </span>
              )}
            </div>

            <div className="mt-6 flex min-h-[520px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              <div>
                <div className="font-semibold">PNG/PDF viewer placeholder</div>
                <div className="mt-2 text-sm">Large preview will show here</div>

                {activity.fileName && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    Imported file: {activity.fileName}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">
                Download
              </button>

              <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">
                Edit
              </button>

              <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">
                Hide
              </button>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Activity Metadata</h3>

            <div className="mt-6 grid gap-5 text-sm">
              <div>
                <div className="font-semibold text-slate-700">
                  Activity Name
                </div>
                <div className="mt-1 text-slate-600">
                  {activity.activityName}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div>
                  <div className="font-semibold text-slate-700">
                    Field Location
                  </div>
                  <div className="mt-1 text-slate-600">
                    {activity.fieldLocation}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">
                    Game Phase
                  </div>
                  <div className="mt-1 text-slate-600">
                    {activity.gamePhase}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">Category</div>
                  <div className="mt-1 text-slate-600">
                    {activity.category}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">
                    Number of Players
                  </div>
                  <div className="mt-1 text-slate-600">
                    {activity.numberOfPlayers || "—"}
                  </div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-700">
                  Positions Involved
                </div>
                <div className="mt-1 text-slate-600">
                  {activity.positionsInvolved || "—"}
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-700">
                  Activity Details
                </div>
                <div className="mt-1 text-slate-600">
                  {activity.activityDetails || "—"}
                </div>
              </div>

              {activity.fileName && (
                <div>
                  <div className="font-semibold text-slate-700">
                    Imported File
                  </div>
                  <div className="mt-1 text-slate-600">
                    {activity.fileName}
                  </div>
                </div>
              )}

              <div>
                <div className="font-semibold text-slate-700">Created By</div>
                <div className="mt-1 text-slate-600">{activity.createdBy}</div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}