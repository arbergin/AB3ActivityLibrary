import type {
  ActivityCreatorFrame,
  ActivityCreatorLine,
  ActivityCreatorObject,
  ActivityCreatorState,
} from "@/types/activity";

const DEFAULT_DURATION_MS = 1500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getActivityCreatorFrames(
  creatorState: ActivityCreatorState | undefined
): ActivityCreatorFrame[] {
  if (!creatorState || !isRecord(creatorState)) {
    return [];
  }

  const creatorStateRecord = creatorState as Record<string, unknown>;

  if (creatorStateRecord.schemaVersion === 3 && Array.isArray(creatorStateRecord.frames)) {
    const frames = creatorStateRecord.frames.filter(
      (frame: unknown): frame is ActivityCreatorFrame =>
        isRecord(frame) &&
        typeof frame.id === "string" &&
        Array.isArray(frame.objects) &&
        Array.isArray(frame.lines)
    );

    if (frames.length > 0) {
      return frames.map((frame, index) => ({
        id: frame.id,
        name:
          typeof frame.name === "string" && frame.name.trim()
            ? frame.name.trim()
            : `Tab ${index + 1}`,
        durationMs:
          typeof frame.durationMs === "number" &&
          Number.isFinite(frame.durationMs) &&
          frame.durationMs >= 100
            ? frame.durationMs
            : DEFAULT_DURATION_MS,
        objects: frame.objects,
        lines: frame.lines,
      }));
    }
  }

  const legacyObjects = Array.isArray(creatorState.objects)
    ? (creatorState.objects as ActivityCreatorObject[])
    : [];
  const legacyLines = Array.isArray(creatorState.lines)
    ? (creatorState.lines as ActivityCreatorLine[])
    : [];

  return [
    {
      id: "frame-1",
      name: "Tab 1",
      durationMs: DEFAULT_DURATION_MS,
      objects: legacyObjects,
      lines: legacyLines,
    },
  ];
}

export function getActiveActivityCreatorFrame(
  creatorState: ActivityCreatorState | undefined
): ActivityCreatorFrame | undefined {
  const frames = getActivityCreatorFrames(creatorState);

  if (frames.length === 0) {
    return undefined;
  }

  if (creatorState && isRecord(creatorState)) {
    const creatorStateRecord = creatorState as Record<string, unknown>;

    if (
      creatorStateRecord.schemaVersion === 3 &&
      typeof creatorStateRecord.activeFrameId === "string"
    ) {
      return (
        frames.find((frame) => frame.id === creatorStateRecord.activeFrameId) ??
        frames[0]
      );
    }
  }

  return frames[0];
}

export function getActivityCreatorFrameCount(
  creatorState: ActivityCreatorState | undefined
) {
  return getActivityCreatorFrames(creatorState).length;
}

export function getIOSCompatibleCreatorState(
  creatorState: ActivityCreatorState
): ActivityCreatorState {
  const activeFrame = getActiveActivityCreatorFrame(creatorState);

  const creatorStateRecord = creatorState as Record<string, unknown>;

  if (!activeFrame || creatorStateRecord.schemaVersion !== 3) {
    return creatorState;
  }

  return {
    ...creatorState,
    objects: activeFrame.objects,
    lines: activeFrame.lines,
  };
}
