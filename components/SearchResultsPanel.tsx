"use client";

import Link from "next/link";
import { useState } from "react";
import type { Activity } from "@/types/activity";

const mockActivities: Activity[] = [
  {
    id: "activity-1",
    activityName: "3v2 to Counter",
    fieldLocation: "Final Third",
    gamePhase: "Attacking",
    category: "Small-Sided Games",
    positionsInvolved: "9, 10, Wingers",
    numberOfPlayers: 8,
    activityDetails:
      "Attack quickly with a 3v2 advantage, then transition immediately when possession is lost. Focus on decision-making, spacing, and recovery runs.",
    createdBy: "Coach User",
    hidden: false,
  },
  {
    id: "activity-2",
    activityName: "Middle Third Rondo",
    fieldLocation: "Middle Third",
    gamePhase: "Attacking",
    category: "Rondo",
    positionsInvolved: "6, 8, 10",
    numberOfPlayers: 7,
    activityDetails:
      "Possession activity focused on scanning, support angles, body shape, and playing through pressure in the middle third.",
    createdBy: "Coach User",
    hidden: false,
  },
  {
    id: "activity-3",
    activityName: "Build Out Passing Activation",
    fieldLocation: "First Third",
    gamePhase: "Attacking",
    category: "Passing Activation",
    positionsInvolved: "GK, CBs, 6, FBs",
    numberOfPlayers: 10,
    activityDetails:
      "Pattern-based activation for building out from the back with emphasis on spacing, timing, and third-player options.",
    createdBy: "Coach User",
    hidden: true,
  },
];

export default function SearchResultsPanel() {
  const [selectedActivity, setSelectedActivity] = useState<Activity>(
    mockActivities[0]
  );

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

          {mockActivities.map((activity) => {
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

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Preview pane
          <div className="mt-2 text-xs">PNG/PDF viewer placeholder</div>
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
                {selectedActivity.numberOfPlayers}
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-700">
              Positions Involved
            </div>
            <div className="text-slate-600">
              {selectedActivity.positionsInvolved}
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-700">
              Activity Details
            </div>
            <div className="text-slate-600">
              {selectedActivity.activityDetails}
            </div>
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
    </div>
  );
}