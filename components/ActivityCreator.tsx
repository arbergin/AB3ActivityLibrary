"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { PointerEvent, ReactNode, WheelEvent } from "react";
import ActivityMetadataForm from "@/components/ActivityMetadataForm";
import type { Activity, ActivityCreatorState } from "@/types/activity";

type ToolType =
  | "team1"
  | "team2"
  | "cone"
  | "ball"
  | "mannequin"
  | "miniGoal"
  | "fullGoal"
  | "line"
  | "freehand"
  | "eraser";

type ObjectToolType = Exclude<ToolType, "line" | "freehand" | "eraser">;

type PitchBackgroundType =
  | "pitchGreen"
  | "pitchWhite"
  | "greenBlank"
  | "whiteBlank";

type PlayerDisplayMode = "number" | "name" | "both" | "none";

type MobileToolGroup = "objects" | "draw" | "settings";

type PitchObject = {
  id: string;
  type: ObjectToolType;
  x: number;
  y: number;
  label?: string;
  playerName?: string;
  rotation: number;
  fillColor?: string;
  size?: number;
};

type PitchLine = {
  id: string;
  points: { x: number; y: number }[];
  dashed: boolean;
  arrow: boolean;
  color: string;
};

type PanState = {
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
};

type HistorySnapshot = {
  objects: PitchObject[];
  lines: PitchLine[];
};

const ASSETS = {
  ball: "/activity-assets/soccer_ball.png",
  mannequin: "/activity-assets/mannequin.png",
  miniGoal: "/activity-assets/mini_goal.png",
  fullGoal: "/activity-assets/full_goal.png",
};

const pitchBackgrounds: {
  type: PitchBackgroundType;
  label: string;
  assetPath: string;
}[] = [
  {
    type: "pitchGreen",
    label: "Green Pitch",
    assetPath: "/activity-assets/pitch_green.png",
  },
  {
    type: "pitchWhite",
    label: "White Pitch",
    assetPath: "/activity-assets/pitch_white.png",
  },
  {
    type: "greenBlank",
    label: "Green Blank",
    assetPath: "/activity-assets/green_blank.png",
  },
  {
    type: "whiteBlank",
    label: "White Blank",
    assetPath: "/activity-assets/white_blank.png",
  },
];

const tools: { type: ToolType; label: string; shortLabel: string }[] = [
  { type: "team1", label: "Team 1", shortLabel: "T1" },
  { type: "team2", label: "Team 2", shortLabel: "T2" },
  { type: "cone", label: "Cone", shortLabel: "Cone" },
  { type: "ball", label: "Ball", shortLabel: "Ball" },
  { type: "mannequin", label: "Mannequin", shortLabel: "Man" },
  { type: "miniGoal", label: "Mini Goal", shortLabel: "Mini" },
  { type: "fullGoal", label: "Goal", shortLabel: "Goal" },
  { type: "line", label: "Line", shortLabel: "Line" },
  { type: "freehand", label: "Free Draw", shortLabel: "Free" },
  { type: "eraser", label: "Erase", shortLabel: "Erase" },
];

const objectToolTypes: ToolType[] = [
  "team1",
  "team2",
  "cone",
  "ball",
  "mannequin",
  "miniGoal",
  "fullGoal",
];

const drawToolTypes: ToolType[] = ["line", "freehand", "eraser"];

const presetColors = [
  { label: "Blue", value: "#2563eb" },
  { label: "Red", value: "#dc2626" },
  { label: "Black", value: "#111827" },
  { label: "White", value: "#ffffff" },
  { label: "Yellow", value: "#facc15" },
  { label: "Orange", value: "#f97316" },
  { label: "Green", value: "#16a34a" },
  { label: "Pink", value: "#ec4899" },
  { label: "Purple", value: "#7c3aed" },
];

function makeId() {
  return crypto.randomUUID();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distanceFromPointToSegment({
  point,
  start,
  end,
}: {
  point: { x: number; y: number };
  start: { x: number; y: number };
  end: { x: number; y: number };
}) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
      (dx * dx + dy * dy),
    0,
    1
  );

  const closest = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };

  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

function getObjectDisplayName(type: ObjectToolType) {
  switch (type) {
    case "team1":
      return "Team 1 Player";
    case "team2":
      return "Team 2 Player";
    case "cone":
      return "Cone";
    case "ball":
      return "Soccer Ball";
    case "mannequin":
      return "Mannequin";
    case "miniGoal":
      return "Mini Goal";
    case "fullGoal":
      return "Goal";
  }
}

function getSizeRange(type: ObjectToolType) {
  switch (type) {
    case "team1":
    case "team2":
      return { min: 24, max: 72 };
    case "cone":
      return { min: 14, max: 52 };
    case "ball":
      return { min: 14, max: 64 };
    case "mannequin":
      return { min: 12, max: 110 };
    case "miniGoal":
      return { min: 40, max: 140 };
    case "fullGoal":
      return { min: 70, max: 240 };
  }
}

function ConeIcon({
  className = "h-7 w-7",
  color = "#f97316",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <span
      className={`relative block rounded-full border-2 border-black ${className}`}
      style={{ backgroundColor: color }}
    >
      <span className="absolute left-1/2 top-1/2 block h-[35%] w-[35%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
    </span>
  );
}

