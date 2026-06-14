"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SortOption = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";
type PageSize = 10 | 20 | 30;

type ActivityRow = {
  id: string;
  activity_name?: string | null;
  name?: string | null;
  title?: string | null;
  field_location?: string | null;
  game_phase?: string | null;
  category?: string | null;
  positions_involved?: string | null;
  number_of_players?: string | number | null;
  activity_details?: string | null;
  preview_data_url?: string | null;
  previewDataUrl?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updated_desc", label: "Date Updated: Newest" },
  { value: "updated_asc", label: "Date Updated: Oldest" },
  { value: "name_asc", label: "Name: A-Z" },
  { value: "name_desc", label: "Name: Z-A" },
];

const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 30];

function getActivityName(activity: ActivityRow) {
  return (
    activity.activity_name?.trim() ||
    activity.name?.trim() ||
    activity.title?.trim() ||
    "Untitled Activity"
  );
}

function getUpdatedDateValue(activity: ActivityRow) {
  const rawDate = activity.updated_at || activity.updatedAt || activity.created_at || "";
  const timestamp = new Date(rawDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortActivities(activities: ActivityRow[], sortOption: SortOption) {
  return [...activities].sort((a, b) => {
    if (sortOption === "name_asc") {
      return getActivityName(a).localeCompare(getActivityName(b));
    }

    if (sortOption === "name_desc") {
      return getActivityName(b).localeCompare(getActivityName(a));
    }

    if (sortOption === "updated_asc") {
      return getUpdatedDateValue(a) - getUpdatedDateValue(b);
    }

    return getUpdatedDateValue(b) - getUpdatedDateValue(a);
  });
}

export default function MyActivitiesClient() {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("updated_desc");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadActivities() {
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setActivities([]);
        setErrorMessage("You must be logged in to view your activities.");
        setIsLoading(false);
        return;
      }

      const userEmail = user.email?.trim().toLowerCase() || "";
      const userId = user.id;

      let query = supabase.from("activities").select("*");

      // Your current data stores created_by as the user's email.
      // The user.id fallback keeps this page working if you later change created_by to store auth.users.id.
      if (userEmail) {
        query = query.or(`created_by.eq.${userEmail},created_by.eq.${userId}`);
      } else {
        query = query.eq("created_by", userId);
      }

      const { data, error } = await query;

      if (!isMounted) return;

      if (error) {
        setActivities([]);
        setErrorMessage(error.message || "Unable to load your activities.");
        setIsLoading(false);
        return;
      }

      setActivities((data || []) as ActivityRow[]);
      setIsLoading(false);
    }

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedActivities = useMemo(() => {
    return sortActivities(activities, sortOption);
  }, [activities, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedActivities.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const visibleActivities = sortedActivities.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOption, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Activities</h1>
          <p className="mt-1 text-sm text-slate-600">
            Activities you created, sorted by the most recently updated by default.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Sort by
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#0d2140] focus:outline-none focus:ring-2 focus:ring-[#0d2140]/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm ring-1 ring-slate-200">
          Loading your activities...
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : sortedActivities.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-900">No activities found</h2>
          <p className="mt-2 text-sm text-slate-600">
            Activities you create will appear here.
          </p>
          <Link
            href="/create"
            className="mt-5 inline-flex rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17345f]"
          >
            Create Activity
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Activity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Game Phase
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Updated
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-slate-900">
                          {getActivityName(activity)}
                        </div>
                        <div className="mt-1 line-clamp-2 max-w-xl text-sm text-slate-500">
                          {activity.activity_details || "No activity details provided."}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        {activity.category || "—"}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        {activity.game_phase || "—"}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        {formatDate(activity.updated_at || activity.updatedAt || activity.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right align-top">
                        <Link
                          href={`/activity/${activity.id}`}
                          className="inline-flex rounded-lg bg-[#0d2140] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#17345f]"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(endIndex, sortedActivities.length)}
              </span>{" "}
              of <span className="font-semibold text-slate-900">{sortedActivities.length}</span> activities
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                Show
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value) as PageSize)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#0d2140] focus:outline-none focus:ring-2 focus:ring-[#0d2140]/20"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                per page
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="min-w-[88px] text-center text-sm font-semibold text-slate-700">
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
