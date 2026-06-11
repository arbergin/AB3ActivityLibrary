"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  getStoredActivityById,
  updateStoredActivity,
} from "@/lib/activityStorage";
import { mockActivities } from "@/lib/mockActivities";
import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";
import type { Activity } from "@/types/activity";

type ActivityEditClientProps = {
  activityId: string;
};

export default function ActivityEditClient({
  activityId,
}: ActivityEditClientProps) {
  const router = useRouter();

  const [activity, setActivity] = useState<Activity | undefined>(undefined);
  const [isLocalActivity, setIsLocalActivity] = useState(false);
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

  useEffect(() => {
    const storedActivity = getStoredActivityById(activityId);
    const mockActivity = mockActivities.find((item) => item.id === activityId);

    const foundActivity = storedActivity ?? mockActivity;

    setActivity(foundActivity);
    setIsLocalActivity(Boolean(storedActivity));
    setHasLoaded(true);

    if (foundActivity) {
      setActivityName(foundActivity.activityName);
      setFieldLocation(foundActivity.fieldLocation);
      setGamePhase(foundActivity.gamePhase);
      setCategory(foundActivity.category);
      setPositionsInvolved(foundActivity.positionsInvolved);
      setNumberOfPlayers(
        foundActivity.numberOfPlayers === ""
          ? ""
          : String(foundActivity.numberOfPlayers)
      );
      setActivityDetails(foundActivity.activityDetails);
    }
  }, [activityId]);

  function handleSaveChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activity) {
      return;
    }

    if (!isLocalActivity) {
      setFormError("Sample activities are read-only for now.");
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

    const savedActivity = updateStoredActivity(updatedActivity);

    if (!savedActivity) {
      setFormError("This activity could not be updated.");
      return;
    }

    router.push(`/activity/${savedActivity.id}`);
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
              className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Back to Search
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!isLocalActivity) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-6xl px-8 py-10">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Sample activity is read-only</h2>
            <p className="mt-2 text-slate-600">
              Only locally imported activities can be edited right now. Sample
              activities are placeholders until the database is connected.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/activity/${activity.id}`}
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
              >
                Back to Activity
              </Link>

              <Link
                href="/search"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
              >
                Back to Search
              </Link>
            </div>
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
            <h2 className="text-2xl font-bold">Edit Activity</h2>
            <p className="mt-2 text-slate-600">
              Update metadata for this imported activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/activity/${activity.id}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
            >
              Cancel
            </Link>

            <Link
              href="/search"
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Search
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Current Preview</h3>

            <div className="mt-6 flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-slate-500">
              {activity.previewDataUrl ? (
                <img
                  src={activity.previewDataUrl}
                  alt={`${activity.activityName} preview`}
                  className="max-h-[500px] w-full rounded-lg object-contain"
                />
              ) : (
                <div>
                  <div className="font-semibold">
                    PNG/PDF viewer placeholder
                  </div>

                  {activity.fileName && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      Imported file: {activity.fileName}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <form
            onSubmit={handleSaveChanges}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <h3 className="text-xl font-bold">Activity Metadata</h3>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-semibold">
                  Activity Name <span className="text-red-600">*</span>
                </span>
                <input
                  type="text"
                  value={activityName}
                  onChange={(event) => setActivityName(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2"
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
                    className="rounded-lg border border-slate-300 px-3 py-2"
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
                    className="rounded-lg border border-slate-300 px-3 py-2"
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
                    className="rounded-lg border border-slate-300 px-3 py-2"
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
                    className="rounded-lg border border-slate-300 px-3 py-2"
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
                    onChange={(event) => setNumberOfPlayers(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Example: 8"
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-sm font-semibold">Activity Details</span>
                <textarea
                  value={activityDetails}
                  onChange={(event) => setActivityDetails(event.target.value)}
                  className="min-h-32 rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Describe setup, rules, coaching points, progressions, or constraints."
                />
              </label>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Link
                  href={`/activity/${activity.id}`}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}