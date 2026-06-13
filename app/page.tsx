"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import {
  getRecentCreatedActivitiesForCurrentUser,
  getRecentOpenedActivitiesForCurrentUser,
} from "@/lib/dashboardActivities";
import type { Activity } from "@/types/activity";

function formatDate(dateValue?: string) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ActivityToolsCard() {
  return (
    <section className="grid h-72 grid-rows-2 gap-4 rounded-xl bg-white p-6 shadow-sm">
      <Link
        href="/create"
        className="flex min-h-0 flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
      >
        <div className="text-lg font-bold">Create Activity</div>
        <p className="mt-2 text-sm leading-5 text-slate-600">
          Build a new editable activity on the pitch.
        </p>
      </Link>

      <Link
        href="/search"
        className="flex min-h-0 flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
      >
        <div className="text-lg font-bold">Search Library</div>
        <p className="mt-2 text-sm leading-5 text-slate-600">
          Find activities by name, field location, game phase, category,
          positions, number of players, or details.
        </p>
      </Link>
    </section>
  );
}

function ImportOptionsCard() {
  return (
    <section className="grid h-72 grid-rows-2 gap-4 rounded-xl bg-white p-6 shadow-sm">
      <Link
        href="/import"
        className="flex min-h-0 flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
      >
        <div className="text-lg font-bold">Import Single Activity</div>
        <p className="mt-2 text-sm leading-5 text-slate-600">
          Upload single PNG or PDF activity file and add searchable metadata.
        </p>
      </Link>

      <Link
        href="/import/bulk"
        className="flex min-h-0 flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
      >
        <div className="text-lg font-bold">Import Bulk Activities</div>
        <p className="mt-2 text-sm leading-5 text-slate-600">
          Upload multiple PNG or PDF activities with .csv file.
        </p>
      </Link>
    </section>
  );
}

function ActivityList({
  title,
  emptyMessage,
  activities,
  isLoading,
}: {
  title: string;
  emptyMessage: string;
  activities: Activity[];
  isLoading: boolean;
}) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold">{title}</h3>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          activities.map((activity) => (
            <Link
              key={activity.id}
              href={`/activity/${activity.id}`}
              className="block border-t border-slate-200 px-4 py-4 first:border-t-0 hover:bg-slate-50"
            >
              <div className="font-semibold text-slate-800">
                {activity.activityName}
              </div>

              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{activity.fieldLocation || "No location"}</span>
                <span>{activity.gamePhase || "No phase"}</span>
                <span>{activity.category || "No category"}</span>
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Created: {formatDate(activity.createdAt)}
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [createdActivities, setCreatedActivities] = useState<Activity[]>([]);
  const [openedActivities, setOpenedActivities] = useState<Activity[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardActivities() {
      setIsLoadingDashboard(true);

      try {
        const [recentCreated, recentOpened] = await Promise.all([
          getRecentCreatedActivitiesForCurrentUser(),
          getRecentOpenedActivitiesForCurrentUser(),
        ]);

        if (!isMounted) {
          return;
        }

        setCreatedActivities(recentCreated);
        setOpenedActivities(recentOpened);
      } catch (error) {
        console.error("Unable to load dashboard activities.", error);
      } finally {
        if (isMounted) {
          setIsLoadingDashboard(false);
        }
      }
    }

    loadDashboardActivities();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="mt-2 text-slate-600">
              Welcome to the AB3 Activity Library. Create, import, organize,
              search, and manage soccer training activities.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid grid-rows-[288px_auto] gap-6">
              <ActivityToolsCard />

              <ActivityList
                title="My Activities"
                emptyMessage="No activities created by you yet."
                activities={createdActivities}
                isLoading={isLoadingDashboard}
              />
            </div>

            <div className="grid grid-rows-[288px_auto] gap-6">
              <ImportOptionsCard />

              <ActivityList
                title="Recent Activities"
                emptyMessage="No recently opened activities yet."
                activities={openedActivities}
                isLoading={isLoadingDashboard}
              />
            </div>
          </div>
        </section>
      </main>
    </ProtectedPage>
  );
}