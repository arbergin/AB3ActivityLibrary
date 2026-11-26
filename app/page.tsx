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
      className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
    />
  );
}

function DashboardPrimaryActions() {
  const actions = [
    {
      href: "/create",
      title: "Create Activities",
      description: "Build new editable soccer activities on the pitch.",
      icon: "/create.png",
      iconAlt: "Create Activities",
    },
    {
      href: "/search",
      title: "Search Activities",
      description:
        "Find activities by name, location, game phase, category, positions, players, or details.",
      icon: "/search.png",
      iconAlt: "Search Activities",
    },
    {
      href: "/sessions",
      title: "Create Sessions",
      description: "Build sessions with objectives, notes, and activities from your library.",
      icon: "/team_planning.svg",
      iconAlt: "Create Sessions",
    },
    {
      href: "/team-planning",
      title: "Team Planning",
      description:
        "Build team plans with weeks, practices, and activities from your library.",
      icon: "/team_planning.svg",
      iconAlt: "Team Planning",
    },
    {
      href: "/import",
      title: "Import Activities",
      description:
        "Import a single PNG or PDF, or upload multiple activities in bulk.",
      icon: "/import_single_activity.png",
      iconAlt: "Import Activities",
    },
  ];

  return (
    <section className="ab3-dashboard-actions grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex min-h-44 min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md 2xl:p-5"
        >
          <h2 className="text-lg font-bold leading-snug text-slate-900">
            {action.title}
          </h2>

          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1 text-sm leading-6 text-slate-600">
              {action.description}
            </p>
            <DashboardActionIcon src={action.icon} alt={action.iconAlt} />
          </div>
        </Link>
      ))}
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
    <section className="min-w-0 rounded-xl bg-white p-4 shadow-sm sm:p-6">
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

      <div className="mt-4 min-w-0 overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,.85fr)] gap-2 bg-slate-100 px-2 py-3 text-xs font-semibold text-slate-700 sm:hidden">
          <div>Activity</div><div className="min-w-0 break-words">Category / Phase</div><div>Updated</div>
        </div>
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
                className="grid min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,.85fr)] items-start gap-2 [overflow-wrap:anywhere] border-t border-slate-200 px-2 py-4 first:border-t-0 hover:bg-slate-50 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="break-words font-semibold text-slate-800">
                    {activity.activityName}
                  </div>

                  <div className="mt-1 hidden flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 sm:flex">
                    <span>{activity.fieldLocation || "No location"}</span>
                    <span>{activity.gamePhase || "No phase"}</span>
                    <span>{activity.category || "No category"}</span>
                  </div>

                  <div className="mt-1 hidden text-xs text-slate-400 sm:block">
                    Updated: {formatDate(activity.updatedAt || activity.createdAt)}
                  </div>
                </div>

                <div className="min-w-0 text-xs text-slate-600 sm:hidden">
                  <div>{activity.category || "—"}</div>
                  <div className="mt-2 border-t border-slate-200 pt-2">{activity.gamePhase || "—"}</div>
                  <div className="mt-2 text-slate-500">{activity.fieldLocation || "No location"}</div>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0">
                  <div className="w-full text-xs text-slate-600 sm:hidden">{formatDate(activity.updatedAt || activity.createdAt)}</div>
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
      <main className="ab3-dashboard relative w-full max-w-full min-h-screen min-w-0 bg-slate-100 text-slate-900">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/dashboard_background.png')] bg-cover bg-center bg-no-repeat opacity-65"
        />

        <div className="relative z-10 w-full max-w-full min-w-0">
          <AppHeader />

          <section className="ab3-dashboard-content mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="mb-8 w-full rounded-xl bg-[#0d2140] px-5 py-4 shadow-lg backdrop-blur-sm">
              <h2 className="text-3xl font-bold text-white">Dashboard</h2>
              <p className="mt-2 text-slate-200 ">
                Welcome to the AB3 Soccer Activity Library. Create, import,
                organize, search, and manage soccer training activities.
              </p>
            </div>

            <DashboardPrimaryActions />

            <div className="ab3-dashboard-lists mt-6 grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
              <ActivityList
                title="My Activities"
                titleHref="/my-activities"
                emptyMessage="No activities created by you yet."
                activities={createdActivities}
                isLoading={isLoadingDashboard}
                currentProfile={currentProfile}
              />

              <ActivityList
                title="Recent Activities"
                emptyMessage="No recently opened activities yet."
                activities={openedActivities}
                isLoading={isLoadingDashboard}
                currentProfile={currentProfile}
              />
            </div>
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}