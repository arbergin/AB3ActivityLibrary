"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import ActivityCreator from "@/components/ActivityCreator";
import ProtectedPage from "@/components/ProtectedPage";
import type { Activity, ActivityCreatorState } from "@/types/activity";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getNumberOrEmpty(value: unknown): number | "" {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return "";
}

function countPlayersFromCreatorState(creatorState: ActivityCreatorState) {
  const objects = Array.isArray(creatorState.objects)
    ? creatorState.objects
    : [];

  return objects.filter(
    (object) => object.type === "team1" || object.type === "team2"
  ).length;
}

function buildActivityFromPastedPayload(payload: unknown): Activity {
  if (!isObjectRecord(payload)) {
    throw new Error("The pasted payload must be a JSON object.");
  }

  const possibleCreatorState = payload.creatorState ?? payload;

  if (!isObjectRecord(possibleCreatorState)) {
    throw new Error(
      "Could not find a valid creatorState object in the pasted payload."
    );
  }

  const creatorState = possibleCreatorState as ActivityCreatorState;

  if (!Array.isArray(creatorState.objects)) {
    throw new Error("The creatorState is missing an objects array.");
  }

  if (!Array.isArray(creatorState.lines)) {
    throw new Error("The creatorState is missing a lines array.");
  }

  const clientActivityId = getStringValue(
    payload.clientActivityId,
    crypto.randomUUID()
  );

  const activityName =
    getStringValue(payload.activityName) ||
    getStringValue(payload.name) ||
    "iOS Payload Test Activity";

  const playerCount = countPlayersFromCreatorState(creatorState);

  return {
    id: `ios-test-${clientActivityId}`,
    activityName,
    fieldLocation: getStringValue(payload.fieldLocation),
    gamePhase: getStringValue(payload.gamePhase),
    category: getStringValue(payload.category),
    positionsInvolved: getStringValue(payload.positionsInvolved),
    numberOfPlayers:
      getNumberOrEmpty(payload.numberOfPlayers) || playerCount || "",
    activityDetails: getStringValue(payload.activityDetails),
    createdBy: getStringValue(payload.createdBy, "ios-payload-test"),
    hidden: false,
    activitySource: "create",
    creatorState,
    createdAt: getStringValue(payload.createdAt),
    updatedAt: getStringValue(payload.updatedAt),
  };
}

export default function CreateActivityPage() {
  const [pastedPayload, setPastedPayload] = useState("");
  const [testActivity, setTestActivity] = useState<Activity | undefined>(
    undefined
  );
  const [testActivityKey, setTestActivityKey] = useState("blank-activity");
  const [payloadMessage, setPayloadMessage] = useState("");
  const [showPayloadTester, setShowPayloadTester] = useState(false);

  function loadPastedPayload() {
    const trimmedPayload = pastedPayload.trim();

    if (!trimmedPayload) {
      setPayloadMessage("Paste the iOS Library payload JSON first.");
      return;
    }

    try {
      const parsedPayload = JSON.parse(trimmedPayload);
      const nextActivity = buildActivityFromPastedPayload(parsedPayload);

      setTestActivity(nextActivity);
      setTestActivityKey(`${nextActivity.id}-${Date.now()}`);
      setPayloadMessage(
        `Loaded test payload: ${nextActivity.activityName}`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to parse the pasted payload.";

      setPayloadMessage(message);
    }
  }

  function clearPastedPayloadTest() {
    setPastedPayload("");
    setTestActivity(undefined);
    setTestActivityKey(`blank-activity-${Date.now()}`);
    setPayloadMessage("Cleared test payload. You are back in normal create mode.");
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Create Activity</h2>
            <p className="mt-2 text-slate-600">
              Build a soccer activity on the pitch using players, cones, goals,
              mannequins, and drawing tools.
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">
                  Temporary iOS Payload Test
                </h3>
                <p className="mt-1 text-sm text-amber-900">
                  Use this only while testing iOS Activity Planner sync. Paste
                  the JSON printed from the iOS app to confirm the web creator
                  can render it.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPayloadTester((current) => !current)}
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                {showPayloadTester ? "Hide Test Box" : "Show Test Box"}
              </button>
            </div>

            {showPayloadTester && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={pastedPayload}
                  onChange={(event) => setPastedPayload(event.target.value)}
                  placeholder="Paste the iOS AB3 Library payload JSON here..."
                  className="h-56 w-full rounded-xl border border-amber-300 bg-white p-3 font-mono text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={loadPastedPayload}
                    className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14345f]"
                  >
                    Load iOS Payload Test
                  </button>

                  <button
                    type="button"
                    onClick={clearPastedPayloadTest}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear Test Payload
                  </button>
                </div>

                {payloadMessage && (
                  <p className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900">
                    {payloadMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          <ActivityCreator
            key={testActivityKey}
            initialActivity={testActivity}
          />
        </section>
      </main>
    </ProtectedPage>
  );
}