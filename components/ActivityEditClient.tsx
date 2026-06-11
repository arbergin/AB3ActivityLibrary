"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";
import {
  getStoredActivityById,
  updateStoredActivity,
} from "@/lib/activityStorage";
import {
  getSupabaseActivityById,
  updateSupabaseActivity,
} from "@/lib/supabaseActivities";
import { mockActivities } from "@/lib/mockActivities";
import type { Activity } from "@/types/activity";

type ActivityEditClientProps = {
  activityId: string;
};

type ActivitySource = "supabase" | "local" | "mock";

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

export default function ActivityEditClient({
  activityId,
}: ActivityEditClientProps) {
  const router = useRouter();

  const [activity, setActivity] = useState<Activity | undefined>(undefined);
  const [activitySource, setActivitySource] = useState<
    ActivitySource | undefined
  >(undefined);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [activityName, setActivityName] = useState("");
  const [fieldLocation, setFieldLocation] =
    useState<Activity["fieldLocation"]>("");
  const [gamePhase, setGamePhase] = useState<Activity["gamePhase"]>("");
  const [category, setCategory] = useState<Activity["category"]>("");
  const [positionsInvolved, setPositionsInvolved] = useState("");
  const [numberOfPlayers, setNumberOfPlayers] = useState("");
  const [activityDetails, setActivityDetails] = useState("");

  const [formError, setFormError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      setHasLoaded(false);
      setFormError("");
      setSaveMessage("");

      try {
        const supabaseActivity = await getSupabaseActivityById(activityId);

        if (!isMounted) {
          return;
        }

        if (supabaseActivity) {
          setActivity(supabaseActivity);
          setActivitySource("supabase");

          setActivityName(supabaseActivity.activityName);
          setFieldLocation(supabaseActivity.fieldLocation);
          setGamePhase(supabaseActivity.gamePhase);
          setCategory(supabaseActivity.category);
          setPositionsInvolved(supabaseActivity.positionsInvolved);
          setNumberOfPlayers(
            supabaseActivity.numberOfPlayers === ""
              ? ""
              : String(supabaseActivity.numberOfPlayers)
          );
          setActivityDetails(supabaseActivity.activityDetails);

          setHasLoaded(true);
          return;
        }
      } catch (error) {
        console.error("Unable to load activity from Supabase for edit.", error);
      }

      const storedActivity = getStoredActivityById(activityId);

      if (storedActivity) {
        if (!isMounted) {
          return;
        }

        setActivity(storedActivity);
        setActivitySource("local");

        setActivityName(storedActivity.activityName);
        setFieldLocation(storedActivity.fieldLocation);
        setGamePhase(storedActivity.gamePhase);
        setCategory(storedActivity.category);
        setPositionsInvolved(storedActivity.positionsInvolved);
        setNumberOfPlayers(
          storedActivity.numberOfPlayers === ""
            ? ""
            : String(storedActivity.numberOfPlayers)
        );
        setActivityDetails(storedActivity.activityDetails);

        setHasLoaded(true);
        return;
      }

      const mockActivity = mockActivities.find((item) => item.id === activityId);

      if (!isMounted) {
        return;
      }

      if (mockActivity) {
        setActivity(mockActivity);
        setActivitySource("mock");

        setActivityName(mockActivity.activityName);
        setFieldLocation(mockActivity.fieldLocation);
        setGamePhase(mockActivity.gamePhase);
        setCategory(mockActivity.category);
        setPositionsInvolved(mockActivity.positionsInvolved);
        setNumberOfPlayers(
          mockActivity.numberOfPlayers === ""
            ? ""
            : String(mockActivity.numberOfPlayers)
        );
        setActivityDetails(mockActivity.activityDetails);
      } else {
        setActivity(undefined);
        setActivitySource(undefined);
      }

      setHasLoaded(true);
    }

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, [activityId]);

  async function handleSaveActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activity || isSaving) {
      return;
    }

    setFormError("");
    setSaveMessage("");

    if (activitySource === "mock") {
      setFormError(
        "Sample activities are read-only. Imported activities can be edited."
      );
      return;
    }

    if (!activityName.trim()) {
      setFormError("Activity Name is required.");
      return;
    }

    const updatedActivity: Activity = {
      ...activity,
      activityName: activityName.trim(),
      fieldLocation,
      gamePhase,
      category,
      positionsInvolved: positionsInvolved.trim(),
      numberOfPlayers: numberOfPlayers ? Number(numberOfPlayers) : "",
      activityDetails: activityDetails.trim(),
    };

    setIsSaving(true);
    setSaveMessage(
      activitySource === "supabase"
        ? "Saving changes to Supabase..."
        : "Saving changes locally..."
    );

    if (activitySource === "supabase") {
      try {
        const savedActivity = await updateSupabaseActivity(updatedActivity);

        setActivity(savedActivity);
        setSaveMessage("Changes saved to Supabase.");
        router.push(`/activity/${savedActivity.id}`);
        return;
      } catch (error) {
        console.error("Supabase activity update failed.", error);
        setFormError("The activity could not be updated in Supabase.");
        setSaveMessage("");
        setIsSaving(false);
        return;
      }
    }

    const savedLocalActivity = updateStoredActivity(updatedActivity);

    if (!savedLocalActivity) {
      setFormError("The local activity could not be updated.");
      setSaveMessage("");
      setIsSaving(false);
      return;
    }

    setActivity(savedLocalActivity);
    setSaveMessage("Changes saved locally.");
    router.push(`/activity/${savedLocalActivity.id}`);
  }

  function handleCancel() {
    if (!activity) {
      router.push("/search");
      return;
    }

    router.push(`/activity/${activity.id}`);
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
              The activity you are trying to edit does not exist.
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
    );
  }

  const isReadOnly = activitySource === "mock";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-7xl px-8 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Edit Activity</h2>
            <p className="mt-2 text-slate-600">
              Update activity metadata used for search, filtering, and PDF
              exports.
            </p>

            {activitySource && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Source: {activitySource}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/activity/${activity.id}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
            >
              Close
            </Link>

            <Link
              href="/search"
              className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
            >
              Search
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Activity Preview</h3>

            <div className="mt-6 flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-slate-500">
              {activity.previewDataUrl &&
              activity.fileType === "application/pdf" ? (
                <iframe
                  src={activity.previewDataUrl}
                  title={`${activity.activityName} PDF preview`}
                  className="h-[520px] w-full rounded-lg border border-slate-200"
                />
              ) : activity.previewDataUrl ? (
                <img
                  src={activity.previewDataUrl}
                  alt={`${activity.activityName} preview`}
                  className="max-h-[520px] w-full rounded-lg object-contain"
                />
              ) : (
                <div>
                  <div className="font-semibold">
                    PNG/PDF viewer placeholder
                  </div>
                  <div className="mt-2 text-sm">
                    Preview will show here when an imported file is available.
                  </div>

                  {activity.fileName && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      Imported file: {activity.fileName}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3 text-sm">
              <div>
                <div className="font-semibold text-slate-700">
                  Imported File
                </div>
                <div className="mt-1 text-slate-600">
                  {activity.fileName || "—"}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
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
            </div>
          </section>

          <form
            onSubmit={handleSaveActivity}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <h3 className="text-xl font-bold">Activity Metadata</h3>

            {isReadOnly && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Sample activities are read-only. Imported Supabase or local
                activities can be edited.
              </div>
            )}

            <div className="mt-6 grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-semibold">
                  Activity Name <span className="text-red-600">*</span>
                </span>
                <input
                  type="text"
                  value={activityName}
                  onChange={(event) => setActivityName(event.target.value)}
                  disabled={isReadOnly || isSaving}
                  className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  placeholder="Example: 3v2 to Counter"
                />
              </label>

              <div className="grid gap-4">
                <label className="grid gap-1">
                  <span className="text-sm font-semibold">Field Location</span>
                  <select
                    value={fieldLocation}
                    onChange={(event) =>
                      setFieldLocation(
                        event.target.value as Activity["fieldLocation"]
                      )
                    }
                    disabled={isReadOnly || isSaving}
                    className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  >
                    <option value="">Select field location</option>
                    {fieldLocationOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold">Game Phase</span>
                  <select
                    value={gamePhase}
                    onChange={(event) =>
                      setGamePhase(event.target.value as Activity["gamePhase"])
                    }
                    disabled={isReadOnly || isSaving}
                    className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  >
                    <option value="">Select game phase</option>
                    {gamePhaseOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold">Category</span>
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value as Activity["category"])
                    }
                    disabled={isReadOnly || isSaving}
                    className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-sm font-semibold">
                    Positions Involved
                  </span>
                  <input
                    type="text"
                    value={positionsInvolved}
                    onChange={(event) =>
                      setPositionsInvolved(event.target.value)
                    }
                    disabled={isReadOnly || isSaving}
                    className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                    placeholder="Example: 9, 10, Wingers"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold">
                    Number of Players
                  </span>
                  <input
                    type="number"
                    value={numberOfPlayers}
                    onChange={(event) =>
                      setNumberOfPlayers(event.target.value)
                    }
                    disabled={isReadOnly || isSaving}
                    className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                    placeholder="Example: 8"
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-sm font-semibold">Activity Details</span>
                <textarea
                  value={activityDetails}
                  onChange={(event) => setActivityDetails(event.target.value)}
                  disabled={isReadOnly || isSaving}
                  className="min-h-40 rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  placeholder="Describe setup, rules, coaching points, progressions, or constraints."
                />
              </label>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {saveMessage && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  {saveMessage}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isReadOnly || isSaving}
                  className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}