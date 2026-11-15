import type { ActivityCreatorStateV3, ActivityCreatorFrame } from "@/types/activity";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const validPoint = (value: unknown) =>
  isRecord(value) && typeof value.x === "number" && Number.isFinite(value.x) &&
  typeof value.y === "number" && Number.isFinite(value.y) &&
  value.x >= 0 && value.x <= 1 && value.y >= 0 && value.y <= 1;
const supportedTypes = new Set([
  "team1", "team2", "cone", "ball", "mannequin", "miniGoal", "fullGoal", "textBox",
]);
const supportedBackgrounds = new Set([
  "pitchGreen", "pitchGreenTilted", "greenBlank", "pitchWhite", "pitchWhiteTilted", "whiteBlank",
]);

export type ParsedActivityJson = {
  name: string;
  activityDetails: string;
  fieldLocation: string;
  gamePhase: string;
  category: string;
  positionsInvolved: string;
  numberOfPlayers: number | "";
  creatorState: ActivityCreatorStateV3;
  frameCount: number;
  playerCount: number;
};

/** Accept a full activity export or a standalone creatorState document (v2 or v3). */
export function parseActivityJson(value: unknown, fallbackName: string): ParsedActivityJson {
  if (!isRecord(value)) throw new Error("JSON must contain an activity object.");
  const state: unknown = value.creatorState ?? value.creator_state ?? value;
  if (!isRecord(state)) throw new Error("Missing creatorState object.");
  if (state.schemaVersion !== 2 && state.schemaVersion !== 3) {
    throw new Error("Unsupported activity schema. Import requires creatorState schemaVersion 2 or 3.");
  }
  if (!isRecord(state.pitch) || !supportedBackgrounds.has(String(state.pitch.background))) {
    throw new Error("Invalid or missing pitch.background.");
  }
  if (!isRecord(state.settings)) throw new Error("Missing creatorState.settings.");

  const rawFrames: unknown[] = state.schemaVersion === 3 ?
    (Array.isArray(state.frames) ? state.frames : []) :
    [{ id: crypto.randomUUID(), name: "Tab 1", objects: state.objects, lines: state.lines }];
  if (!rawFrames.length || rawFrames.length > 100) {
    throw new Error("The activity must contain between 1 and 100 frames.");
  }
  const ids = new Set<string>();
  let playerCount = 0;
  const frames: ActivityCreatorFrame[] = rawFrames.map((raw, index) => {
    if (!isRecord(raw) || !Array.isArray(raw.objects) || !Array.isArray(raw.lines)) {
      throw new Error(`Frame ${index + 1}: objects and lines must be arrays.`);
    }
    if (raw.objects.length > 500 || raw.lines.length > 500) {
      throw new Error(`Frame ${index + 1}: too many objects or lines (maximum 500 each).`);
    }
    for (const object of raw.objects) {
      if (!isRecord(object) || !supportedTypes.has(String(object.type)) || !validPoint(object)) {
        throw new Error(`Frame ${index + 1}: invalid object type or coordinates (x/y must be between 0 and 1).`);
      }
    }
    for (const line of raw.lines) {
      if (!isRecord(line) || !Array.isArray(line.points) || line.points.length < 2 ||
        line.points.length > 1000 || !line.points.every(validPoint)) {
        throw new Error(`Frame ${index + 1}: invalid line coordinates or points.`);
      }
    }
    if (index === 0) {
      playerCount = raw.objects.filter((o: unknown) =>
        isRecord(o) && (o.type === "team1" || o.type === "team2")
      ).length;
    }
    const id = nonempty(raw.id) && !ids.has(raw.id) ? raw.id : crypto.randomUUID();
    ids.add(id);
    return {
      id,
      name: nonempty(raw.name) ? raw.name.trim() : `Tab ${index + 1}`,
      durationMs: typeof raw.durationMs === "number" && Number.isFinite(raw.durationMs)
        ? Math.max(250, Math.min(10000, raw.durationMs)) : 1000,
      objects: raw.objects as ActivityCreatorFrame["objects"],
      lines: raw.lines as ActivityCreatorFrame["lines"],
    };
  });

  // Assign a fresh client ID so an imported copy cannot overwrite its original iOS sync counterpart.
  const creatorState: ActivityCreatorStateV3 = {
    ...state,
    schemaVersion: 3,
    sourcePlatform: state.sourcePlatform === "ios" ? "ios" : "web",
    clientActivityId: crypto.randomUUID(),
    activeFrameId: frames[0].id,
    pitch: state.pitch as ActivityCreatorStateV3["pitch"],
    settings: state.settings as ActivityCreatorStateV3["settings"],
    frames,
    objects: frames[0].objects,
    lines: frames[0].lines,
  } as ActivityCreatorStateV3;

  const name = [value.activityName, value.activity_name, value.name]
    .find(nonempty) as string | undefined;
  const requestedNumber = value.numberOfPlayers ?? value.number_of_players;
  return {
    name: (name || fallbackName || "Imported JSON Activity").trim(),
    activityDetails: nonempty(value.activityDetails) ? value.activityDetails :
      nonempty(value.activity_details) ? value.activity_details : "",
    fieldLocation: nonempty(value.fieldLocation) ? value.fieldLocation : "",
    gamePhase: nonempty(value.gamePhase) ? value.gamePhase : "",
    category: nonempty(value.category) ? value.category : "",
    positionsInvolved: nonempty(value.positionsInvolved) ? value.positionsInvolved : "",
    numberOfPlayers: typeof requestedNumber === "number" && Number.isInteger(requestedNumber) && requestedNumber > 0
      ? requestedNumber : playerCount || "",
    creatorState,
    frameCount: frames.length,
    playerCount,
  };
}
