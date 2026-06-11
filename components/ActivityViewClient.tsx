"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  deleteStoredActivity,
  getStoredActivityById,
  updateStoredActivityHidden,
} from "@/lib/activityStorage";
import { downloadActivityAsPdf } from "@/lib/downloadActivityPdf";
import {
  deleteSupabaseActivity,
  getSupabaseActivityById,
  updateSupabaseActivityHidden,
} from "@/lib/supabaseActivities";
import { mockActivities } from "@/lib/mockActivities";
import type { Activity } from "@/types/activity";

type ActivityViewClientProps = {
  activityId: string;
};

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

export default function ActivityViewClient({
  activityId,
}: ActivityViewClientProps) {
  const router = useRouter();

  const [activity, setActivity] = useState<Activity | undefined>(undefined);
  const [activitySource, setActivitySource] = useState<
    "supabase" | "local" | "mock" | undefined
  >(undefined);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      setHasLoaded(false);
      setDownloadMessage("");
      setActionMessage("");
      setShowDeleteConfirm(false);

      try {
        const supabaseActivity = await getSupabaseActivityById(activityId);

        if (!isMounted) {
          return;
        }

        if (supabaseActivity) {
          setActivity(supabaseActivity);
          setActivitySource("supabase");
          setHasLoaded(true);
          return;
        }
      } catch (error) {
        console.error("Unable to load activity from Supabase.", error);
      }

      const storedActivity = getStoredActivityById(activityId);

      if (storedActivity) {
        if (!isMounted) {
          return;
        }

        setActivity(storedActivity);
        setActivitySource("local");
        setHasLoaded(true);
        return;
      }

      const mockActivity = mockActivities.find((item) => item.id === activityId);

      if (!isMounted) {
        return;
      }

      setActivity(mockActivity);
      setActivitySource(mockActivity ? "mock" : undefined);
      setHasLoaded(true);
    }

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, [activityId]);

  async function handleDownload() {
    if (!activity) {
      return;
    }

    setActionMessage("");
    setShowDeleteConfirm(false);

    if (!activity.previewDataUrl) {
      setDownloadMessage("No imported file is available for this activity.");
      return;
    }

    try {
      await downloadActivityAsPdf(activity);
      setDownloadMessage("PDF export download started.");
    } catch (error) {
      console.error("PDF export failed.", error);
      setDownloadMessage("The PDF export could not be created.");
    }
  }

  async function handleToggleHidden() {
    if (!activity) {
      return;
    }

    setDownloadMessage("");
    setShowDeleteConfirm(false);
    setActionMessage("");

    if (activitySource === "supabase") {
      try {
        const updatedActivity = await updateSupabaseActivityHidden(
          activity.id,
          !activity.hidden
        );

        setActivity(updatedActivity);
        setActionMessage(
          updatedActivity.hidden
            ? "Activity hidden. Check Include hidden activities on Search to view it again."
            : "Activity is visible again."
        );
        return;
      } catch (error) {
        console.error("Supabase hide/unhide failed.", error);
        setActionMessage("This activity could not be updated in Supabase.");
        return;
      }
    }

    const updatedActivity = updateStoredActivityHidden(
      activity.id,
      !activity.hidden
    );

    if (!updatedActivity) {
      setActionMessage(
        "Only imported activities can be hidden for now. Sample activities are read-only."
      );
      return;
    }

    setActivity(updatedActivity);
    setActivitySource("local");

    setActionMessage(
      updatedActivity.hidden
        ? "Activity hidden. Check Include hidden activities on Search to view it again."
        : "Activity is visible again."
    );
  }

  function handleDeleteClick() {
    setDownloadMessage("");
    setActionMessage("");

    if (!activity) {
      return;
    }

    if (activitySource === "mock") {
      setActionMessage(
        "Only imported activities can be deleted for now. Sample activities are read-only."
      );
      setShowDeleteConfirm(false);
      return;
    }

    setShowDeleteConfirm(true);
  }

  async function handleConfirmDelete() {
    if (!activity) {
      return;
    }

    if (activitySource === "supabase") {
      try {
        await deleteSupabaseActivity(activity.id);
        router.push("/search");
        return;
      } catch (error) {
        console.error("Supabase delete failed.", error);
        setActionMessage("This activity could not be deleted from Supabase.");
        setShowDeleteConfirm(false);
        return;
      }
    }

    const deleted = deleteStoredActivity(activity.id);

    if (!deleted) {
      setActionMessage("This activity could not be deleted.");
      setShowDeleteConfirm(false);
      return;
    }

    router.push("/search");
  }

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
              className="mt-6 inline-block rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
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

            {activitySource && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Source: {activitySource}
              </p>
            )}
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
              className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
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

            <div className="mt-6 flex min-h-[520px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-slate-500">
              {activity.previewDataUrl &&
              activity.fileType === "application/pdf" ? (
                <iframe
                  src={activity.previewDataUrl}
                  title={`${activity.activityName} PDF preview`}
                  className="h-[620px] w-full rounded-lg border border-slate-200"
                />
              ) : activity.previewDataUrl ? (
                <img
                  src={activity.previewDataUrl}
                  alt={`${activity.activityName} preview`}
                  className="max-h-[620px] w-full rounded-lg object-contain"
                />
              ) : (
                <div>
                  <div className="font-semibold">
                    PNG/PDF viewer placeholder
                  </div>
                  <div className="mt-2 text-sm">
                    Large preview will show here
                  </div>

                  {activity.fileName && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      Imported file: {activity.fileName}
                    </div>
                  )}
                </div>
              )}
            </div>

            {downloadMessage && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                {downloadMessage}
              </div>
            )}

            {actionMessage && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                {actionMessage}
              </div>
            )}

            {showDeleteConfirm && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="font-semibold">
                  Delete this activity permanently?
                </div>
                <div className="mt-1">
                  This removes the activity and its uploaded file.
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white"
                  >
                    Delete Activity
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
              >
                Download
              </button>

              <Link
                href={`/activity/${activity.id}/edit`}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                Edit
              </Link>

              <button
                type="button"
                onClick={handleToggleHidden}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                {activity.hidden ? "Unhide" : "Hide"}
              </button>

              <button
                type="button"
                onClick={handleDeleteClick}
                className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700"
              >
                Delete
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
                    {activity.fieldLocation || "—"}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">
                    Game Phase
                  </div>
                  <div className="mt-1 text-slate-600">
                    {activity.gamePhase || "—"}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">Category</div>
                  <div className="mt-1 text-slate-600">
                    {activity.category || "—"}
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

                <div>
                  <div className="font-semibold text-slate-700">
                    Created Date
                  </div>
                  <div className="mt-1 text-slate-600">
                    {formatDate(activity.createdAt)}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700">
                    Last Updated
                  </div>
                  <div className="mt-1 text-slate-600">
                    {formatDate(activity.updatedAt)}
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