function ToolIcon({
  type,
  team1Color,
  team2Color,
  coneColor,
  lineColor,
}: {
  type: ToolType;
  team1Color: string;
  team2Color: string;
  coneColor: string;
  lineColor: string;
}) {
  if (type === "team1" || type === "team2") {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black text-xs font-bold text-white"
        style={{
          backgroundColor: type === "team1" ? team1Color : team2Color,
        }}
      >
        {type === "team1" ? "1" : "2"}
      </span>
    );
  }

  if (type === "cone") {
    return <ConeIcon color={coneColor} />;
  }

  if (type === "ball") {
    return (
      <img
        src={ASSETS.ball}
        alt=""
        draggable={false}
        className="h-7 w-7 object-contain"
      />
    );
  }

  if (type === "mannequin") {
    return (
      <img
        src={ASSETS.mannequin}
        alt=""
        draggable={false}
        className="h-8 w-7 object-contain"
      />
    );
  }

  if (type === "miniGoal") {
    return (
      <img
        src={ASSETS.miniGoal}
        alt=""
        draggable={false}
        className="h-7 w-10 object-contain"
      />
    );
  }

  if (type === "fullGoal") {
    return (
      <img
        src={ASSETS.fullGoal}
        alt=""
        draggable={false}
        className="h-8 w-12 object-contain"
      />
    );
  }

  if (type === "line") {
    return (
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 24L26 8"
          stroke={lineColor}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "freehand") {
    return (
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 20C8 8 12 26 16 15C20 4 23 24 28 11"
          stroke={lineColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 32 32"
      className="h-7 w-7"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 22L22 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M18 6L26 14L15 25H7V17L18 6Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallTrashIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-4 w-4"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 11H22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M13 11V9H19V11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 14V24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 14V24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 14V24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M11 11L12 26H20L21 11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-5 w-5"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 5H21L25 9V27H8V5Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 5V13H21V5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 22H21"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SizeSetting({
  label,
  value,
  min,
  max,
  onChange,
  onApply,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onApply: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <label className="text-sm font-semibold text-slate-700">
        {label}: {value}px
      </label>

      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full"
      />

      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{min}px</span>
        <span>{max}px</span>
      </div>

      <button
        type="button"
        onClick={onApply}
        className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Apply to Existing
      </button>
    </div>
  );
}

function ColorSetting({
  label,
  value,
  onChange,
  buttonPrefix,
  footer,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  buttonPrefix: string;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <label className="text-sm font-semibold text-slate-700">{label}</label>

      <div className="mt-2 flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
        />

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {presetColors.map((color) => (
          <button
            key={`${buttonPrefix}-${color.value}`}
            type="button"
            onClick={() => onChange(color.value)}
            title={color.label}
            className="h-7 w-7 rounded-full border border-slate-400"
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>

      {footer}
    </div>
  );
}

type ActivityCreatorProps = {
  initialActivity?: Activity;
};

function getInitialCreatorState(initialActivity?: Activity) {
  return initialActivity?.creatorState;
}

function getInitialPitchBackground(
  initialCreatorState?: ActivityCreatorState
): PitchBackgroundType {
  const pitchBackground = initialCreatorState?.selectedPitchBackground;

  if (
    pitchBackground === "pitchGreen" ||
    pitchBackground === "pitchWhite" ||
    pitchBackground === "greenBlank" ||
    pitchBackground === "whiteBlank"
  ) {
    return pitchBackground;
  }

  return "pitchGreen";
}

function getInitialPlayerDisplayMode(
  initialCreatorState?: ActivityCreatorState
): PlayerDisplayMode {
  const displayMode = initialCreatorState?.settings?.playerDisplayMode;

  if (
    displayMode === "number" ||
    displayMode === "name" ||
    displayMode === "both" ||
    displayMode === "none"
  ) {
    return displayMode;
  }

  return "number";
}

export default function ActivityCreator({ initialActivity }: ActivityCreatorProps) {
  const initialCreatorState = getInitialCreatorState(initialActivity);
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const previewCaptureRef = useRef<HTMLDivElement | null>(null);

  const [selectedTool, setSelectedTool] = useState<ToolType>("team1");
  const [mobileToolGroup, setMobileToolGroup] =
    useState<MobileToolGroup>("objects");
  const [selectedPitchBackground, setSelectedPitchBackground] =
    useState<PitchBackgroundType>(getInitialPitchBackground(initialCreatorState));
  const [objects, setObjects] = useState<PitchObject[]>((initialCreatorState?.objects || []) as PitchObject[]);
  const [lines, setLines] = useState<PitchLine[]>((initialCreatorState?.lines || []) as PitchLine[]);
  const [isDashed, setIsDashed] = useState(false);
  const [isArrow, setIsArrow] = useState(false);
  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null);
  const [activeLinePoints, setActiveLinePoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [message, setMessage] = useState("");
  const [showToolbarSettings, setShowToolbarSettings] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isSavePanelOpen, setIsSavePanelOpen] = useState(false);

  const [team1Color, setTeam1Color] = useState(initialCreatorState?.settings?.team1Color || "#2563eb");
  const [team2Color, setTeam2Color] = useState(initialCreatorState?.settings?.team2Color || "#dc2626");
  const [coneColor, setConeColor] = useState(initialCreatorState?.settings?.coneColor || "#f97316");
  const [lineColor, setLineColor] = useState(initialCreatorState?.settings?.lineColor || "#111827");

  const [playerDefaultSize, setPlayerDefaultSize] = useState(initialCreatorState?.settings?.playerDefaultSize || 24);
  const [coneDefaultSize, setConeDefaultSize] = useState(initialCreatorState?.settings?.coneDefaultSize || 14);
  const [mannequinDefaultSize, setMannequinDefaultSize] = useState(initialCreatorState?.settings?.mannequinDefaultSize || 12);
  const [ballDefaultSize, setBallDefaultSize] = useState(initialCreatorState?.settings?.ballDefaultSize || 14);
  const [playerDisplayMode, setPlayerDisplayMode] =
    useState<PlayerDisplayMode>(getInitialPlayerDisplayMode(initialCreatorState));

  const [isZoomLocked, setIsZoomLocked] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panState, setPanState] = useState<PanState | null>(null);
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  const selectedObject =
    objects.find((object) => object.id === selectedObjectId) ?? null;

  const selectedPitchAsset =
    pitchBackgrounds.find(
      (background) => background.type === selectedPitchBackground
    )?.assetPath ?? "/activity-assets/pitch_green.png";

  const playerCount = useMemo(() => {
    return objects.filter(
      (object) => object.type === "team1" || object.type === "team2"
    ).length;
  }, [objects]);

  const mobileVisibleTools =
    mobileToolGroup === "objects"
      ? tools.filter((tool) => objectToolTypes.includes(tool.type))
      : mobileToolGroup === "draw"
        ? tools.filter((tool) => drawToolTypes.includes(tool.type))
        : [];

  const creatorState = useMemo<ActivityCreatorState>(
    () => ({
      selectedPitchBackground,
      objects,
      lines,
      settings: {
        team1Color,
        team2Color,
        coneColor,
        lineColor,
        playerDefaultSize,
        coneDefaultSize,
        mannequinDefaultSize,
        ballDefaultSize,
        playerDisplayMode,
      },
    }),
    [
      selectedPitchBackground,
      objects,
      lines,
      team1Color,
      team2Color,
      coneColor,
      lineColor,
      playerDefaultSize,
      coneDefaultSize,
      mannequinDefaultSize,
      ballDefaultSize,
      playerDisplayMode,
    ]
  );

  function openSavePanel() {
    setSelectedObjectId(null);
    setActiveLinePoints([]);
    setIsSavePanelOpen(true);
  }

  async function getCreatorPreviewDataUrl() {
    const captureElement = previewCaptureRef.current;

    if (!captureElement) {
      return undefined;
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    const images = Array.from(captureElement.querySelectorAll("img"));

    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.onload = () => resolve();
            image.onerror = () => resolve();
          })
      )
    );

    return toPng(captureElement, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: 2,
      filter: (node) => {
        if (node instanceof HTMLElement) {
          return node.dataset.previewExclude !== "true";
        }

        return true;
      },
    });
  }

  function createHistorySnapshot(): HistorySnapshot {
    return {
      objects: objects.map((object) => ({ ...object })),
      lines: lines.map((line) => ({
        ...line,
        points: line.points.map((point) => ({ ...point })),
      })),
    };
  }

  function restoreHistorySnapshot(snapshot: HistorySnapshot) {
    setObjects(snapshot.objects.map((object) => ({ ...object })));
    setLines(
      snapshot.lines.map((line) => ({
        ...line,
        points: line.points.map((point) => ({ ...point })),
      }))
    );

    setSelectedObjectId(null);
    setDraggingObjectId(null);
    setActiveLinePoints([]);
    setPanState(null);
  }

  function saveHistorySnapshot() {
    setUndoStack((currentStack) => [
      ...currentStack.slice(-49),
      createHistorySnapshot(),
    ]);

    setRedoStack([]);
  }

  function undoPitchChange() {
    if (undoStack.length === 0) {
      return;
    }

    const previousSnapshot = undoStack[undoStack.length - 1];
    const currentSnapshot = createHistorySnapshot();

    setUndoStack((currentStack) => currentStack.slice(0, -1));
    setRedoStack((currentStack) => [...currentStack.slice(-49), currentSnapshot]);

    restoreHistorySnapshot(previousSnapshot);
    setMessage("Undone.");
  }

  function redoPitchChange() {
    if (redoStack.length === 0) {
      return;
    }

    const nextSnapshot = redoStack[redoStack.length - 1];
    const currentSnapshot = createHistorySnapshot();

    setRedoStack((currentStack) => currentStack.slice(0, -1));
    setUndoStack((currentStack) => [...currentStack.slice(-49), currentSnapshot]);

    restoreHistorySnapshot(nextSnapshot);
    setMessage("Redone.");
  }

  function getPitchPointFromClient(clientX: number, clientY: number) {
    const rect = pitchRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function getPitchPoint(event: PointerEvent<HTMLDivElement>) {
    return getPitchPointFromClient(event.clientX, event.clientY);
  }

  function changeZoom(nextZoom: number) {
    if (isZoomLocked) {
      return;
    }

    setZoom(clamp(nextZoom, 0.5, 3));
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPanState(null);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (isZoomLocked) {
      return;
    }

    event.preventDefault();

    const zoomDirection = event.deltaY < 0 ? 0.1 : -0.1;
    setZoom((currentZoom) => clamp(currentZoom + zoomDirection, 0.5, 3));
  }

  function getObjectFillColor(type: ObjectToolType) {
    if (type === "team1") {
      return team1Color;
    }

    if (type === "team2") {
      return team2Color;
    }

    if (type === "cone") {
      return coneColor;
    }

    return undefined;
  }

  function getDefaultObjectSize(type: ObjectToolType) {
    if (type === "team1" || type === "team2") {
      return playerDefaultSize;
    }

    if (type === "cone") {
      return coneDefaultSize;
    }

    if (type === "ball") {
      return ballDefaultSize;
    }

    if (type === "mannequin") {
      return mannequinDefaultSize;
    }

    if (type === "miniGoal") {
      return 64;
    }

    if (type === "fullGoal") {
      return 112;
    }

    return 36;
  }

  function getObjectPixelSize(object: PitchObject) {
    if (object.size) {
      return object.size;
    }

    return getDefaultObjectSize(object.type);
  }

  function getObjectPixelHeight(object: PitchObject) {
    const width = getObjectPixelSize(object);

    if (object.type === "mannequin") {
      return width * 1.6;
    }

    if (object.type === "miniGoal") {
      return width * 0.625;
    }

    if (object.type === "fullGoal") {
      return width * 0.5;
    }

    return width;
  }

  function addObject(type: ObjectToolType) {
    saveHistorySnapshot();

    const nextPlayerNumber = playerCount + 1;

    const rowY =
      type === "team1"
        ? 12
        : type === "team2"
          ? 20
          : type === "cone"
            ? 28
            : type === "ball"
              ? 36
              : type === "mannequin"
                ? 44
                : 54;

    const similarObjects = objects.filter((object) => object.type === type);

    const shouldShiftRightOnMobile =
      type === "team1" || type === "team2" || type === "cone";

    const isMobileViewport =
      typeof window !== "undefined" && window.innerWidth < 768;

    const startingX = isMobileViewport && shouldShiftRightOnMobile ? 26 : 10;
    const spacingX = isMobileViewport && shouldShiftRightOnMobile ? 8 : 7;

    const nextX = clamp(startingX + similarObjects.length * spacingX, 5, 95);

    const newObject: PitchObject = {
      id: makeId(),
      type,
      x: nextX,
      y: rowY,
      label:
        type === "team1" || type === "team2" ? String(nextPlayerNumber) : "",
      playerName: "",
      rotation: 0,
      fillColor: getObjectFillColor(type),
      size: getDefaultObjectSize(type),
    };

    setObjects((currentObjects) => [...currentObjects, newObject]);
  }

  function handleToolClick(tool: ToolType) {
    setSelectedTool(tool);
    setSelectedObjectId(null);
    setMessage("");

    if (
      tool === "team1" ||
      tool === "team2" ||
      tool === "cone" ||
      tool === "ball" ||
      tool === "mannequin" ||
      tool === "miniGoal" ||
      tool === "fullGoal"
    ) {
      addObject(tool);
    }
  }

  function handlePitchPointerDown(event: PointerEvent<HTMLDivElement>) {
    const point = getPitchPoint(event);

    if (selectedObjectId) {
      setSelectedObjectId(null);
    }

    if (selectedTool === "line" || selectedTool === "freehand") {
      setActiveLinePoints([point]);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (selectedTool === "eraser") {
      eraseNearestLine(point);
      return;
    }

    if (!isZoomLocked) {
      setPanState({
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handlePitchPointerMove(event: PointerEvent<HTMLDivElement>) {
    const point = getPitchPoint(event);

    if (draggingObjectId) {
      setObjects((currentObjects) =>
        currentObjects.map((object) =>
          object.id === draggingObjectId
            ? {
                ...object,
                x: point.x,
                y: point.y,
              }
            : object
        )
      );
      return;
    }

    if (panState) {
      setPan({
        x: panState.startPanX + (event.clientX - panState.startClientX),
        y: panState.startPanY + (event.clientY - panState.startClientY),
      });
      return;
    }

    if (selectedTool === "freehand" && activeLinePoints.length > 0) {
      setActiveLinePoints((currentPoints) => [...currentPoints, point]);
      return;
    }

    if (selectedTool === "line" && activeLinePoints.length > 0) {
      setActiveLinePoints([activeLinePoints[0], point]);
      return;
    }

    if (selectedTool === "eraser") {
      eraseNearestLine(point);
    }
  }

  function handlePitchPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (draggingObjectId) {
      setDraggingObjectId(null);
      return;
    }

    if (panState) {
      setPanState(null);

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may not have been captured.
      }

      return;
    }

    if (
      (selectedTool === "line" || selectedTool === "freehand") &&
      activeLinePoints.length > 1
    ) {
      saveHistorySnapshot();

      setLines((currentLines) => [
        ...currentLines,
        {
          id: makeId(),
          points: activeLinePoints,
          dashed: isDashed,
          arrow: isArrow,
          color: lineColor,
        },
      ]);
    }

    setActiveLinePoints([]);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may not have been captured.
    }
  }

  function eraseNearestLine(point: { x: number; y: number }) {
    const eraseTolerance = 3.2;

    const lineToErase = lines.find((line) => {
      if (line.points.length < 2) {
        return false;
      }

      for (let index = 0; index < line.points.length - 1; index += 1) {
        const start = line.points[index];
        const end = line.points[index + 1];

        const distance = distanceFromPointToSegment({
          point,
          start,
          end,
        });

        if (distance <= eraseTolerance) {
          return true;
        }
      }

      return false;
    });

    if (!lineToErase) {
      return;
    }

    saveHistorySnapshot();

    setLines((currentLines) =>
      currentLines.filter((line) => line.id !== lineToErase.id)
    );
  }

  function deleteObject(objectId: string) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.filter((object) => object.id !== objectId)
    );

    if (selectedObjectId === objectId) {
      setSelectedObjectId(null);
    }

    setMessage("Object deleted.");
  }

  function rotateObject(objectId: string) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              rotation: (object.rotation + 45) % 360,
            }
          : object
      )
    );
  }

  function openObjectEditor(objectId: string) {
    setSelectedObjectId(objectId);
    setMessage("");
  }

  function updateObjectSize(objectId: string, size: number) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              size,
            }
          : object
      )
    );
  }

  function updateObjectColor(objectId: string, fillColor: string) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              fillColor,
            }
          : object
      )
    );
  }

  function updatePlayerNumber(objectId: string, label: string) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              label,
            }
          : object
      )
    );
  }

  function updatePlayerName(objectId: string, playerName: string) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              playerName,
            }
          : object
      )
    );
  }

  function applyColorToExistingObjects(
    objectTypes: ObjectToolType[],
    fillColor: string,
    messageText: string
  ) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        objectTypes.includes(object.type)
          ? {
              ...object,
              fillColor,
            }
          : object
      )
    );

    setMessage(messageText);
  }

  function applySizeToExistingObjects(
    objectTypes: ObjectToolType[],
    size: number,
    messageText: string
  ) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        objectTypes.includes(object.type)
          ? {
              ...object,
              size,
            }
          : object
      )
    );

    setMessage(messageText);
  }

  function clearPitch() {
    saveHistorySnapshot();

    setObjects([]);
    setLines([]);
    setActiveLinePoints([]);
    setDraggingObjectId(null);
    setSelectedObjectId(null);
    setPanState(null);
    setMessage("Pitch cleared.");
  }

  function startDraggingObject(
    event: PointerEvent<HTMLButtonElement>,
    objectId: string
  ) {
    event.stopPropagation();
    saveHistorySnapshot();
    setDraggingObjectId(objectId);
  }

  function renderToolButton(tool: {
    type: ToolType;
    label: string;
    shortLabel: string;
  }) {
    return (
      <button
        key={tool.type}
        type="button"
        onClick={() => handleToolClick(tool.type)}
        title={tool.label}
        aria-label={tool.label}
        className={`flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold md:h-16 md:w-16 md:text-xs ${
          selectedTool === tool.type
            ? "bg-[#0d2140] text-white"
            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <ToolIcon
          type={tool.type}
          team1Color={team1Color}
          team2Color={team2Color}
          coneColor={coneColor}
          lineColor={lineColor}
        />
        <span className="leading-none">{tool.shortLabel}</span>
      </button>
    );
  }

  function renderLine(line: PitchLine, isPreview = false) {
    if (line.points.length < 2) {
      return null;
    }

    const points = line.points.map((point) => `${point.x},${point.y}`).join(" ");

    const end = line.points[line.points.length - 1];
    const previous = line.points[line.points.length - 2];
    const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
    const arrowLength = 2.5;
    const arrowAngle = Math.PI / 6;

    const arrowPoint1 = {
      x: end.x - arrowLength * Math.cos(angle - arrowAngle),
      y: end.y - arrowLength * Math.sin(angle - arrowAngle),
    };

    const arrowPoint2 = {
      x: end.x - arrowLength * Math.cos(angle + arrowAngle),
      y: end.y - arrowLength * Math.sin(angle + arrowAngle),
    };

    const strokeColor = isPreview ? lineColor : line.color;

    return (
      <g key={line.id}>
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="0.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={line.dashed ? "1.8 1.4" : undefined}
          opacity={isPreview ? 0.75 : 1}
        />

        {line.arrow && (
          <polyline
            points={`${arrowPoint1.x},${arrowPoint1.y} ${end.x},${end.y} ${arrowPoint2.x},${arrowPoint2.y}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.55"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isPreview ? 0.75 : 1}
          />
        )}
      </g>
    );
  }

  function renderPlayerObject(object: PitchObject) {
    const fallbackColor = object.type === "team1" ? team1Color : team2Color;
    const fillColor = object.fillColor ?? fallbackColor;
    const size = object.size ?? playerDefaultSize;
    const hitSize = Math.max(size, 44);
    const fontSize = Math.max(10, Math.round(size * 0.42));
    const nameFontSize = Math.max(9, Math.round(size * 0.3));

    const shouldShowNumber =
      playerDisplayMode === "number" || playerDisplayMode === "both";

    const shouldShowName =
      playerDisplayMode === "name" || playerDisplayMode === "both";

    const displayName = object.playerName?.trim();

    return (
      <div
        key={object.id}
        className={`absolute z-20 flex flex-col items-center justify-center ${
          selectedObjectId === object.id ? "rounded-lg ring-4 ring-blue-400" : ""
        }`}
        style={{
          left: `${object.x}%`,
          top: `${object.y}%`,
          width: `${hitSize}px`,
          minHeight: `${hitSize}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <button
          type="button"
          onPointerDown={(event) => startDraggingObject(event, object.id)}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            openObjectEditor(object.id);
          }}
          className="flex items-center justify-center rounded-full border-2 border-black font-bold text-white shadow-sm"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            fontSize: `${fontSize}px`,
            backgroundColor: fillColor,
          }}
          title="Drag to move. Double-click to edit."
        >
          {shouldShowNumber ? object.label : ""}
        </button>

        {shouldShowName && displayName && (
          <div
            className="pointer-events-none mt-1 max-w-[90px] rounded bg-white/85 px-1 text-center font-bold leading-tight text-slate-900 shadow-sm"
            style={{
              fontSize: `${nameFontSize}px`,
            }}
          >
            {displayName}
          </div>
        )}
      </div>
    );
  }

  function getAssetForObject(type: ObjectToolType) {
    switch (type) {
      case "ball":
        return ASSETS.ball;
      case "mannequin":
        return ASSETS.mannequin;
      case "miniGoal":
        return ASSETS.miniGoal;
      case "fullGoal":
        return ASSETS.fullGoal;
      default:
        return "";
    }
  }

  function renderConeObject(object: PitchObject) {
    const size = object.size ?? coneDefaultSize;
    const hitSize = Math.max(size, 44);
    const fillColor = object.fillColor ?? coneColor;

    return (
      <button
        key={object.id}
        type="button"
        onPointerDown={(event) => startDraggingObject(event, object.id)}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          openObjectEditor(object.id);
        }}
        className={`absolute z-20 flex touch-none items-center justify-center bg-transparent p-0 ${
          selectedObjectId === object.id ? "ring-4 ring-blue-400" : ""
        }`}
        style={{
          left: `${object.x}%`,
          top: `${object.y}%`,
          width: `${hitSize}px`,
          height: `${hitSize}px`,
          transform: "translate(-50%, -50%)",
        }}
        title="Drag to move. Double-click to edit."
      >
        <span
          style={{
            width: `${size}px`,
            height: `${size}px`,
          }}
        >
          <ConeIcon className="h-full w-full" color={fillColor} />
        </span>
      </button>
    );
  }

  function renderAssetObject(object: PitchObject) {
    const assetPath = getAssetForObject(object.type);

    if (!assetPath) {
      return null;
    }

    const width = getObjectPixelSize(object);

    const height =
      object.type === "mannequin"
        ? width * 1.6
        : object.type === "miniGoal"
          ? width * 0.625
          : object.type === "fullGoal"
            ? width * 0.5
            : width;

    const hitWidth = Math.max(width, 44);
    const hitHeight = Math.max(height, 44);

    return (
      <button
        key={object.id}
        type="button"
        onPointerDown={(event) => startDraggingObject(event, object.id)}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          openObjectEditor(object.id);
        }}
        className={`absolute z-20 flex touch-none items-center justify-center bg-transparent p-0 ${
          selectedObjectId === object.id ? "ring-4 ring-blue-400" : ""
        }`}
        style={{
          left: `${object.x}%`,
          top: `${object.y}%`,
          width: `${hitWidth}px`,
          height: `${hitHeight}px`,
          transform: `translate(-50%, -50%) rotate(${object.rotation}deg)`,
        }}
        title="Drag to move. Double-click to edit."
      >
        <img
          src={assetPath}
          alt={object.type}
          draggable={false}
          className="object-contain drop-shadow-sm"
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
      </button>
    );
  }

  function renderObject(object: PitchObject) {
    if (object.type === "team1" || object.type === "team2") {
      return renderPlayerObject(object);
    }

    if (object.type === "cone") {
      return renderConeObject(object);
    }

    return renderAssetObject(object);
  }

  function renderSelectedObjectPitchControls() {
    if (!selectedObject) {
      return null;
    }

    const objectHeight = getObjectPixelHeight(selectedObject);
    const controlsOffset = objectHeight / 2 + 14;
    const sizeValue =
      selectedObject.size ?? getDefaultObjectSize(selectedObject.type);
    const sizeRange = getSizeRange(selectedObject.type);

    const panelX = clamp(selectedObject.x, 20, 80);
    const shouldOpenAbove = selectedObject.y > 62;

    const panelTop = shouldOpenAbove
      ? `calc(${selectedObject.y}% - ${objectHeight / 2 + 14}px)`
      : `calc(${selectedObject.y}% + ${controlsOffset}px)`;

    const panelTransform = shouldOpenAbove
      ? "translate(-50%, -100%)"
      : "translateX(-50%)";

    const supportsColor =
      selectedObject.type === "team1" ||
      selectedObject.type === "team2" ||
      selectedObject.type === "cone";

    const supportsPlayerFields =
      selectedObject.type === "team1" || selectedObject.type === "team2";

    const colorValue =
      selectedObject.fillColor ??
      (selectedObject.type === "team1"
        ? team1Color
        : selectedObject.type === "team2"
          ? team2Color
          : coneColor);

    return (
      <div
        data-preview-exclude="true"
        className="absolute z-40 w-44 rounded-xl border border-slate-300 bg-white/95 p-3 text-slate-800 shadow-xl backdrop-blur md:w-52"
        style={{
          left: `${panelX}%`,
          top: panelTop,
          transform: panelTransform,
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 md:text-[11px]">
            {getObjectDisplayName(selectedObject.type)}
          </div>

          <div className="flex items-center gap-1">
            {(selectedObject.type === "miniGoal" ||
              selectedObject.type === "fullGoal") && (
              <button
                type="button"
                onClick={() => rotateObject(selectedObject.id)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                title="Rotate"
              >
                ↻
              </button>
            )}

            <button
              type="button"
              onClick={() => deleteObject(selectedObject.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-red-700 bg-red-600 text-white shadow-sm hover:bg-red-700"
              title="Delete this object"
            >
              <SmallTrashIcon />
            </button>

            <button
              type="button"
              onClick={() => setSelectedObjectId(null)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
              title="Close controls"
            >
              ×
            </button>
          </div>
        </div>

        <label className="block text-[11px] font-semibold text-slate-600">
          Size: {sizeValue}px
        </label>

        <input
          type="range"
          min={sizeRange.min}
          max={sizeRange.max}
          step="1"
          value={sizeValue}
          onChange={(event) =>
            updateObjectSize(selectedObject.id, Number(event.target.value))
          }
          className="mt-1 w-full"
        />

        {supportsColor && (
          <div className="mt-2">
            <label className="block text-[11px] font-semibold text-slate-600">
              Color
            </label>

            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={colorValue}
                onChange={(event) =>
                  updateObjectColor(selectedObject.id, event.target.value)
                }
                className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-1"
              />

              <input
                type="text"
                value={colorValue}
                onChange={(event) =>
                  updateObjectColor(selectedObject.id, event.target.value)
                }
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
          </div>
        )}

        {supportsPlayerFields && (
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Number
              </label>

              <input
                type="text"
                value={selectedObject.label ?? ""}
                onChange={(event) =>
                  updatePlayerNumber(selectedObject.id, event.target.value)
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Name
              </label>

              <input
                type="text"
                value={selectedObject.playerName ?? ""}
                onChange={(event) =>
                  updatePlayerName(selectedObject.id, event.target.value)
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-xl bg-white p-3 shadow-sm md:p-4">
        <div className="md:hidden">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMobileToolGroup("objects")}
              className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                mobileToolGroup === "objects"
                  ? "border-[#0d2140] bg-[#0d2140] text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Objects
            </button>

            <button
              type="button"
              onClick={() => setMobileToolGroup("draw")}
              className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                mobileToolGroup === "draw"
                  ? "border-[#0d2140] bg-[#0d2140] text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Draw
            </button>

            <button
              type="button"
              onClick={() => setMobileToolGroup("settings")}
              className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                mobileToolGroup === "settings"
                  ? "border-[#0d2140] bg-[#0d2140] text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Settings
            </button>
          </div>

          {mobileToolGroup !== "settings" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {mobileVisibleTools.map((tool) => renderToolButton(tool))}

              {mobileToolGroup === "draw" && (
                <>
                  <label className="flex h-14 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-slate-300 text-[10px] font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isDashed}
                      onChange={(event) => setIsDashed(event.target.checked)}
                    />
                    Dashed
                  </label>

                  <label className="flex h-14 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-slate-300 text-[10px] font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isArrow}
                      onChange={(event) => setIsArrow(event.target.checked)}
                    />
                    Arrow
                  </label>
                </>
              )}
            </div>
          )}

          {mobileToolGroup === "settings" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowToolbarSettings((current) => !current)}
                className={`h-12 rounded-lg px-4 text-sm font-bold ${
                  showToolbarSettings
                    ? "bg-[#0d2140] text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                Toolbar Settings
              </button>

            </div>
          )}
        </div>

        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {tools.map((tool) => renderToolButton(tool))}

          <div className="mx-1 hidden h-10 w-px bg-slate-200 sm:block" />

          <label className="flex h-16 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isDashed}
              onChange={(event) => setIsDashed(event.target.checked)}
            />
            Dashed
          </label>

          <label className="flex h-16 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isArrow}
              onChange={(event) => setIsArrow(event.target.checked)}
            />
            Arrow
          </label>

          <button
            type="button"
            onClick={() => setShowToolbarSettings((current) => !current)}
            className={`flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold ${
              showToolbarSettings
                ? "bg-[#0d2140] text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <svg
              viewBox="0 0 32 32"
              className="h-7 w-7"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="16"
                cy="16"
                r="4"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <path
                d="M16 4V8M16 24V28M4 16H8M24 16H28M7.5 7.5L10.4 10.4M21.6 21.6L24.5 24.5M24.5 7.5L21.6 10.4M10.4 21.6L7.5 24.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={openSavePanel}
            className="ml-auto flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-green-300 text-xs font-semibold text-green-700 hover:bg-green-50"
          >
            <SaveIcon />
            <span>Save</span>
          </button>
        </div>

        {showToolbarSettings && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-800">
              Toolbar Settings
            </h3>

            <div className="mt-4 grid gap-4 lg:grid-cols-4">
              <ColorSetting
                label="Team 1 Circle Color"
                value={team1Color}
                onChange={setTeam1Color}
                buttonPrefix="team1"
                footer={
                  <button
                    type="button"
                    onClick={() =>
                      applyColorToExistingObjects(
                        ["team1"],
                        team1Color,
                        "Team 1 color applied to existing Team 1 players."
                      )
                    }
                    className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Apply to Existing Team 1
                  </button>
                }
              />

              <ColorSetting
                label="Team 2 Circle Color"
                value={team2Color}
                onChange={setTeam2Color}
                buttonPrefix="team2"
                footer={
                  <button
                    type="button"
                    onClick={() =>
                      applyColorToExistingObjects(
                        ["team2"],
                        team2Color,
                        "Team 2 color applied to existing Team 2 players."
                      )
                    }
                    className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Apply to Existing Team 2
                  </button>
                }
              />

              <ColorSetting
                label="Cone Color"
                value={coneColor}
                onChange={setConeColor}
                buttonPrefix="cone"
                footer={
                  <button
                    type="button"
                    onClick={() =>
                      applyColorToExistingObjects(
                        ["cone"],
                        coneColor,
                        "Cone color applied to existing cones."
                      )
                    }
                    className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Apply to Existing Cones
                  </button>
                }
              />

              <ColorSetting
                label="Line Color"
                value={lineColor}
                onChange={setLineColor}
                buttonPrefix="line"
                footer={
                  <p className="mt-3 text-xs text-slate-500">
                    New lines will use this color. Existing lines keep the color
                    they were drawn with.
                  </p>
                }
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-4">
              <SizeSetting
                label="Player Default Size"
                value={playerDefaultSize}
                min={24}
                max={72}
                onChange={setPlayerDefaultSize}
                onApply={() =>
                  applySizeToExistingObjects(
                    ["team1", "team2"],
                    playerDefaultSize,
                    "Player size applied to existing players."
                  )
                }
              />

              <SizeSetting
                label="Cone Default Size"
                value={coneDefaultSize}
                min={14}
                max={52}
                onChange={setConeDefaultSize}
                onApply={() =>
                  applySizeToExistingObjects(
                    ["cone"],
                    coneDefaultSize,
                    "Cone size applied to existing cones."
                  )
                }
              />

              <SizeSetting
                label="Mannequin Default Size"
                value={mannequinDefaultSize}
                min={12}
                max={110}
                onChange={setMannequinDefaultSize}
                onApply={() =>
                  applySizeToExistingObjects(
                    ["mannequin"],
                    mannequinDefaultSize,
                    "Mannequin size applied to existing mannequins."
                  )
                }
              />

              <SizeSetting
                label="Soccer Ball Default Size"
                value={ballDefaultSize}
                min={14}
                max={64}
                onChange={setBallDefaultSize}
                onApply={() =>
                  applySizeToExistingObjects(
                    ["ball"],
                    ballDefaultSize,
                    "Soccer ball size applied to existing soccer balls."
                  )
                }
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">
            Pitch Background
          </label>

          <select
            value={selectedPitchBackground}
            onChange={(event) =>
              setSelectedPitchBackground(
                event.target.value as PitchBackgroundType
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {pitchBackgrounds.map((background) => (
              <option key={background.type} value={background.type}>
                {background.label}
              </option>
            ))}
          </select>

          <label className="text-sm font-semibold text-slate-700 md:ml-4">
            Player Display Mode
          </label>

          <select
            value={playerDisplayMode}
            onChange={(event) =>
              setPlayerDisplayMode(event.target.value as PlayerDisplayMode)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="number">Number inside circle</option>
            <option value="name">Player name below circle</option>
            <option value="both">Number and player name</option>
            <option value="none">None</option>
          </select>

          <button
            type="button"
            onClick={undoPitchChange}
            disabled={undoStack.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>

          <button
            type="button"
            onClick={redoPitchChange}
            disabled={redoStack.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Redo
          </button>

          <button
            type="button"
            onClick={openSavePanel}
            className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-50"
          >
            Save
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Drag objects to move them. Double-click an object to edit it directly
          on the pitch. Click the pitch to close the object settings. Unlock
          zoom to zoom and pan the pitch.
        </p>

        {message && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {message}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl bg-white p-2 shadow-sm md:p-4">
        <div
          className="relative mx-auto flex max-w-full justify-center overflow-visible rounded-xl border border-slate-200 bg-slate-100"
          onWheel={handleWheel}
        >
          <div className="absolute left-2 top-2 z-50 flex flex-col gap-1 md:left-3 md:top-3 md:flex-row md:gap-2">
            <button
              type="button"
              onClick={() => setIsZoomLocked((current) => !current)}
              className={`flex h-9 items-center justify-center rounded-lg border px-2 text-xs font-bold shadow-sm md:h-10 md:px-3 ${
                isZoomLocked
                  ? "border-red-300 bg-red-100 text-red-700"
                  : "border-green-300 bg-green-100 text-green-700"
              }`}
              title={
                isZoomLocked
                  ? "Zoom and pan are locked"
                  : "Zoom and pan are unlocked"
              }
            >
              <span className="md:hidden">{isZoomLocked ? "🔒" : "🔓"}</span>
              <span className="hidden md:inline">
                {isZoomLocked ? "🔒 Locked" : "🔓 Unlocked"}
              </span>
            </button>

            <button
              type="button"
              disabled={isZoomLocked}
              onClick={() => changeZoom(zoom + 0.15)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 md:h-10"
              title="Zoom in"
            >
              +
            </button>

            <button
              type="button"
              disabled={isZoomLocked}
              onClick={() => changeZoom(zoom - 0.15)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 md:h-10"
              title="Zoom out"
            >
              −
            </button>

            <button
              type="button"
              disabled={isZoomLocked}
              onClick={resetView}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 md:h-10 md:px-3 md:text-xs"
              title="Reset zoom and pan"
            >
              Reset
            </button>
          </div>

          <div className="absolute right-2 top-2 z-50 md:right-3 md:top-3">
            <button
              type="button"
              onClick={clearPitch}
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 md:h-10"
              title="Clear pitch"
            >
              <SmallTrashIcon />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>

          <div className="flex h-[70vh] min-h-[420px] w-full justify-center overflow-visible md:h-[820px]">
            <div
              ref={pitchRef}
              onPointerDown={handlePitchPointerDown}
              onPointerMove={handlePitchPointerMove}
              onPointerUp={handlePitchPointerUp}
              onPointerCancel={() => {
                setDraggingObjectId(null);
                setActiveLinePoints([]);
                setPanState(null);
              }}
              className={`relative inline-block max-w-full touch-none overflow-visible rounded-xl bg-white shadow-inner ${
                !isZoomLocked && !panState ? "cursor-grab" : ""
              } ${panState ? "cursor-grabbing" : ""}`}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              <img
                src={selectedPitchAsset}
                alt="Soccer pitch"
                draggable={false}
                className="block h-auto max-h-[65vh] max-w-full select-none rounded-xl md:max-h-[760px]"
              />

              <svg
                className="absolute inset-0 z-10 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {lines.map((line) => renderLine(line))}

                {activeLinePoints.length > 1 &&
                  renderLine(
                    {
                      id: "preview",
                      points: activeLinePoints,
                      dashed: isDashed,
                      arrow: isArrow,
                      color: lineColor,
                    },
                    true
                  )}
              </svg>

              {objects.map((object) => renderObject(object))}
              {renderSelectedObjectPitchControls()}
            </div>

            <div
              ref={previewCaptureRef}
              className="pointer-events-none fixed left-[-9999px] top-[-9999px] w-[1200px] overflow-hidden rounded-xl bg-white"
            >
              <div className="relative inline-block w-full overflow-visible rounded-xl bg-white">
                <img
                  src={selectedPitchAsset}
                  alt="Soccer pitch preview"
                  draggable={false}
                  className="block h-auto w-full select-none rounded-xl"
                />

                <svg
                  className="absolute inset-0 z-10 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {lines.map((line) => renderLine(line))}
                </svg>

                <div className="absolute inset-0 z-20">
                  {objects.map((object) => renderObject(object))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isSavePanelOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Close save panel"
            onClick={() => setIsSavePanelOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Save Activity
                </h2>
                <p className="text-sm text-slate-500">
                  Add metadata before saving this created activity.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSavePanelOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-600 hover:bg-slate-50"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <ActivityMetadataForm
                mode="create"
                creatorState={creatorState}
                initialActivity={initialActivity}
                getPreviewDataUrl={getCreatorPreviewDataUrl}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}