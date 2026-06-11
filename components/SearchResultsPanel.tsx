"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredActivities } from "@/lib/activityStorage";
import { mockActivities } from "@/lib/mockActivities";
import type { Activity } from "@/types/activity";

export default function SearchResultsPanel() {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [selectedActivity, setSelectedActivity] = useState<Activity>(
    mockActivities[0]
  );

  useEffect(() => {
    const storedActivities = getStoredActivities();
    const combinedActivities = [...storedActivities, ...mockActivities];

    setActivities(combinedActivities);

    if (combinedActivities.length > 0) {
      setSelectedActivity(combinedActivities[0]);
    }
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Results</h2>
        <p className="mt-2 text-sm text-slate-600">
          Click a row to update the preview and metadata. Use Open to view the
          activity larger.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <div>Activity</div>
            <div>Location</div>
            <div>Phase</div>
            <div>Category</div>
            <div>Actions</div>
          </div>

          {activities.map((activity) => {
            const isSelected = activity.id === selectedActivity.id;

            return (
              <div
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className={`grid cursor-pointer grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center border-t border-slate-200 px-4 py-4 text-sm ${
                  isSelected ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    {activity.activityName}
                  </div>

                  {activity.fileName && (
                    <div className="mt-1 text-xs text-slate-500">
                      Imported from: {activity.fileName}
                    </div>
                  )}

                  {activity.hidden && (
                    <div className="mt-1 text-xs font-semibold text-amber-600">
                      Hidden — admin only
                    </div>
                  )}
                </div>

                <div className="text-slate-600">{activity.fieldLocation}</div>
                <div className="text-slate-600">{activity.gamePhase}</div>
                <div className="text-slate-600">{activity.category}</div>

                <div className="flex gap-3">
                  <Link
                    href={`/activity/${activity.id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Activity Detail</h2>

        <div className="mt-4 flex min-h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
          {selectedActivity.previewDataUrl ? (
            <img
              src={selectedActivity.previewDataUrl}
              alt={`${selectedActivity.activityName} preview`}
              className="max-h-80 w-full rounded-lg object-contain"
            />
          ) : (
            <div>
              Preview pane
              <div className="mt-2 text-xs">PNG/PDF viewer placeholder</div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3 text-sm">
          <div>
            <div className="font-semibold text-slate-700">Activity Name</div>
            <div className="text-slate-600">
              {selectedActivity.activityName}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="font-semibold text-slate-700">
                Field Location
              </div>
              <div className="text-slate-600">
                {selectedActivity.fieldLocation}
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-700">Game Phase</div>
              <div className="text-slate-600">
                {selectedActivity.gamePhase}
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-700">Category</div>
              <div className="text-slate-600">{selectedActivity.category}</div>
            </div>

            <div>
              <div className="font-semibold text-slate-700">
                Number of Players
              </div>
              <div className="text-slate-600">
                {selectedActivity.numberOfPlayers || "—"}
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-700">
              Positions Involved
            </div>
            <div className="text-slate-600">
              {selectedActivity.positionsInvolved || "—"}
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-700">
              Activity Details
            </div>
            <div className="text-slate-600">
              {selectedActivity.activityDetails || "—"}
            </div>
          </div>

          {selectedActivity.fileName && (
            <div>
              <div className="font-semibold text-slate-700">Imported File</div>
              <div className="text-slate-600">{selectedActivity.fileName}</div>
            </div>
          )}
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
    </div>
  );
}