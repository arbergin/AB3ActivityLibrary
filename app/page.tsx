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
import { canManageActivity } from "@/lib/activityPermissions";
import {
  getCurrentUserProfile,
  type UserProfile,
} from "@/lib/userProfile";

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

function DashboardActionIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
    />
  );
}

function ActivityToolsCard() {
  return (
    <section className="grid h-72 grid-rows-2 gap-4 rounded-xl bg-white p-6 shadow-sm">
      <Link
        href="/create"
        className="flex min-h-0 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
      >
        <div className="min-w-0">
          <div className="text-lg font-bold">Create Activity</div>
          <p className="mt-2 text-sm leading-5 text-slate-600">
            Build a new editable activity on the pitch.
          </p>
        </div>

        <DashboardActionIcon src="/create.png" alt="Create Activity" />
      </Link>

      <Link
        href="/search"
        className="flex min-h-0 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
      >
        <div className="min-w-0">
          <div className="text-lg font-bold">Search Library</div>
          <p className="mt-2 text-sm leading-5 text-slate-600">
            Find activities by name, field location, game phase, category,
            positions, number of players, or details.
          </p>
        </div>

        <DashboardActionIcon src="/search.png" alt="Search Library" />
      </Link>
    </section>
  );
}

function ImportOptionsCard() {
  return (
    <section className="grid h-72 grid-rows-2 gap-4 rounded-xl bg-white p-6 shadow-sm">
      <Link
        href="/import"
        className="flex min-h-0 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
      >
        <div className="min-w-0">
          <div className="text-lg font-bold">Import Single Activity</div>
          <p className="mt-2 text-sm leading-5 text-slate-600">
            Upload single PNG or PDF activity file and add searchable metadata.
          </p>
        </div>

        <DashboardActionIcon
          src="/import_single_activity.png"
          alt="Import Single Activity"
        />
      </Link>

      <Link
        href="/import/bulk"
        className="flex min-h-0 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
      >
        <div className="min-w-0">
          <div className="text-lg font-bold">Import Bulk Activities</div>
          <p className="mt-2 text-sm leading-5 text-slate-600">
            Upload multiple PNG or PDF activities with .csv file.
          </p>
        </div>

        <DashboardActionIcon
          src="/import_bulk_activities.png"
          alt="Import Bulk Activities"
        />
      </Link>
    </section>
  );
}

function ActivityList({
  title,
  titleHref,
  emptyMessage,
  activities,
  isLoading,
  currentProfile,
}: {
  title: string;
  titleHref?: string;
  emptyMessage: string;
  activities: Activity[];
  isLoading: boolean;
  currentProfile: UserProfile | null;
}) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {titleHref ? (
          <Link
            href={titleHref}
            className="text-lg font-bold text-slate-900 underline-offset-4 hover:underline"
          >
            {title}
          </Link>
        ) : (
          <h3 className="text-lg font-bold">{title}</h3>
        )}

        {titleHref ? (
          <Link
            href={titleHref}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View all
          </Link>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">{emptyMessage}</div>
        ) : (
          activities.map((activity) => {
            const canEditActivity = canManageActivity(
              activity,
              currentProfile
            );

            return (
              <div
                key={activity.id}
                className="flex items-center justify-between gap-4 border-t border-slate-200 px-4 py-4 first:border-t-0 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-800">
                    {activity.activityName}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{activity.fieldLocation || "No location"}</span>
                    <span>{activity.gamePhase || "No phase"}</span>
                    <span>{activity.category || "No category"}</span>
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    Updated: {formatDate(activity.updatedAt || activity.createdAt)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/activity/${activity.id}`}
                    className="rounded-md bg-[#0d2140] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#17345f]"
                  >
                    Open
                  </Link>

                  {canEditActivity && (
                    <Link
                      href={`/activity/${activity.id}/edit`}
                      className="rounded-md border border-[#0d2140] bg-white px-3 py-1.5 text-xs font-semibold text-[#0d2140] transition hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [createdActivities, setCreatedActivities] = useState<Activity[]>([]);
  const [openedActivities, setOpenedActivities] = useState<Activity[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardActivities() {
      setIsLoadingDashboard(true);

      try {
        const [recentCreated, recentOpened, profile] = await Promise.all([
          getRecentCreatedActivitiesForCurrentUser(),
          getRecentOpenedActivitiesForCurrentUser(),
          getCurrentUserProfile(),
        ]);

        if (!isMounted) {
          return;
        }

        setCreatedActivities(recentCreated);
        setOpenedActivities(recentOpened);
        setCurrentProfile(profile ?? null);
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
      <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/dashboard_background.png')] bg-cover bg-center bg-no-repeat opacity-65"
        />

        <div className="relative z-10">
          <AppHeader />

          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <div className="mb-8 w-full rounded-xl bg-[#0d2140] px-5 py-4 shadow-lg backdrop-blur-sm">
              <h2 className="text-3xl font-bold text-white">Dashboard</h2>
              <p className="mt-2 text-slate-200 lg:whitespace-nowrap">
                Welcome to the AB3 Soccer Activity Library. Create, import,
                organize, search, and manage soccer training activities.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="contents lg:grid lg:grid-rows-[288px_auto] lg:gap-6">
                <ActivityToolsCard />

                <div className="order-3 lg:order-none">
                  <ActivityList
                    title="My Activities"
                    titleHref="/my-activities"
                    emptyMessage="No activities created by you yet."
                    activities={createdActivities}
                    isLoading={isLoadingDashboard}
                    currentProfile={currentProfile}
                  />
                </div>
              </div>

              <div className="contents lg:grid lg:grid-rows-[288px_auto] lg:gap-6">
                <div className="order-2 lg:order-none">
                  <ImportOptionsCard />
                </div>

                <div className="order-4 lg:order-none">
                  <ActivityList
                    title="Recent Activities"
                    emptyMessage="No recently opened activities yet."
                    activities={openedActivities}
                    isLoading={isLoadingDashboard}
                    currentProfile={currentProfile}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}
