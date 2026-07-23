"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent,
  ReactNode,
  WheelEvent,
} from "react";
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
  | "textBox"
  | "line"
  | "freehand"
  | "dribble"
  | "eraser";

type ObjectToolType = Exclude<
  ToolType,
  "line" | "freehand" | "dribble" | "eraser"
>;

type PitchBackgroundType =
  | "pitchGreen"
  | "pitchGreenTilted"
  | "greenBlank"
  | "pitchWhite"
  | "pitchWhiteTilted"
  | "whiteBlank";

type PlayerDisplayMode = "number" | "name" | "both" | "none";

type PlayerShape = "circle" | "triangle" | "square" | "diamond";

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
  textColor?: string;
  nameFontSize?: number;
  playerShape?: PlayerShape;
  playerDisplayModeOverride?: PlayerDisplayMode;
  textContent?: string;
  fontSize?: number;
};

type PitchLine = {
  id: string;
  points: { x: number; y: number }[];
  dashed: boolean;
  arrow: boolean;
  color: string;
  lineWidth: number;
  lineStyle: "standard" | "dribble";
};

type PanState = {
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
};

type PopOutDragState = {
  startClientX: number;
  startClientY: number;
  startLeft: number;
  startTop: number;
};

type HistorySnapshot = {
  objects: PitchObject[];
  lines: PitchLine[];
};

type ActivityFrame = {
  id: string;
  name: string;
  durationMs: number;
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
    type: "pitchGreenTilted",
    label: "Green Tilted",
    assetPath: "",
  },
  {
    type: "greenBlank",
    label: "Green Blank",
    assetPath: "/activity-assets/green_blank.png",
  },
  {
    type: "pitchWhite",
    label: "White Pitch",
    assetPath: "/activity-assets/pitch_white.png",
  },
  {
    type: "pitchWhiteTilted",
    label: "White Tilted",
    assetPath: "",
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
  { type: "textBox", label: "Text", shortLabel: "Text" },
  { type: "line", label: "Line", shortLabel: "Line" },
  { type: "freehand", label: "Free Draw", shortLabel: "Free" },
  { type: "dribble", label: "Dribble Line", shortLabel: "Dribble" },
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
  "textBox",
];

const drawToolTypes: ToolType[] = ["line", "freehand", "dribble", "eraser"];

const USER_CREATOR_SETTINGS_KEY = "ab3-activity-creator-user-settings";
const DEFAULT_FRAME_DURATION_MS = 1500;

type PersistedCreatorUserSettings = {
  toolbarOnLeft: boolean;
  showAnimationDurations: boolean;
  defaultFrameDurationMs: number;
  selectedPitchBackground: PitchBackgroundType;
  playerDisplayMode: PlayerDisplayMode;
  team1Color: string;
  team2Color: string;
  playerTextColor: string;
  team1Shape: PlayerShape;
  team2Shape: PlayerShape;
  coneColor: string;
  lineColor: string;
  lineWidth: number;
  playerDefaultSize: number;
  coneDefaultSize: number;
  mannequinDefaultSize: number;
  ballDefaultSize: number;
};

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
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    0,
    1,
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
    case "textBox":
      return "Text Box";
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
    case "textBox":
      return { min: 60, max: 280 };
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
  playerTextColor,
  team1Shape,
  team2Shape,
  coneColor,
  lineColor,
}: {
  type: ToolType;
  team1Color: string;
  team2Color: string;
  playerTextColor: string;
  team1Shape: PlayerShape;
  team2Shape: PlayerShape;
  coneColor: string;
  lineColor: string;
}) {
  if (type === "team1" || type === "team2") {
    const shape = type === "team1" ? team1Shape : team2Shape;

    return (
      <span
        className="flex h-7 w-7 items-center justify-center border-2 border-black text-xs font-bold text-white"
        style={{
          backgroundColor: type === "team1" ? team1Color : team2Color,
          color: playerTextColor,
          borderRadius:
            shape === "circle" ? "9999px" : shape === "square" ? "5px" : "0",
          clipPath:
            shape === "triangle"
              ? "polygon(50% 0%, 100% 100%, 0% 100%)"
              : shape === "diamond"
                ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                : undefined,
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

  if (type === "textBox") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded border-2 border-slate-700 bg-white text-sm font-black text-slate-800">
        T
      </span>
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

  if (type === "dribble") {
    return (
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 16C4.5 8 7.5 8 10 16C12.5 24 15.5 24 18 16C20.5 8 23.5 8 26 16C27.5 21 28.5 21 29.5 18"
          stroke={lineColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25.5 16.5L29.5 18L27.8 22"
          stroke={lineColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
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

function PinIcon({ pinned }: { pinned: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M11 5H21L20 12L25 17V20H17V27L15 29V20H7V17L12 12L11 5Z"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={pinned ? "currentColor" : "none"}
      />
    </svg>
  );
}

function MovieCameraIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true">
      <rect
        x="5"
        y="10"
        width="16"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M21 14.5L27 11.5V21.5L21 18.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="18" cy="7" r="3" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

function FrameManagerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="6"
        width="17"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <rect
        x="10"
        y="13"
        width="17"
        height="13"
        rx="2"
        fill="white"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <path
        d="M15 18H22M15 22H20"
        stroke="currentColor"
        strokeWidth="2.1"
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

function CodedPitchBackground({
  background,
  zoom = 1,
  panX = 0,
  panY = 0,
  rotationDegrees = 0,
}: {
  background: PitchBackgroundType;
  zoom?: number;
  panX?: number;
  panY?: number;
  rotationDegrees?: number;
}) {
  const isTilted =
    background === "pitchGreenTilted" ||
    background === "pitchWhiteTilted";
  const isGreen =
    background === "pitchGreen" ||
    background === "pitchGreenTilted" ||
    background === "greenBlank";
  const isBlank = background === "greenBlank" || background === "whiteBlank";
  const lineColor = isGreen ? "#ffffff" : "#111827";

  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl">
      <svg
        viewBox="0 0 100 133.333333"
        aria-label="Soccer pitch"
        className="absolute inset-0 block h-full w-full select-none"
        preserveAspectRatio="none"
        style={{
          transform: `translate(${panX}px, ${panY}px) rotate(${rotationDegrees}deg) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <defs>
          <linearGradient
            id="ab3-green-pitch-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#168807" />
            <stop offset="50%" stopColor="#27c20d" />
            <stop offset="100%" stopColor="#147506" />
          </linearGradient>

          <linearGradient
            id="ab3-white-pitch-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f4f6f8" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width="100"
          height="133.333333"
          fill={
            isGreen
              ? "url(#ab3-green-pitch-gradient)"
              : "url(#ab3-white-pitch-gradient)"
          }
        />

        {isGreen &&
          Array.from({ length: 14 }).map((_, index) => (
            <rect
              key={index}
              x="0"
              y={(index * 133.333333) / 14}
              width="100"
              height={133.333333 / 14}
              fill={
                index % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
              }
            />
          ))}

        {!isBlank && isTilted && (
          <>
            <g
              fill="none"
              stroke={lineColor}
              strokeWidth="0.55"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Outer touchlines: narrower at the far end, wider at the near end. */}
              <path d="M 18 7 L 82 7 L 94 127.333333 L 6 127.333333 Z" />

              {/* Halfway line and perspective center circle. */}
              <line x1="12" y1="66.666667" x2="88" y2="66.666667" />
              <ellipse cx="50" cy="66.666667" rx="9.5" ry="7.2" />

              {/* Far penalty area and goal area. */}
              <path d="M 28 7 L 72 7 L 73.5 23.5 L 26.5 23.5 Z" />
              <path d="M 39 7 L 61 7 L 61.5 14.333333 L 38.5 14.333333 Z" />

              {/* Near penalty area and goal area. */}
              <path d="M 24 108 L 76 108 L 78 127.333333 L 22 127.333333 Z" />
              <path d="M 36 120 L 64 120 L 64.5 127.333333 L 35.5 127.333333 Z" />

              {/* Perspective-flattened penalty arcs. */}
              <path d="M 43.5 23.5 C 45.8 28.1 54.2 28.1 56.5 23.5" />
              <path d="M 41.5 108 C 44 101.5 56 101.5 58.5 108" />

              {/* Corner arcs. */}
              <path d="M 20.8 7 C 20.8 8.5 19.4 9.6 17.8 9.6" />
              <path d="M 79.2 7 C 79.2 8.5 80.6 9.6 82.2 9.6" />
              <path d="M 8.8 127.333333 C 8.8 125.8 7.7 124.5 6.28 124.5" />
              <path d="M 91.2 127.333333 C 91.2 125.8 92.3 124.5 93.72 124.5" />
            </g>

            <g fill={lineColor}>
              <circle cx="50" cy="66.666667" r="0.65" />
              <circle cx="50" cy="18.666667" r="0.65" />
              <circle cx="50" cy="114.666667" r="0.65" />
            </g>
          </>
        )}

        {!isBlank && !isTilted && (
          <>
            <g
              fill="none"
              stroke={lineColor}
              strokeWidth="0.55"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="8" y="6" width="84" height="121.333333" />

              <line x1="8" y1="66.666667" x2="92" y2="66.666667" />
              <circle cx="50" cy="66.666667" r="9.5" />

              <rect x="26" y="6" width="48" height="19.333333" />
              <rect x="38" y="6" width="24" height="7.333333" />

              <rect x="26" y="108" width="48" height="19.333333" />
              <rect x="38" y="120" width="24" height="7.333333" />

              <path d="M 43.04 25.333333 A 8.5 8.5 0 0 0 56.96 25.333333" />
              <path d="M 43.04 108 A 8.5 8.5 0 0 1 56.96 108" />

              <path d="M 10.8 6 A 2.8 2.8 0 0 1 8 8.8" />
              <path d="M 89.2 6 A 2.8 2.8 0 0 0 92 8.8" />
              <path d="M 10.8 127.333333 A 2.8 2.8 0 0 0 8 124.533333" />
              <path d="M 89.2 127.333333 A 2.8 2.8 0 0 1 92 124.533333" />
            </g>

            <g fill={lineColor}>
              <circle cx="50" cy="66.666667" r="0.65" />
              <circle cx="50" cy="18.666667" r="0.65" />
              <circle cx="50" cy="114.666667" r="0.65" />
            </g>
          </>
        )}
      </svg>
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

type NormalizedCreatorState = {
  selectedPitchBackground: PitchBackgroundType;
  pitchView: {
    zoom: number;
    panX: number;
    panY: number;
    rotationDegrees: number;
    pitchAssetVersion: number;
    coordinateSystem: "legacyCanvas" | "canonicalPitchV1";
    sourcePlatform: "ios" | "web";
    clientActivityId?: string;
  };
  objects: PitchObject[];
  lines: PitchLine[];
  settings: {
    team1Color: string;
    team2Color: string;
    playerTextColor: string;
    team1Shape: PlayerShape;
    team2Shape: PlayerShape;
    coneColor: string;
    lineColor: string;
    playerDefaultSize: number;
    coneDefaultSize: number;
    mannequinDefaultSize: number;
    ballDefaultSize: number;
    playerDisplayMode: PlayerDisplayMode;
    lineDefaultWidth: number;
    defaultFrameDurationMs: number;
  };
};

function getInitialCreatorState(initialActivity?: Activity) {
  return initialActivity?.creatorState;
}

function isColorObject(
  value: unknown,
): value is { red: number; green: number; blue: number; opacity?: number } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeColor = value as {
    red?: unknown;
    green?: unknown;
    blue?: unknown;
  };

  return (
    typeof maybeColor.red === "number" &&
    typeof maybeColor.green === "number" &&
    typeof maybeColor.blue === "number"
  );
}

function colorToCss(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (!isColorObject(value)) {
    return fallback;
  }

  const red = Math.round(clamp(value.red, 0, 1) * 255);
  const green = Math.round(clamp(value.green, 0, 1) * 255);
  const blue = Math.round(clamp(value.blue, 0, 1) * 255);

  return `#${[red, green, blue]
    .map((component) => component.toString(16).padStart(2, "0"))
    .join("")}`;
}
function cssToColorObject(value: string) {
  const normalizedValue = value.trim();
  const hexMatch = normalizedValue.match(/^#?([0-9a-f]{6})$/i);

  if (!hexMatch) {
    return { red: 0, green: 0, blue: 0, opacity: 1 };
  }

  const hexValue = hexMatch[1];

  return {
    red: parseInt(hexValue.slice(0, 2), 16) / 255,
    green: parseInt(hexValue.slice(2, 4), 16) / 255,
    blue: parseInt(hexValue.slice(4, 6), 16) / 255,
    opacity: 1,
  };
}

function getFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isPitchBackground(value: unknown): value is PitchBackgroundType {
  return (
    value === "pitchGreen" ||
    value === "pitchGreenTilted" ||
    value === "pitchWhite" ||
    value === "pitchWhiteTilted" ||
    value === "greenBlank" ||
    value === "whiteBlank"
  );
}

function isPlayerShape(value: unknown): value is PlayerShape {
  return (
    value === "circle" ||
    value === "triangle" ||
    value === "square" ||
    value === "diamond"
  );
}

function isPlayerDisplayMode(value: unknown): value is PlayerDisplayMode {
  return (
    value === "number" ||
    value === "name" ||
    value === "both" ||
    value === "none"
  );
}

function isObjectToolType(value: unknown): value is ObjectToolType {
  return (
    value === "team1" ||
    value === "team2" ||
    value === "cone" ||
    value === "ball" ||
    value === "mannequin" ||
    value === "miniGoal" ||
    value === "fullGoal" ||
    value === "textBox"
  );
}

function isCreatorStateV2(initialCreatorState?: ActivityCreatorState) {
  return Boolean(
    initialCreatorState &&
    "schemaVersion" in initialCreatorState &&
    initialCreatorState.schemaVersion === 2 &&
    "pitch" in initialCreatorState,
  );
}

function normalizeV2Coordinate(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return clamp(value * 100, 0, 100);
}

function normalizeV1Coordinate(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return clamp(value, 0, 100);
}

function normalizeCreatorState(
  initialCreatorState?: ActivityCreatorState,
): NormalizedCreatorState {
  const defaultState: NormalizedCreatorState = {
    selectedPitchBackground: "pitchGreen",
    pitchView: {
      zoom: 1,
      panX: 0,
      panY: 0,
      rotationDegrees: 0,
      pitchAssetVersion: 2,
      coordinateSystem: "canonicalPitchV1",
      sourcePlatform: "web",
    },
    objects: [],
    lines: [],
    settings: {
      team1Color: "#2563eb",
      team2Color: "#dc2626",
      playerTextColor: "#ffffff",
      team1Shape: "circle",
      team2Shape: "circle",
      coneColor: "#f97316",
      lineColor: "#111827",
      playerDefaultSize: 24,
      coneDefaultSize: 14,
      mannequinDefaultSize: 12,
      ballDefaultSize: 14,
      playerDisplayMode: "number",
      lineDefaultWidth: 4,
      defaultFrameDurationMs: DEFAULT_FRAME_DURATION_MS,
    },
  };

  if (!initialCreatorState) {
    return defaultState;
  }

  if (isCreatorStateV2(initialCreatorState)) {
    const creatorState = initialCreatorState as ActivityCreatorState & {
      pitch?: Record<string, unknown>;
      settings?: Record<string, unknown>;
      objects?: unknown[];
      lines?: unknown[];
    };

    const creatorStateRecord = creatorState as Record<string, unknown>;
    const settings = creatorState.settings ?? {};

    return {
      selectedPitchBackground: isPitchBackground(creatorState.pitch?.background)
        ? creatorState.pitch.background
        : defaultState.selectedPitchBackground,
      pitchView: {
        zoom: getFiniteNumber(
          creatorState.pitch?.zoom,
          defaultState.pitchView.zoom,
        ),
        panX: getFiniteNumber(
          creatorState.pitch?.offsetX,
          defaultState.pitchView.panX,
        ),
        panY: getFiniteNumber(
          creatorState.pitch?.offsetY,
          defaultState.pitchView.panY,
        ),
        rotationDegrees: getFiniteNumber(
          creatorState.pitch?.rotationDegrees,
          defaultState.pitchView.rotationDegrees,
        ),
        pitchAssetVersion: getFiniteNumber(
          creatorState.pitch?.pitchAssetVersion,
          defaultState.pitchView.pitchAssetVersion,
        ),
        coordinateSystem:
          creatorState.pitch?.coordinateSystem === "legacyCanvas"
            ? "legacyCanvas"
            : "canonicalPitchV1",
        sourcePlatform:
          creatorStateRecord.sourcePlatform === "ios" ? "ios" : "web",
        clientActivityId:
          typeof creatorStateRecord.clientActivityId === "string"
            ? creatorStateRecord.clientActivityId
            : undefined,
      },
      objects: (creatorState.objects ?? []).reduce<PitchObject[]>(
        (normalizedObjects, rawObject) => {
          const object = rawObject as Record<string, unknown>;
          const type = object.type;

          if (!isObjectToolType(type)) {
            return normalizedObjects;
          }

          normalizedObjects.push({
            id: typeof object.id === "string" ? object.id : makeId(),
            type,
            x: normalizeV2Coordinate(object.x),
            y: normalizeV2Coordinate(object.y),
            label:
              typeof object.label === "string"
                ? object.label
                : typeof object.number === "string"
                  ? object.number
                  : "",
            playerName:
              typeof object.playerName === "string"
                ? object.playerName
                : typeof object.name === "string"
                  ? object.name
                  : "",
            rotation:
              typeof object.rotation === "number"
                ? object.rotation
                : typeof object.rotationDegrees === "number"
                  ? object.rotationDegrees
                  : 0,
            fillColor:
              type === "team1"
                ? colorToCss(
                    object.fillColor,
                    colorToCss(settings.team1DefaultColor, "#2563eb"),
                  )
                : type === "team2"
                  ? colorToCss(
                      object.fillColor,
                      colorToCss(settings.team2DefaultColor, "#dc2626"),
                    )
                  : type === "cone"
                    ? colorToCss(
                        object.fillColor,
                        colorToCss(settings.coneDefaultColor, "#f97316"),
                      )
                    : undefined,
            size: typeof object.size === "number" ? object.size : undefined,
            textColor: colorToCss(
              object.textColor,
              type === "team1" || type === "team2"
                ? colorToCss(settings.playerTextDefaultColor, "#ffffff")
                : "#111827",
            ),
            nameFontSize:
              typeof object.nameFontSize === "number"
                ? object.nameFontSize
                : undefined,
            playerShape:
              object.playerShape === "triangle" ||
              object.playerShape === "square" ||
              object.playerShape === "diamond" ||
              object.playerShape === "circle"
                ? object.playerShape
                : "circle",
            playerDisplayModeOverride: isPlayerDisplayMode(
              object.playerDisplayModeOverride,
            )
              ? object.playerDisplayModeOverride
              : undefined,
            textContent:
              typeof object.textContent === "string"
                ? object.textContent
                : "Text",
            fontSize:
              typeof object.fontSize === "number" ? object.fontSize : undefined,
          });

          return normalizedObjects;
        },
        [],
      ),
      lines: (creatorState.lines ?? [])
        .map<PitchLine>((rawLine) => {
          const line = rawLine as Record<string, unknown>;
          const points = Array.isArray(line.points) ? line.points : [];

          return {
            id: typeof line.id === "string" ? line.id : makeId(),
            points: points.map((rawPoint) => {
              const point = rawPoint as Record<string, unknown>;

              return {
                x: normalizeV2Coordinate(point.x),
                y: normalizeV2Coordinate(point.y),
              };
            }),
            dashed: Boolean(line.dashed ?? line.isDashed),
            arrow:
              line.lineStyle === "dribble"
                ? true
                : Boolean(line.arrow ?? line.isArrow),
            color: colorToCss(line.color, "#111827"),
            lineWidth: getFiniteNumber(line.lineWidth, 4),
            lineStyle: line.lineStyle === "dribble" ? "dribble" : "standard",
          };
        })
        .filter((line) => line.points.length >= 2),
      settings: {
        team1Color: colorToCss(settings.team1DefaultColor, "#2563eb"),
        team2Color: colorToCss(settings.team2DefaultColor, "#dc2626"),
        playerTextColor: colorToCss(
          settings.playerTextDefaultColor,
          defaultState.settings.playerTextColor,
        ),
        team1Shape: isPlayerShape(settings.team1DefaultShape)
          ? settings.team1DefaultShape
          : defaultState.settings.team1Shape,
        team2Shape: isPlayerShape(settings.team2DefaultShape)
          ? settings.team2DefaultShape
          : defaultState.settings.team2Shape,
        coneColor: colorToCss(settings.coneDefaultColor, "#f97316"),
        lineColor: defaultState.settings.lineColor,
        playerDefaultSize:
          typeof settings.playerDefaultSize === "number"
            ? settings.playerDefaultSize
            : defaultState.settings.playerDefaultSize,
        coneDefaultSize:
          typeof settings.coneDefaultSize === "number"
            ? settings.coneDefaultSize
            : defaultState.settings.coneDefaultSize,
        mannequinDefaultSize: defaultState.settings.mannequinDefaultSize,
        ballDefaultSize: defaultState.settings.ballDefaultSize,
        playerDisplayMode: isPlayerDisplayMode(settings.playerDisplayMode)
          ? settings.playerDisplayMode
          : defaultState.settings.playerDisplayMode,
        lineDefaultWidth: getFiniteNumber(
          settings.lineDefaultWidth,
          defaultState.settings.lineDefaultWidth,
        ),
        defaultFrameDurationMs: clamp(
          getFiniteNumber(
            settings.defaultFrameDurationMs,
            defaultState.settings.defaultFrameDurationMs,
          ),
          250,
          10000,
        ),
      },
    };
  }

  const creatorState = initialCreatorState as ActivityCreatorState & {
    selectedPitchBackground?: unknown;
    settings?: Record<string, unknown>;
    objects?: unknown[];
    lines?: unknown[];
  };

  const settings = creatorState.settings ?? {};

  return {
    selectedPitchBackground: isPitchBackground(
      creatorState.selectedPitchBackground,
    )
      ? creatorState.selectedPitchBackground
      : defaultState.selectedPitchBackground,
    pitchView: defaultState.pitchView,
    objects: (creatorState.objects ?? []).reduce<PitchObject[]>(
      (normalizedObjects, rawObject) => {
        const object = rawObject as Record<string, unknown>;
        const type = object.type;

        if (!isObjectToolType(type)) {
          return normalizedObjects;
        }

        normalizedObjects.push({
          id: typeof object.id === "string" ? object.id : makeId(),
          type,
          x: normalizeV1Coordinate(object.x),
          y: normalizeV1Coordinate(object.y),
          label: typeof object.label === "string" ? object.label : "",
          playerName:
            typeof object.playerName === "string" ? object.playerName : "",
          rotation: typeof object.rotation === "number" ? object.rotation : 0,
          fillColor:
            typeof object.fillColor === "string" ? object.fillColor : undefined,
          size: typeof object.size === "number" ? object.size : undefined,
          textColor:
            typeof object.textColor === "string"
              ? object.textColor
              : type === "team1" || type === "team2"
                ? typeof settings.playerTextColor === "string"
                  ? settings.playerTextColor
                  : "#ffffff"
                : undefined,
          nameFontSize:
            typeof object.nameFontSize === "number"
              ? object.nameFontSize
              : undefined,
          playerShape:
            object.playerShape === "triangle" ||
            object.playerShape === "square" ||
            object.playerShape === "diamond" ||
            object.playerShape === "circle"
              ? object.playerShape
              : "circle",
          playerDisplayModeOverride: isPlayerDisplayMode(
            object.playerDisplayModeOverride,
          )
            ? object.playerDisplayModeOverride
            : undefined,
          textContent:
            typeof object.textContent === "string"
              ? object.textContent
              : "Text",
          fontSize:
            typeof object.fontSize === "number" ? object.fontSize : undefined,
        });

        return normalizedObjects;
      },
      [],
    ),
    lines: (creatorState.lines ?? [])
      .map<PitchLine>((rawLine) => {
        const line = rawLine as Record<string, unknown>;
        const points = Array.isArray(line.points) ? line.points : [];

        return {
          id: typeof line.id === "string" ? line.id : makeId(),
          points: points.map((rawPoint) => {
            const point = rawPoint as Record<string, unknown>;

            return {
              x: normalizeV1Coordinate(point.x),
              y: normalizeV1Coordinate(point.y),
            };
          }),
          dashed: Boolean(line.dashed),
          arrow: line.lineStyle === "dribble" ? true : Boolean(line.arrow),
          color:
            typeof line.color === "string"
              ? line.color
              : defaultState.settings.lineColor,
          lineWidth: getFiniteNumber(line.lineWidth, 4),
          lineStyle: line.lineStyle === "dribble" ? "dribble" : "standard",
        };
      })
      .filter((line) => line.points.length >= 2),
    settings: {
      team1Color:
        typeof settings.team1Color === "string"
          ? settings.team1Color
          : defaultState.settings.team1Color,
      team2Color:
        typeof settings.team2Color === "string"
          ? settings.team2Color
          : defaultState.settings.team2Color,
      playerTextColor:
        typeof settings.playerTextColor === "string"
          ? settings.playerTextColor
          : colorToCss(
              settings.playerTextDefaultColor,
              defaultState.settings.playerTextColor,
            ),
      team1Shape: isPlayerShape(settings.team1Shape)
        ? settings.team1Shape
        : defaultState.settings.team1Shape,
      team2Shape: isPlayerShape(settings.team2Shape)
        ? settings.team2Shape
        : defaultState.settings.team2Shape,
      coneColor:
        typeof settings.coneColor === "string"
          ? settings.coneColor
          : defaultState.settings.coneColor,
      lineColor:
        typeof settings.lineColor === "string"
          ? settings.lineColor
          : defaultState.settings.lineColor,
      playerDefaultSize:
        typeof settings.playerDefaultSize === "number"
          ? settings.playerDefaultSize
          : defaultState.settings.playerDefaultSize,
      coneDefaultSize:
        typeof settings.coneDefaultSize === "number"
          ? settings.coneDefaultSize
          : defaultState.settings.coneDefaultSize,
      mannequinDefaultSize:
        typeof settings.mannequinDefaultSize === "number"
          ? settings.mannequinDefaultSize
          : defaultState.settings.mannequinDefaultSize,
      ballDefaultSize:
        typeof settings.ballDefaultSize === "number"
          ? settings.ballDefaultSize
          : defaultState.settings.ballDefaultSize,
      playerDisplayMode: isPlayerDisplayMode(settings.playerDisplayMode)
        ? settings.playerDisplayMode
        : defaultState.settings.playerDisplayMode,
      lineDefaultWidth: getFiniteNumber(
        settings.lineDefaultWidth,
        defaultState.settings.lineDefaultWidth,
      ),
      defaultFrameDurationMs: clamp(
        getFiniteNumber(
          settings.defaultFrameDurationMs,
          defaultState.settings.defaultFrameDurationMs,
        ),
        250,
        10000,
      ),
    },
  };
}

function deepCopyObjects(objects: PitchObject[]) {
  return objects.map((object) => ({ ...object }));
}

function deepCopyLines(lines: PitchLine[]) {
  return lines.map((line) => ({
    ...line,
    points: line.points.map((point) => ({ ...point })),
  }));
}

function getInitialFrames(
  initialCreatorState: ActivityCreatorState | undefined,
  fallbackState: NormalizedCreatorState,
): { frames: ActivityFrame[]; activeFrameId: string } {
  if (
    initialCreatorState &&
    "schemaVersion" in initialCreatorState &&
    initialCreatorState.schemaVersion === 3 &&
    "frames" in initialCreatorState &&
    Array.isArray(initialCreatorState.frames) &&
    initialCreatorState.frames.length > 0
  ) {
    const normalizedFrames = initialCreatorState.frames.map((frame, index) => {
      const normalized = normalizeCreatorState({
        schemaVersion: 2,
        sourcePlatform: initialCreatorState.sourcePlatform,
        clientActivityId: initialCreatorState.clientActivityId,
        pitch: initialCreatorState.pitch,
        settings: initialCreatorState.settings,
        objects: frame.objects ?? [],
        lines: frame.lines ?? [],
      });

      return {
        id: frame.id || makeId(),
        name: frame.name?.trim() || `Tab ${index + 1}`,
        durationMs: Math.max(
          250,
          frame.durationMs ?? DEFAULT_FRAME_DURATION_MS,
        ),
        objects: normalized.objects,
        lines: normalized.lines,
      };
    });

    // Always open an existing activity on the first tab.
    return {
      frames: normalizedFrames,
      activeFrameId: normalizedFrames[0].id,
    };
  }

  const firstFrameId = makeId();
  return {
    activeFrameId: firstFrameId,
    frames: [
      {
        id: firstFrameId,
        name: "Tab 1",
        durationMs: fallbackState.settings.defaultFrameDurationMs,
        objects: deepCopyObjects(fallbackState.objects),
        lines: deepCopyLines(fallbackState.lines),
      },
    ],
  };
}

export default function ActivityCreator({
  initialActivity,
}: ActivityCreatorProps) {
  const router = useRouter();
  const initialCreatorState = getInitialCreatorState(initialActivity);
  const normalizedInitialCreatorState = useMemo(() => {
    if (
      initialCreatorState &&
      "schemaVersion" in initialCreatorState &&
      initialCreatorState.schemaVersion === 3 &&
      "frames" in initialCreatorState &&
      initialCreatorState.frames.length > 0
    ) {
      // Edit mode should always initialize the pitch from Tab 1,
      // regardless of which tab was active when the activity was last saved.
      const activeFrame = initialCreatorState.frames[0];

      return normalizeCreatorState({
        schemaVersion: 2,
        sourcePlatform: initialCreatorState.sourcePlatform,
        clientActivityId: initialCreatorState.clientActivityId,
        pitch: initialCreatorState.pitch,
        settings: initialCreatorState.settings,
        objects: activeFrame.objects,
        lines: activeFrame.lines,
      });
    }

    return normalizeCreatorState(initialCreatorState);
  }, [initialCreatorState]);
  const normalizedInitialFrames = useMemo(
    () => getInitialFrames(initialCreatorState, normalizedInitialCreatorState),
    [initialCreatorState, normalizedInitialCreatorState],
  );
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const pitchSectionRef = useRef<HTMLElement | null>(null);
  const pitchControlsBoundaryRef = useRef<HTMLDivElement | null>(null);
  const controlBarRef = useRef<HTMLElement | null>(null);
  const frameManagerRef = useRef<HTMLDivElement | null>(null);
  const [pinnedControlBarHeight, setPinnedControlBarHeight] = useState(0);
  const [dockedPitchControls, setDockedPitchControls] = useState<{
    isDocked: boolean;
    left: number;
    width: number;
    top: number;
  }>({ isDocked: false, left: 0, width: 0, top: 0 });
  const [hasLoadedUserSettings, setHasLoadedUserSettings] = useState(false);

  const [selectedTool, setSelectedTool] = useState<ToolType>("team1");
  const [mobileToolGroup, setMobileToolGroup] =
    useState<MobileToolGroup>("objects");
  const [selectedPitchBackground, setSelectedPitchBackground] =
    useState<PitchBackgroundType>(
      normalizedInitialCreatorState.selectedPitchBackground,
    );
  const initialActiveFrame =
    normalizedInitialFrames.frames.find(
      (frame) => frame.id === normalizedInitialFrames.activeFrameId,
    ) ?? normalizedInitialFrames.frames[0];
  const [frames, setFrames] = useState<ActivityFrame[]>(
    normalizedInitialFrames.frames,
  );
  const [activeFrameId, setActiveFrameId] = useState(
    normalizedInitialFrames.activeFrameId,
  );
  const [objects, setObjects] = useState<PitchObject[]>(
    deepCopyObjects(initialActiveFrame.objects),
  );
  const [lines, setLines] = useState<PitchLine[]>(
    deepCopyLines(initialActiveFrame.lines),
  );
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState(0);
  const [showActivityTabs, setShowActivityTabs] = useState(
    Boolean(initialActivity) && normalizedInitialFrames.frames.length > 1,
  );
  const [showFrameManager, setShowFrameManager] = useState(false);
  const [frameManagerPosition, setFrameManagerPosition] = useState({
    left: 24,
    top: 24,
  });
  const [frameManagerDragState, setFrameManagerDragState] =
    useState<PopOutDragState | null>(null);
  const [showAnimationDurations, setShowAnimationDurations] = useState(false);
  const [defaultFrameDurationMs, setDefaultFrameDurationMs] = useState(
    normalizedInitialCreatorState.settings.defaultFrameDurationMs,
  );
  const [isDashed, setIsDashed] = useState(false);
  const [isArrow, setIsArrow] = useState(false);
  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null);
  const [activeLinePoints, setActiveLinePoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [message, setMessage] = useState("");
  const [showToolbarSettings, setShowToolbarSettings] = useState(false);
  const [isToolbarOnLeft, setIsToolbarOnLeft] = useState(false);
  const [isControlBarPinned, setIsControlBarPinned] = useState(false);
  const [isPitchPoppedOut, setIsPitchPoppedOut] = useState(false);
  const [popOutPosition, setPopOutPosition] = useState({ left: 24, top: 24 });
  const [popOutDragState, setPopOutDragState] =
    useState<PopOutDragState | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [isSavePanelOpen, setIsSavePanelOpen] = useState(false);
  const [isMetadataFormDirty, setIsMetadataFormDirty] = useState(false);
  const [showMetadataCloseWarning, setShowMetadataCloseWarning] =
    useState(false);
  const [showUnsavedChangesPrompt, setShowUnsavedChangesPrompt] =
    useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<
    string | null
  >(null);

  const savedCreatorStateSnapshotRef = useRef<string | null>(null);
  const allowNavigationRef = useRef(false);

  const [team1Color, setTeam1Color] = useState(
    normalizedInitialCreatorState.settings.team1Color,
  );
  const [team2Color, setTeam2Color] = useState(
    normalizedInitialCreatorState.settings.team2Color,
  );
  const [playerTextColor, setPlayerTextColor] = useState(
    normalizedInitialCreatorState.settings.playerTextColor,
  );
  const [team1Shape, setTeam1Shape] = useState<PlayerShape>(
    normalizedInitialCreatorState.settings.team1Shape,
  );
  const [team2Shape, setTeam2Shape] = useState<PlayerShape>(
    normalizedInitialCreatorState.settings.team2Shape,
  );
  const [coneColor, setConeColor] = useState(
    normalizedInitialCreatorState.settings.coneColor,
  );
  const [lineColor, setLineColor] = useState(
    normalizedInitialCreatorState.settings.lineColor,
  );
  const [lineWidth, setLineWidth] = useState(
    normalizedInitialCreatorState.settings.lineDefaultWidth,
  );

  const [playerDefaultSize, setPlayerDefaultSize] = useState(
    normalizedInitialCreatorState.settings.playerDefaultSize,
  );
  const [coneDefaultSize, setConeDefaultSize] = useState(
    normalizedInitialCreatorState.settings.coneDefaultSize,
  );
  const [mannequinDefaultSize, setMannequinDefaultSize] = useState(
    normalizedInitialCreatorState.settings.mannequinDefaultSize,
  );
  const [ballDefaultSize, setBallDefaultSize] = useState(
    normalizedInitialCreatorState.settings.ballDefaultSize,
  );
  const [playerDisplayMode, setPlayerDisplayMode] = useState<PlayerDisplayMode>(
    normalizedInitialCreatorState.settings.playerDisplayMode,
  );

  const [isZoomLocked, setIsZoomLocked] = useState(true);
  const [zoom, setZoom] = useState(
    clamp(normalizedInitialCreatorState.pitchView.zoom, 1, 3),
  );
  const [pan, setPan] = useState({
    x: normalizedInitialCreatorState.pitchView.panX,
    y: normalizedInitialCreatorState.pitchView.panY,
  });
  const [pitchRotationDegrees] = useState(
    normalizedInitialCreatorState.pitchView.rotationDegrees,
  );
  const [pitchAssetVersion] = useState(
    normalizedInitialCreatorState.pitchView.pitchAssetVersion,
  );
  const [pitchCoordinateSystem] = useState(
    normalizedInitialCreatorState.pitchView.coordinateSystem,
  );
  const [sourcePlatform] = useState(
    normalizedInitialCreatorState.pitchView.sourcePlatform,
  );
  const [clientActivityId] = useState(
    normalizedInitialCreatorState.pitchView.clientActivityId,
  );
  const [panState, setPanState] = useState<PanState | null>(null);
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  useEffect(() => {
    if (!frameManagerDragState) {
      return;
    }

    const activeDragState = frameManagerDragState;

    function handleFrameManagerPointerMove(event: globalThis.PointerEvent) {
      const frameManager = frameManagerRef.current;

      if (!frameManager) {
        return;
      }

      const rect = frameManager.getBoundingClientRect();
      const maximumLeft = Math.max(
        0,
        window.innerWidth - Math.min(rect.width, window.innerWidth),
      );
      const maximumTop = Math.max(
        0,
        window.innerHeight - Math.min(rect.height, window.innerHeight),
      );

      setFrameManagerPosition({
        left: clamp(
          activeDragState.startLeft +
            (event.clientX - activeDragState.startClientX),
          0,
          maximumLeft,
        ),
        top: clamp(
          activeDragState.startTop +
            (event.clientY - activeDragState.startClientY),
          0,
          maximumTop,
        ),
      });
    }

    function handleFrameManagerPointerUp() {
      setFrameManagerDragState(null);
    }

    window.addEventListener("pointermove", handleFrameManagerPointerMove);
    window.addEventListener("pointerup", handleFrameManagerPointerUp);
    window.addEventListener("pointercancel", handleFrameManagerPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleFrameManagerPointerMove);
      window.removeEventListener("pointerup", handleFrameManagerPointerUp);
      window.removeEventListener("pointercancel", handleFrameManagerPointerUp);
    };
  }, [frameManagerDragState]);

  useEffect(() => {
    if (!showFrameManager) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const frameManager = frameManagerRef.current;

      if (!frameManager) {
        return;
      }

      const rect = frameManager.getBoundingClientRect();
      setFrameManagerPosition({
        left: Math.max(12, (window.innerWidth - rect.width) / 2),
        top: Math.max(12, (window.innerHeight - rect.height) / 2),
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [showFrameManager]);

  useEffect(() => {
    if (!popOutDragState) {
      return;
    }

    const activeDragState = popOutDragState;

    function handlePopOutPointerMove(event: globalThis.PointerEvent) {
      const pitchSection = pitchSectionRef.current;

      if (!pitchSection) {
        return;
      }

      const rect = pitchSection.getBoundingClientRect();
      const maximumLeft = Math.max(
        0,
        window.innerWidth - Math.min(rect.width, window.innerWidth),
      );
      const maximumTop = Math.max(0, window.innerHeight - 56);

      setPopOutPosition({
        left: clamp(
          activeDragState.startLeft +
            (event.clientX - activeDragState.startClientX),
          0,
          maximumLeft,
        ),
        top: clamp(
          activeDragState.startTop +
            (event.clientY - activeDragState.startClientY),
          0,
          maximumTop,
        ),
      });
    }

    function handlePopOutPointerUp() {
      setPopOutDragState(null);
    }

    window.addEventListener("pointermove", handlePopOutPointerMove);
    window.addEventListener("pointerup", handlePopOutPointerUp);
    window.addEventListener("pointercancel", handlePopOutPointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePopOutPointerMove);
      window.removeEventListener("pointerup", handlePopOutPointerUp);
      window.removeEventListener("pointercancel", handlePopOutPointerUp);
    };
  }, [popOutDragState]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPan((currentPan) => clampPanToZoom(currentPan, zoom));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [zoom, isPitchPoppedOut]);

  useEffect(() => {
    if (!isPitchPoppedOut) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPitchPoppedOut]);

  useEffect(() => {
    const controlBar = controlBarRef.current;

    if (!controlBar || !isControlBarPinned) {
      setPinnedControlBarHeight(0);
      return;
    }

    const measuredControlBar = controlBar;

    function updatePinnedControlBarHeight() {
      setPinnedControlBarHeight(
        measuredControlBar.getBoundingClientRect().height,
      );
    }

    updatePinnedControlBarHeight();

    const resizeObserver = new ResizeObserver(updatePinnedControlBarHeight);
    resizeObserver.observe(measuredControlBar);
    window.addEventListener("resize", updatePinnedControlBarHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePinnedControlBarHeight);
    };
  }, [isControlBarPinned, showActivityTabs]);

  useEffect(() => {
    if (!isControlBarPinned || isPitchPoppedOut) {
      setDockedPitchControls({ isDocked: false, left: 0, width: 0, top: 0 });
      return;
    }

    function updateDockedPitchControls() {
      const boundary = pitchControlsBoundaryRef.current;

      if (!boundary) {
        return;
      }

      const rect = boundary.getBoundingClientRect();
      const dockTop = 72 + pinnedControlBarHeight + 12;
      const isDocked = rect.top < dockTop && rect.bottom > dockTop + 120;

      setDockedPitchControls({
        isDocked,
        left: rect.left,
        width: rect.width,
        top: dockTop,
      });
    }

    updateDockedPitchControls();
    window.addEventListener("scroll", updateDockedPitchControls, { passive: true });
    window.addEventListener("resize", updateDockedPitchControls);

    return () => {
      window.removeEventListener("scroll", updateDockedPitchControls);
      window.removeEventListener("resize", updateDockedPitchControls);
    };
  }, [isControlBarPinned, isPitchPoppedOut, pinnedControlBarHeight]);

  useEffect(() => {
    setFrames((currentFrames) =>
      currentFrames.map((frame) =>
        frame.id === activeFrameId
          ? {
              ...frame,
              objects: deepCopyObjects(objects),
              lines: deepCopyLines(lines),
            }
          : frame,
      ),
    );
  }, [activeFrameId, objects, lines]);

  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(USER_CREATOR_SETTINGS_KEY);

      if (savedValue) {
        const savedSettings = JSON.parse(
          savedValue,
        ) as Partial<PersistedCreatorUserSettings>;

        if (typeof savedSettings.toolbarOnLeft === "boolean") {
          setIsToolbarOnLeft(savedSettings.toolbarOnLeft);
        } else {
          const isDesktopDevice =
            window.matchMedia("(min-width: 1024px)").matches &&
            window.matchMedia("(hover: hover) and (pointer: fine)").matches;

          setIsToolbarOnLeft(isDesktopDevice);
        }

        if (typeof savedSettings.showAnimationDurations === "boolean") {
          setShowAnimationDurations(savedSettings.showAnimationDurations);
        }

        if (
          typeof savedSettings.defaultFrameDurationMs === "number" &&
          Number.isFinite(savedSettings.defaultFrameDurationMs)
        ) {
          setDefaultFrameDurationMs(
            clamp(savedSettings.defaultFrameDurationMs, 250, 10000),
          );
        }

        if (!initialActivity) {
          if (isPitchBackground(savedSettings.selectedPitchBackground)) {
            setSelectedPitchBackground(savedSettings.selectedPitchBackground);
          }

          if (isPlayerDisplayMode(savedSettings.playerDisplayMode)) {
            setPlayerDisplayMode(savedSettings.playerDisplayMode);
          }

          if (typeof savedSettings.team1Color === "string") {
            setTeam1Color(savedSettings.team1Color);
          }

          if (typeof savedSettings.team2Color === "string") {
            setTeam2Color(savedSettings.team2Color);
          }

          if (typeof savedSettings.playerTextColor === "string") {
            setPlayerTextColor(savedSettings.playerTextColor);
          }

          if (isPlayerShape(savedSettings.team1Shape)) {
            setTeam1Shape(savedSettings.team1Shape);
          }

          if (isPlayerShape(savedSettings.team2Shape)) {
            setTeam2Shape(savedSettings.team2Shape);
          }

          if (typeof savedSettings.coneColor === "string") {
            setConeColor(savedSettings.coneColor);
          }

          if (typeof savedSettings.lineColor === "string") {
            setLineColor(savedSettings.lineColor);
          }

          if (
            typeof savedSettings.lineWidth === "number" &&
            Number.isFinite(savedSettings.lineWidth)
          ) {
            setLineWidth(clamp(savedSettings.lineWidth, 1, 12));
          }

          if (
            typeof savedSettings.playerDefaultSize === "number" &&
            Number.isFinite(savedSettings.playerDefaultSize)
          ) {
            setPlayerDefaultSize(
              clamp(savedSettings.playerDefaultSize, 24, 72),
            );
          }

          if (
            typeof savedSettings.coneDefaultSize === "number" &&
            Number.isFinite(savedSettings.coneDefaultSize)
          ) {
            setConeDefaultSize(clamp(savedSettings.coneDefaultSize, 14, 52));
          }

          if (
            typeof savedSettings.mannequinDefaultSize === "number" &&
            Number.isFinite(savedSettings.mannequinDefaultSize)
          ) {
            setMannequinDefaultSize(
              clamp(savedSettings.mannequinDefaultSize, 12, 110),
            );
          }

          if (
            typeof savedSettings.ballDefaultSize === "number" &&
            Number.isFinite(savedSettings.ballDefaultSize)
          ) {
            setBallDefaultSize(clamp(savedSettings.ballDefaultSize, 14, 64));
          }
        }
      } else {
        const isDesktopDevice =
          window.matchMedia("(min-width: 1024px)").matches &&
          window.matchMedia("(hover: hover) and (pointer: fine)").matches;

        setIsToolbarOnLeft(isDesktopDevice);
      }
    } catch (error) {
      console.error("Unable to load saved Activity Creator settings.", error);
    } finally {
      setHasLoadedUserSettings(true);
    }
  }, [initialActivity]);

  useEffect(() => {
    if (!hasLoadedUserSettings) {
      return;
    }

    const settingsToSave: PersistedCreatorUserSettings = {
      toolbarOnLeft: isToolbarOnLeft,
      showAnimationDurations,
      defaultFrameDurationMs,
      selectedPitchBackground,
      playerDisplayMode,
      team1Color,
      team2Color,
      playerTextColor,
      team1Shape,
      team2Shape,
      coneColor,
      lineColor,
      lineWidth,
      playerDefaultSize,
      coneDefaultSize,
      mannequinDefaultSize,
      ballDefaultSize,
    };

    window.localStorage.setItem(
      USER_CREATOR_SETTINGS_KEY,
      JSON.stringify(settingsToSave),
    );
  }, [
    isToolbarOnLeft,
    showAnimationDurations,
    defaultFrameDurationMs,
    selectedPitchBackground,
    playerDisplayMode,
    team1Color,
    team2Color,
    playerTextColor,
    team1Shape,
    team2Shape,
    coneColor,
    lineColor,
    lineWidth,
    playerDefaultSize,
    coneDefaultSize,
    mannequinDefaultSize,
    ballDefaultSize,
    hasLoadedUserSettings,
  ]);

  useEffect(() => {
    if (!isPlayingAnimation || frames.length < 2) {
      return;
    }

    const currentFrame = frames[playbackFrameIndex] ?? frames[0];
    const timer = window.setTimeout(
      () => {
        const isLastFrame = playbackFrameIndex >= frames.length - 1;

        if (isLastFrame) {
          const lastFrame = frames[frames.length - 1];
          setActiveFrameId(lastFrame.id);
          setObjects(deepCopyObjects(lastFrame.objects));
          setLines(deepCopyLines(lastFrame.lines));
          setPlaybackFrameIndex(0);
          setIsPlayingAnimation(false);
          return;
        }

        setPlaybackFrameIndex((currentIndex) => currentIndex + 1);
      },
      Math.max(250, currentFrame.durationMs),
    );

    return () => window.clearTimeout(timer);
  }, [isPlayingAnimation, playbackFrameIndex, frames]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return Boolean(
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="textbox"]',
        ),
      );
    }

    function handleObjectSelectionKeyboard(event: KeyboardEvent) {
      if (isTypingTarget(event.target) || isSavePanelOpen) {
        return;
      }

      const isSelectAll =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a";

      if (isSelectAll) {
        event.preventDefault();
        setSelectedObjectIds(objects.map((object) => object.id));
        setSelectedObjectId(null);
        setMessage(
          objects.length === 1
            ? "1 item selected."
            : `${objects.length} items selected.`,
        );
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedObjectIds.length > 0
      ) {
        event.preventDefault();
        saveHistorySnapshot();

        const selectedIds = new Set(selectedObjectIds);

        setObjects((currentObjects) =>
          currentObjects.filter((object) => !selectedIds.has(object.id)),
        );
        setSelectedObjectIds([]);
        setSelectedObjectId(null);
        setDraggingObjectId(null);
        setMessage(
          selectedIds.size === 1
            ? "Item deleted."
            : `${selectedIds.size} items deleted.`,
        );
      }
    }

    window.addEventListener("keydown", handleObjectSelectionKeyboard);

    return () => {
      window.removeEventListener("keydown", handleObjectSelectionKeyboard);
    };
  }, [isSavePanelOpen, objects, selectedObjectIds]);

  function isObjectSelected(objectId: string) {
    return selectedObjectIds.includes(objectId);
  }

  function selectObject(objectId: string, addToSelection: boolean) {
    if (addToSelection) {
      setSelectedObjectIds((currentIds) =>
        currentIds.includes(objectId)
          ? currentIds.filter((id) => id !== objectId)
          : [...currentIds, objectId],
      );
      setSelectedObjectId(null);
      return;
    }

    setSelectedObjectIds([objectId]);
    setSelectedObjectId(objectId);
  }

  const selectedObject =
    objects.find((object) => object.id === selectedObjectId) ?? null;

  const playerCount = useMemo(() => {
    return objects.filter(
      (object) => object.type === "team1" || object.type === "team2",
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
      schemaVersion: 3,
      sourcePlatform,
      clientActivityId,
      pitch: {
        background: selectedPitchBackground,
        zoom,
        offsetX: pan.x,
        offsetY: pan.y,
        rotationDegrees: pitchRotationDegrees,
        pitchAssetVersion,
        coordinateSystem: pitchCoordinateSystem,

        // Save the exact editor viewport dimensions used when these CSS-pixel
        // pan offsets were created. Animation export needs these values to
        // reproduce the same framing on its fixed 600 × 800 canvas.
        viewportWidth:
          pitchRef.current?.getBoundingClientRect().width ?? 1000,
        viewportHeight:
          pitchRef.current?.getBoundingClientRect().height ?? 1333.333333,
      } as {
        background: PitchBackgroundType;
        zoom: number;
        offsetX: number;
        offsetY: number;
        rotationDegrees: number;
        pitchAssetVersion: number;
        coordinateSystem: "legacyCanvas" | "canonicalPitchV1";
        viewportWidth: number;
        viewportHeight: number;
      },
      settings: {
        playerDisplayMode,
        team1DefaultColor: cssToColorObject(team1Color),
        team2DefaultColor: cssToColorObject(team2Color),
        team1DefaultShape: team1Shape,
        team2DefaultShape: team2Shape,
        playerTextDefaultColor: cssToColorObject(playerTextColor),
        coneDefaultColor: cssToColorObject(coneColor),
        playerDefaultSize,
        coneDefaultSize,
        logoSize: 74,
        lineDefaultWidth: lineWidth,
        defaultFrameDurationMs,
      },
      activeFrameId,
      frames: frames.map((frame) => {
        const frameObjects =
          frame.id === activeFrameId ? objects : frame.objects;
        const frameLines = frame.id === activeFrameId ? lines : frame.lines;

        return {
          id: frame.id,
          name: frame.name,
          durationMs: frame.durationMs,
          objects: frameObjects.map((object) => ({
            id: object.id,
            type: object.type,
            x: clamp(object.x, 0, 100) / 100,
            y: clamp(object.y, 0, 100) / 100,
            label: object.label,
            playerName: object.playerName,
            rotation: object.rotation,
            fillColor: object.fillColor,
            textColor: object.textColor,
            number: object.label,
            name: object.playerName,
            size: object.size,
            nameFontSize: object.nameFontSize,
            playerShape: object.playerShape,
            playerDisplayModeOverride: object.playerDisplayModeOverride,
            textContent: object.textContent,
            fontSize: object.fontSize,
            rotationDegrees: object.rotation,
          })),
          lines: frameLines.map((line) => ({
            id: line.id,
            points: line.points.map((point) => ({
              x: clamp(point.x, 0, 100) / 100,
              y: clamp(point.y, 0, 100) / 100,
            })),
            dashed: line.dashed,
            arrow: line.arrow,
            isDashed: line.dashed,
            isArrow: line.arrow,
            color: line.color,
            lineWidth: line.lineWidth,
            lineStyle: line.lineStyle,
          })),
        };
      }),
      // Keep the active tab mirrored at the top level for older clients.
      objects: objects.map((object) => ({
        id: object.id,
        type: object.type,
        x: clamp(object.x, 0, 100) / 100,
        y: clamp(object.y, 0, 100) / 100,
        label: object.label,
        playerName: object.playerName,
        rotation: object.rotation,
        fillColor: object.fillColor,
        textColor: object.textColor,
        number: object.label,
        name: object.playerName,
        size: object.size,
        nameFontSize: object.nameFontSize,
        playerShape: object.playerShape,
        playerDisplayModeOverride: object.playerDisplayModeOverride,
        textContent: object.textContent,
        fontSize: object.fontSize,
        rotationDegrees: object.rotation,
      })),
      lines: lines.map((line) => ({
        id: line.id,
        points: line.points.map((point) => ({
          x: clamp(point.x, 0, 100) / 100,
          y: clamp(point.y, 0, 100) / 100,
        })),
        dashed: line.dashed,
        arrow: line.arrow,
        isDashed: line.dashed,
        isArrow: line.arrow,
        color: line.color,
        lineWidth: line.lineWidth,
        lineStyle: line.lineStyle,
      })),
    }),
    [
      selectedPitchBackground,
      frames,
      activeFrameId,
      objects,
      lines,
      team1Color,
      team2Color,
      playerTextColor,
      team1Shape,
      team2Shape,
      coneColor,
      lineWidth,
      playerDefaultSize,
      coneDefaultSize,
      playerDisplayMode,
      defaultFrameDurationMs,
      zoom,
      pan.x,
      pan.y,
      pitchRotationDegrees,
      pitchAssetVersion,
      pitchCoordinateSystem,
      sourcePlatform,
      clientActivityId,
    ],
  );

  const serializedCreatorState = useMemo(
    () => JSON.stringify(creatorState),
    [creatorState],
  );

  const hasUnsavedChanges =
    savedCreatorStateSnapshotRef.current !== null &&
    serializedCreatorState !== savedCreatorStateSnapshotRef.current;

  useEffect(() => {
    if (
      !hasLoadedUserSettings ||
      savedCreatorStateSnapshotRef.current !== null
    ) {
      return;
    }

    savedCreatorStateSnapshotRef.current = serializedCreatorState;
  }, [hasLoadedUserSettings, serializedCreatorState]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges || allowNavigationRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!hasUnsavedChanges || allowNavigationRef.current) {
        return;
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a[href]");

      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      if (
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.dataset.skipUnsavedWarning === "true"
      ) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);

      if (
        destination.origin !== current.origin ||
        destination.href === current.href ||
        (destination.pathname === current.pathname &&
          destination.search === current.search &&
          destination.hash !== current.hash)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setPendingNavigationUrl(
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
      setShowUnsavedChangesPrompt(true);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  function continuePendingNavigation() {
    const destination = pendingNavigationUrl;

    setShowUnsavedChangesPrompt(false);
    setPendingNavigationUrl(null);

    if (!destination) {
      return;
    }

    allowNavigationRef.current = true;
    router.push(destination);
  }

  function leaveWithoutSaving() {
    continuePendingNavigation();
  }

  function saveBeforeLeaving() {
    setShowUnsavedChangesPrompt(false);
    setIsSavePanelOpen(true);
  }

  function handleActivitySaved() {
    savedCreatorStateSnapshotRef.current = serializedCreatorState;

    if (pendingNavigationUrl) {
      window.setTimeout(() => {
        continuePendingNavigation();
      }, 0);

      return false;
    }

    allowNavigationRef.current = true;
    return true;
  }

  function openFrameManager() {
    setFrameManagerDragState(null);
    setShowFrameManager(true);
  }

  function closeFrameManager() {
    setFrameManagerDragState(null);
    setShowFrameManager(false);
  }

  function startDraggingFrameManager(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("button, input, select, textarea, a")) {
      return;
    }

    event.preventDefault();

    setFrameManagerDragState({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: frameManagerPosition.left,
      startTop: frameManagerPosition.top,
    });
  }

  function switchFrame(frameId: string) {
    if (frameId === activeFrameId) {
      return;
    }

    const targetFrame = frames.find((frame) => frame.id === frameId);
    if (!targetFrame) {
      return;
    }

    setIsPlayingAnimation(false);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setActiveLinePoints([]);
    setUndoStack([]);
    setRedoStack([]);
    setActiveFrameId(frameId);
    setObjects(deepCopyObjects(targetFrame.objects));
    setLines(deepCopyLines(targetFrame.lines));
  }

  function addFrame() {
    const sourceFrame = frames[frames.length - 1] ?? {
      id: activeFrameId,
      name: "Tab 1",
      durationMs: defaultFrameDurationMs,
      objects,
      lines,
    };
    const sourceObjects =
      sourceFrame.id === activeFrameId ? objects : sourceFrame.objects;
    const sourceLines =
      sourceFrame.id === activeFrameId ? lines : sourceFrame.lines;
    const nextFrame: ActivityFrame = {
      id: makeId(),
      name: `Tab ${frames.length + 1}`,
      durationMs: defaultFrameDurationMs,
      objects: deepCopyObjects(sourceObjects),
      lines: deepCopyLines(sourceLines),
    };

    setFrames((currentFrames) => [...currentFrames, nextFrame]);
    setActiveFrameId(nextFrame.id);
    setObjects(deepCopyObjects(nextFrame.objects));
    setLines(deepCopyLines(nextFrame.lines));
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setUndoStack([]);
    setRedoStack([]);
    setMessage(`${nextFrame.name} created from the most recent tab.`);
  }

  function renameFrame(frameId: string) {
    const frame = frames.find((candidate) => candidate.id === frameId);
    if (!frame) return;
    const nextName = window.prompt("Tab name", frame.name)?.trim();
    if (!nextName) return;
    setFrames((currentFrames) =>
      currentFrames.map((candidate) =>
        candidate.id === frameId ? { ...candidate, name: nextName } : candidate,
      ),
    );
  }

  function duplicateFrame(frameId: string) {
    const frameIndex = frames.findIndex((frame) => frame.id === frameId);
    if (frameIndex < 0) return;

    const sourceFrame = frames[frameIndex];
    const sourceObjects =
      sourceFrame.id === activeFrameId ? objects : sourceFrame.objects;
    const sourceLines =
      sourceFrame.id === activeFrameId ? lines : sourceFrame.lines;
    const duplicate: ActivityFrame = {
      id: makeId(),
      name: `Tab ${frames.length + 1}`,
      durationMs: sourceFrame.durationMs,
      objects: deepCopyObjects(sourceObjects),
      lines: deepCopyLines(sourceLines),
    };

    setFrames((currentFrames) => {
      const nextFrames = [...currentFrames];
      nextFrames.splice(frameIndex + 1, 0, duplicate);
      return nextFrames;
    });
    setActiveFrameId(duplicate.id);
    setObjects(deepCopyObjects(duplicate.objects));
    setLines(deepCopyLines(duplicate.lines));
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setUndoStack([]);
    setRedoStack([]);
    setMessage(`${duplicate.name} duplicated from ${sourceFrame.name}.`);
  }

  function moveFrame(frameId: string, offset: -1 | 1) {
    setFrames((currentFrames) => {
      const currentIndex = currentFrames.findIndex(
        (frame) => frame.id === frameId,
      );
      const destinationIndex = currentIndex + offset;

      if (
        currentIndex < 0 ||
        destinationIndex < 0 ||
        destinationIndex >= currentFrames.length
      ) {
        return currentFrames;
      }

      const nextFrames = [...currentFrames];
      const [movedFrame] = nextFrames.splice(currentIndex, 1);
      nextFrames.splice(destinationIndex, 0, movedFrame);
      return nextFrames;
    });
  }

  function deleteFrame(frameId: string) {
    if (frames.length <= 1) {
      setMessage("An activity must have at least one tab.");
      return;
    }
    if (!window.confirm("Delete this tab?")) return;

    const frameIndex = frames.findIndex((frame) => frame.id === frameId);
    const nextFrames = frames.filter((frame) => frame.id !== frameId);
    setFrames(nextFrames);

    if (frameId === activeFrameId) {
      const nextFrame =
        nextFrames[Math.max(0, frameIndex - 1)] ?? nextFrames[0];
      setActiveFrameId(nextFrame.id);
      setObjects(deepCopyObjects(nextFrame.objects));
      setLines(deepCopyLines(nextFrame.lines));
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
      setUndoStack([]);
      setRedoStack([]);
    }
  }

  function updateFrameDuration(frameId: string, durationMs: number) {
    setFrames((currentFrames) =>
      currentFrames.map((frame) =>
        frame.id === frameId
          ? { ...frame, durationMs: clamp(durationMs, 250, 10000) }
          : frame,
      ),
    );
  }

  function toggleAnimationPlayback() {
    if (frames.length < 2) {
      setMessage("Create at least two tabs before playing the animation.");
      return;
    }
    setPlaybackFrameIndex(0);
    setSelectedObjectId(null);
    setIsPlayingAnimation((current) => !current);
  }

  function preservePitchViewportAcrossLayoutChange(
    previousPitchRect: DOMRect | undefined,
  ) {
    if (
      !previousPitchRect ||
      previousPitchRect.width <= 0 ||
      previousPitchRect.height <= 0
    ) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const nextPitchRect = pitchRef.current?.getBoundingClientRect();

        if (
          !nextPitchRect ||
          nextPitchRect.width <= 0 ||
          nextPitchRect.height <= 0
        ) {
          return;
        }

        setPan((currentPan) =>
          clampPanToZoom(
            {
              x: currentPan.x * (nextPitchRect.width / previousPitchRect.width),
              y:
                currentPan.y *
                (nextPitchRect.height / previousPitchRect.height),
            },
            zoom,
          ),
        );
      });
    });
  }

  function openPitchPopOut() {
    const previousPitchRect = pitchRef.current?.getBoundingClientRect();

    setPopOutPosition({ left: 24, top: 24 });
    setPopOutDragState(null);
    setIsPitchPoppedOut(true);

    preservePitchViewportAcrossLayoutChange(previousPitchRect);
  }

  function startDraggingPitchPopOut(event: PointerEvent<HTMLDivElement>) {
    if (!isPitchPoppedOut || event.button !== 0) {
      return;
    }

    event.preventDefault();

    setPopOutDragState({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: popOutPosition.left,
      startTop: popOutPosition.top,
    });
  }

  function returnPitchToPage() {
    const previousPitchRect = pitchRef.current?.getBoundingClientRect();
    const pitchSection = pitchSectionRef.current;

    if (pitchSection) {
      // A resized pop-out can retain an internal scroll offset. Clear it before
      // restoring the normal page layout so the pitch does not return shifted.
      pitchSection.scrollLeft = 0;
      pitchSection.scrollTop = 0;
      pitchSection.style.width = "";
      pitchSection.style.height = "";
    }

    setPopOutDragState(null);
    setPopOutPosition({ left: 24, top: 24 });
    setIsPitchPoppedOut(false);

    preservePitchViewportAcrossLayoutChange(previousPitchRect);

    // Reset once more after React applies the non-pop-out layout.
    window.requestAnimationFrame(() => {
      const restoredPitchSection = pitchSectionRef.current;

      if (restoredPitchSection) {
        restoredPitchSection.scrollLeft = 0;
        restoredPitchSection.scrollTop = 0;
      }
    });
  }

  function openSavePanel() {
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setActiveLinePoints([]);
    setPendingNavigationUrl(null);
    setIsMetadataFormDirty(false);
    setShowMetadataCloseWarning(false);
    setIsSavePanelOpen(true);
  }

  function closeSavePanel() {
    if (isMetadataFormDirty) {
      setShowMetadataCloseWarning(true);
      return;
    }

    setIsSavePanelOpen(false);
    setPendingNavigationUrl(null);
    setShowMetadataCloseWarning(false);
  }

  function closeSavePanelWithoutUpdating() {
    setIsMetadataFormDirty(false);
    setShowMetadataCloseWarning(false);
    setIsSavePanelOpen(false);
    setPendingNavigationUrl(null);
  }

  async function waitForNextPaint() {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }

  async function waitForImagesToLoad(element: HTMLElement) {
    const images = Array.from(element.querySelectorAll("img"));

    await Promise.all(
      images.map(async (image) => {
        if (!image.complete || image.naturalWidth === 0) {
          await new Promise<void>((resolve) => {
            image.onload = () => resolve();
            image.onerror = () => resolve();
          });
        }

        if (typeof image.decode === "function") {
          try {
            await image.decode();
          } catch {
            // If decode fails, continue and let html-to-image attempt capture.
          }
        }
      }),
    );
  }

  async function assetPathToDataUrl(assetPath: string) {
    const response = await fetch(assetPath, { cache: "force-cache" });

    if (!response.ok) {
      throw new Error(`Unable to load pitch background: ${assetPath}`);
    }

    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Unable to convert pitch background to data URL."));
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function waitForImageElement(image: HTMLImageElement) {
    if (!image.complete || image.naturalWidth === 0) {
      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    }

    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch {
        // Continue even if decode fails. html-to-image may still capture it.
      }
    }
  }

  async function loadCanvasImage(source: string) {
    const image = new Image();
    const imageSource = source.startsWith("data:")
      ? source
      : await assetPathToDataUrl(source);

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error(`Unable to load image: ${source}`));
      image.src = imageSource;
    });

    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch {
        // Continue if decode fails. The image may still be drawable.
      }
    }

    return image;
  }

  function getPreviewObjectSize(object: PitchObject, canvasWidth: number) {
    return (
      (object.size ?? getDefaultObjectSize(object.type)) * (canvasWidth / 1000)
    );
  }

  function drawPreviewLine(
    context: CanvasRenderingContext2D,
    line: PitchLine,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    if (line.points.length < 2) {
      return;
    }

    context.save();
    const previewLineWidth =
      Math.max(1, line.lineWidth || lineWidth || 4) * (canvasWidth / 1000);

    context.strokeStyle = line.color || lineColor;
    context.lineWidth = previewLineWidth;
    context.lineCap = "round";
    context.lineJoin = "round";

    if (line.lineStyle !== "dribble" && line.dashed) {
      context.setLineDash([previewLineWidth * 2.5, previewLineWidth * 2]);
    }

    context.beginPath();

    const previewPoints =
      line.lineStyle === "dribble"
        ? getDribblePolylinePoints(line.points)
        : line.points;

    previewPoints.forEach((point, index) => {
      const x = (point.x / 100) * canvasWidth;
      const y = (point.y / 100) * canvasHeight;

      if (index === 0) {
        context.moveTo(x, y);
        return;
      }

      context.lineTo(x, y);
    });

    context.stroke();

    if (
      (line.arrow || line.lineStyle === "dribble") &&
      line.points.length >= 2
    ) {
      const arrowPoints =
        line.lineStyle === "dribble"
          ? getDribblePolylinePoints(line.points)
          : line.points;
      const endPoint = arrowPoints[arrowPoints.length - 1];
      const directionStart =
        line.lineStyle === "dribble"
          ? line.points[0]
          : (arrowPoints[arrowPoints.length - 2] ??
            line.points[line.points.length - 2]);
      const underlyingEnd = line.points[line.points.length - 1];
      const endX = (endPoint.x / 100) * canvasWidth;
      const endY = (endPoint.y / 100) * canvasHeight;
      const startX = (directionStart.x / 100) * canvasWidth;
      const startY = (directionStart.y / 100) * canvasHeight;
      const underlyingEndX = (underlyingEnd.x / 100) * canvasWidth;
      const underlyingEndY = (underlyingEnd.y / 100) * canvasHeight;
      const angle = Math.atan2(
        underlyingEndY - startY,
        underlyingEndX - startX,
      );
      const arrowExtension =
        line.lineStyle === "dribble" ? canvasWidth * 0.036 : 0;
      const tipX = endX + arrowExtension * Math.cos(angle);
      const tipY = endY + arrowExtension * Math.sin(angle);
      const arrowLength = canvasWidth * 0.03;
      const arrowAngle = Math.PI / 6;

      context.beginPath();
      if (line.lineStyle === "dribble") {
        context.moveTo(endX, endY);
        context.lineTo(tipX, tipY);
      }
      context.moveTo(
        tipX - arrowLength * Math.cos(angle - arrowAngle),
        tipY - arrowLength * Math.sin(angle - arrowAngle),
      );
      context.lineTo(tipX, tipY);
      context.lineTo(
        tipX - arrowLength * Math.cos(angle + arrowAngle),
        tipY - arrowLength * Math.sin(angle + arrowAngle),
      );
      context.stroke();
    }

    context.restore();
  }

  function drawPreviewPlayerObject(
    context: CanvasRenderingContext2D,
    object: PitchObject,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    const size = getPreviewObjectSize(object, canvasWidth);
    const x = (object.x / 100) * canvasWidth;
    const y = (object.y / 100) * canvasHeight;
    const fillColor =
      object.fillColor ?? (object.type === "team1" ? team1Color : team2Color);

    context.save();
    context.beginPath();

    const shape =
      object.playerShape ?? (object.type === "team1" ? team1Shape : team2Shape);

    if (shape === "triangle") {
      context.moveTo(x, y - size / 2);
      context.lineTo(x + size / 2, y + size / 2);
      context.lineTo(x - size / 2, y + size / 2);
      context.closePath();
    } else if (shape === "square") {
      context.rect(x - size / 2, y - size / 2, size, size);
    } else if (shape === "diamond") {
      context.moveTo(x, y - size / 2);
      context.lineTo(x + size / 2, y);
      context.lineTo(x, y + size / 2);
      context.lineTo(x - size / 2, y);
      context.closePath();
    } else {
      context.arc(x, y, size / 2, 0, Math.PI * 2);
    }

    context.fillStyle = fillColor;
    context.fill();
    context.lineWidth = Math.max(2, canvasWidth * 0.0025);
    context.strokeStyle = "#000000";
    context.stroke();

    const effectiveDisplayMode =
      object.playerDisplayModeOverride ?? playerDisplayMode;
    const shouldShowNumber =
      effectiveDisplayMode === "number" || effectiveDisplayMode === "both";
    const shouldShowName =
      effectiveDisplayMode === "name" || effectiveDisplayMode === "both";

    if (shouldShowNumber && object.label) {
      context.fillStyle = object.textColor ?? playerTextColor;
      context.font = `700 ${Math.max(10, size * 0.42)}px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(object.label, x, y + size * 0.02);
    }

    const displayName = object.playerName?.trim();

    if (shouldShowName && displayName) {
      const fontSize = Math.max(9, size * 0.3);
      context.font = `700 ${fontSize}px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      const textMetrics = context.measureText(displayName);
      const labelWidth = textMetrics.width + 8;
      const labelHeight = fontSize + 6;
      const labelX = x - labelWidth / 2;
      const labelY = y + size / 2 + 5;

      context.fillStyle = "rgba(255, 255, 255, 0.88)";
      context.fillRect(labelX, labelY, labelWidth, labelHeight);
      context.fillStyle = "#0f172a";
      context.fillText(displayName, x, labelY + labelHeight / 2);
    }

    context.restore();
  }

  function drawPreviewConeObject(
    context: CanvasRenderingContext2D,
    object: PitchObject,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    const size = getPreviewObjectSize(object, canvasWidth);
    const x = (object.x / 100) * canvasWidth;
    const y = (object.y / 100) * canvasHeight;
    const fillColor = object.fillColor ?? coneColor;

    context.save();

    // Outer cone circle
    context.beginPath();
    context.arc(x, y, size / 2, 0, Math.PI * 2);
    context.fillStyle = fillColor;
    context.fill();

    context.strokeStyle = "#000000";
    context.lineWidth = Math.max(2, canvasWidth * 0.0025);
    context.stroke();

    // Inner white circle, matching ConeIcon
    context.beginPath();
    context.arc(x, y, size * 0.175, 0, Math.PI * 2);
    context.fillStyle = "#ffffff";
    context.fill();

    context.restore();
  }

  function drawPreviewTextBoxObject(
    context: CanvasRenderingContext2D,
    object: PitchObject,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    const width = getPreviewObjectSize(object, canvasWidth);
    const x = (object.x / 100) * canvasWidth;
    const y = (object.y / 100) * canvasHeight;
    const fontSize = Math.max(10, object.fontSize ?? 20) * (canvasWidth / 1000);
    const lineHeight = fontSize * 1.22;
    const rawText = object.textContent?.trim() || "Text";
    const maxTextWidth = Math.max(width - 18, 40);

    context.save();
    context.font = `700 ${fontSize}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    const wrappedLines = rawText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .flatMap((paragraph) => {
        const words = paragraph.split(/\s+/).filter(Boolean);

        if (words.length === 0) {
          return [""];
        }

        const linesForParagraph: string[] = [];
        let currentLine = "";

        words.forEach((word) => {
          const nextLine = currentLine ? `${currentLine} ${word}` : word;

          if (
            context.measureText(nextLine).width <= maxTextWidth ||
            !currentLine
          ) {
            currentLine = nextLine;
            return;
          }

          linesForParagraph.push(currentLine);
          currentLine = word;
        });

        if (currentLine) {
          linesForParagraph.push(currentLine);
        }

        return linesForParagraph;
      });

    const widestLine = wrappedLines.reduce(
      (currentMax, line) =>
        Math.max(currentMax, context.measureText(line).width),
      0,
    );
    const boxWidth = Math.max(width, widestLine + 18);
    const boxHeight = Math.max(
      lineHeight * wrappedLines.length + 16,
      fontSize + 16,
    );

    context.fillStyle = "rgba(255, 255, 255, 0.72)";
    context.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
    context.strokeStyle = "rgba(15, 23, 42, 0.35)";
    context.lineWidth = Math.max(1, canvasWidth * 0.001);
    context.strokeRect(
      x - boxWidth / 2,
      y - boxHeight / 2,
      boxWidth,
      boxHeight,
    );

    context.fillStyle = object.textColor ?? "#111827";

    const firstLineY = y - ((wrappedLines.length - 1) * lineHeight) / 2;

    wrappedLines.forEach((line, index) => {
      context.fillText(line, x, firstLineY + index * lineHeight);
    });

    context.restore();
  }

  async function drawPreviewAssetObject(
    context: CanvasRenderingContext2D,
    object: PitchObject,
    canvasWidth: number,
    canvasHeight: number,
    imageCache: Map<string, HTMLImageElement>,
  ) {
    const assetPath = getAssetForObject(object.type);

    if (!assetPath) {
      return;
    }

    let image = imageCache.get(assetPath);

    if (!image) {
      image = await loadCanvasImage(assetPath);
      imageCache.set(assetPath, image);
    }

    const width = getPreviewObjectSize(object, canvasWidth);
    const height =
      object.type === "mannequin"
        ? width * 1.6
        : object.type === "miniGoal"
          ? width * 0.625
          : object.type === "fullGoal"
            ? width * 0.5
            : width;

    const x = (object.x / 100) * canvasWidth;
    const y = (object.y / 100) * canvasHeight;

    context.save();
    context.translate(x, y);
    context.rotate((object.rotation * Math.PI) / 180);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    context.restore();
  }

  function drawCanonicalPitchBackground(
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    background: PitchBackgroundType,
  ) {
    const isTilted =
      background === "pitchGreenTilted" ||
      background === "pitchWhiteTilted";
    const isGreen =
      background === "pitchGreen" ||
      background === "pitchGreenTilted" ||
      background === "greenBlank";
    const isBlank = background === "greenBlank" || background === "whiteBlank";

    const gradient = context.createLinearGradient(0, 0, 0, canvasHeight);

    if (isGreen) {
      gradient.addColorStop(0, "#168807");
      gradient.addColorStop(0.5, "#27c20d");
      gradient.addColorStop(1, "#147506");
    } else {
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.5, "#f4f6f8");
      gradient.addColorStop(1, "#ffffff");
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    if (isGreen) {
      const stripeCount = 14;
      const stripeHeight = canvasHeight / stripeCount;

      for (let index = 0; index < stripeCount; index += 1) {
        context.fillStyle =
          index % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
        context.fillRect(0, index * stripeHeight, canvasWidth, stripeHeight);
      }
    }

    if (isBlank) {
      return;
    }

    const x = (value: number) => (value / 100) * canvasWidth;
    const y = (value: number) => (value / 133.333333) * canvasHeight;

    const lineColor = isGreen ? "#ffffff" : "#111827";

    context.save();
    context.strokeStyle = lineColor;
    context.fillStyle = lineColor;
    context.lineWidth = Math.max(
      3,
      Math.min(canvasWidth, canvasHeight) * 0.0045,
    );
    context.lineCap = "round";
    context.lineJoin = "round";

    if (isTilted) {
      function strokePath(points: Array<[number, number]>, close = false) {
        context.beginPath();
        points.forEach(([pointX, pointY], index) => {
          if (index === 0) {
            context.moveTo(x(pointX), y(pointY));
          } else {
            context.lineTo(x(pointX), y(pointY));
          }
        });
        if (close) context.closePath();
        context.stroke();
      }

      strokePath(
        [
          [18, 7],
          [82, 7],
          [94, 127.333333],
          [6, 127.333333],
        ],
        true,
      );
      strokePath([[12, 66.666667], [88, 66.666667]]);

      context.beginPath();
      context.ellipse(x(50), y(66.666667), x(9.5), y(7.2), 0, 0, Math.PI * 2);
      context.stroke();

      strokePath([[28, 7], [72, 7], [73.5, 23.5], [26.5, 23.5]], true);
      strokePath([[39, 7], [61, 7], [61.5, 14.333333], [38.5, 14.333333]], true);
      strokePath([[24, 108], [76, 108], [78, 127.333333], [22, 127.333333]], true);
      strokePath([[36, 120], [64, 120], [64.5, 127.333333], [35.5, 127.333333]], true);

      context.beginPath();
      context.moveTo(x(43.5), y(23.5));
      context.bezierCurveTo(x(45.8), y(28.1), x(54.2), y(28.1), x(56.5), y(23.5));
      context.stroke();

      context.beginPath();
      context.moveTo(x(41.5), y(108));
      context.bezierCurveTo(x(44), y(101.5), x(56), y(101.5), x(58.5), y(108));
      context.stroke();

      context.beginPath();
      context.moveTo(x(20.8), y(7));
      context.bezierCurveTo(x(20.8), y(8.5), x(19.4), y(9.6), x(17.8), y(9.6));
      context.stroke();

      context.beginPath();
      context.moveTo(x(79.2), y(7));
      context.bezierCurveTo(x(79.2), y(8.5), x(80.6), y(9.6), x(82.2), y(9.6));
      context.stroke();

      context.beginPath();
      context.moveTo(x(8.8), y(127.333333));
      context.bezierCurveTo(
        x(8.8),
        y(125.8),
        x(7.7),
        y(124.5),
        x(6.28),
        y(124.5),
      );
      context.stroke();

      context.beginPath();
      context.moveTo(x(91.2), y(127.333333));
      context.bezierCurveTo(
        x(91.2),
        y(125.8),
        x(92.3),
        y(124.5),
        x(93.72),
        y(124.5),
      );
      context.stroke();

      const tiltedDotRadius = Math.max(3, Math.min(canvasWidth, canvasHeight) * 0.0048);
      for (const [dotX, dotY] of [[50, 66.666667], [50, 18.666667], [50, 114.666667]] as Array<[number, number]>) {
        context.beginPath();
        context.arc(x(dotX), y(dotY), tiltedDotRadius, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
      return;
    }

    context.strokeRect(x(8), y(6), x(84), y(121.333333));

    context.beginPath();
    context.moveTo(x(8), y(66.666667));
    context.lineTo(x(92), y(66.666667));
    context.stroke();

    context.beginPath();
    context.arc(x(50), y(66.666667), x(9.5), 0, Math.PI * 2);
    context.stroke();

    context.strokeRect(x(26), y(6), x(48), y(19.333333));
    context.strokeRect(x(38), y(6), x(24), y(7.333333));

    context.strokeRect(x(26), y(108), x(48), y(19.333333));
    context.strokeRect(x(38), y(120), x(24), y(7.333333));

    const penaltyArcRadius = x(8.5);
    const penaltyLineDistanceFromSpot = Math.abs(y(25.333333) - y(18.666667));
    const safeArcRatio = Math.min(
      1,
      Math.max(-1, penaltyLineDistanceFromSpot / Math.max(penaltyArcRadius, 1)),
    );
    const arcCutAngle = Math.asin(safeArcRatio);

    // Draw only the portion of each penalty arc that sits outside the penalty area.
    // The start/end angles are calculated from the exact intersection between
    // the circle and the penalty-area line. This keeps web and iOS aligned.
    context.beginPath();
    context.arc(
      x(50),
      y(18.666667),
      penaltyArcRadius,
      arcCutAngle,
      Math.PI - arcCutAngle,
    );
    context.stroke();

    context.beginPath();
    context.arc(
      x(50),
      y(114.666667),
      penaltyArcRadius,
      Math.PI + arcCutAngle,
      Math.PI * 2 - arcCutAngle,
    );
    context.stroke();

    const cornerRadius = x(2.8);

    context.beginPath();
    context.arc(x(8), y(6), cornerRadius, 0, Math.PI / 2);
    context.stroke();

    context.beginPath();
    context.arc(x(92), y(6), cornerRadius, Math.PI / 2, Math.PI);
    context.stroke();

    context.beginPath();
    context.arc(
      x(8),
      y(127.333333),
      cornerRadius,
      (3 * Math.PI) / 2,
      Math.PI * 2,
    );
    context.stroke();

    context.beginPath();
    context.arc(x(92), y(127.333333), cornerRadius, Math.PI, (3 * Math.PI) / 2);
    context.stroke();

    const dotRadius = Math.max(3, Math.min(canvasWidth, canvasHeight) * 0.0048);

    function drawDot(cx: number, cy: number) {
      context.beginPath();
      context.arc(x(cx), y(cy), dotRadius, 0, Math.PI * 2);
      context.fill();
    }

    drawDot(50, 66.666667);
    drawDot(50, 18.666667);
    drawDot(50, 114.666667);

    context.restore();
  }

  async function getCreatorPreviewDataUrl() {
    const renderCanvas = document.createElement("canvas");
    const context = renderCanvas.getContext("2d");

    if (!context) {
      return undefined;
    }

    const canvasWidth = 1200;
    const canvasHeight = 1600;

    renderCanvas.width = canvasWidth;
    renderCanvas.height = canvasHeight;

    const editorPitchRect = pitchRef.current?.getBoundingClientRect();
    const editorPitchWidth = editorPitchRect?.width || canvasWidth;
    const editorPitchHeight = editorPitchRect?.height || canvasHeight;

    // Pan is stored in on-screen CSS pixels. Scale it to the fixed export
    // canvas so the preview uses the same visible pitch framing as the editor.
    const exportPanX = pan.x * (canvasWidth / editorPitchWidth);
    const exportPanY = pan.y * (canvasHeight / editorPitchHeight);

    const firstFrame = frames[0];
    const previewLines =
      firstFrame?.id === activeFrameId ? lines : (firstFrame?.lines ?? lines);
    const previewObjects =
      firstFrame?.id === activeFrameId
        ? objects
        : (firstFrame?.objects ?? objects);

    // Match the editor exactly: the background, lines, and objects all share
    // one top-left anchored transform layer.
    context.save();
    context.translate(exportPanX, exportPanY);
    context.rotate((pitchRotationDegrees * Math.PI) / 180);
    context.scale(zoom, zoom);

    drawCanonicalPitchBackground(
      context,
      canvasWidth,
      canvasHeight,
      selectedPitchBackground,
    );

    previewLines.forEach((line) => {
      drawPreviewLine(context, line, canvasWidth, canvasHeight);
    });

    const imageCache = new Map<string, HTMLImageElement>();

    for (const object of previewObjects) {
      if (object.type === "team1" || object.type === "team2") {
        drawPreviewPlayerObject(context, object, canvasWidth, canvasHeight);
      } else if (object.type === "cone") {
        drawPreviewConeObject(context, object, canvasWidth, canvasHeight);
      } else if (object.type === "textBox") {
        drawPreviewTextBoxObject(context, object, canvasWidth, canvasHeight);
      } else {
        await drawPreviewAssetObject(
          context,
          object,
          canvasWidth,
          canvasHeight,
          imageCache,
        );
      }
    }

    context.restore();

    // The editor viewport remains 3:4 even when the pitch is panned upward.
    // Determine the transformed pitch's lowest visible edge and crop the saved
    // preview there so the empty white area below the pitch is not exported.
    const rotationRadians = (pitchRotationDegrees * Math.PI) / 180;
    const scaledWidth = canvasWidth * zoom;
    const scaledHeight = canvasHeight * zoom;
    const transformedCorners = [
      { x: 0, y: 0 },
      { x: scaledWidth, y: 0 },
      { x: 0, y: scaledHeight },
      { x: scaledWidth, y: scaledHeight },
    ].map((corner) => ({
      x:
        exportPanX +
        corner.x * Math.cos(rotationRadians) -
        corner.y * Math.sin(rotationRadians),
      y:
        exportPanY +
        corner.x * Math.sin(rotationRadians) +
        corner.y * Math.cos(rotationRadians),
    }));

    const transformedPitchBottom = Math.max(
      ...transformedCorners.map((corner) => corner.y),
    );
    const croppedHeight = clamp(
      Math.ceil(transformedPitchBottom),
      1,
      canvasHeight,
    );

    if (croppedHeight === canvasHeight) {
      return renderCanvas.toDataURL("image/png");
    }

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = canvasWidth;
    croppedCanvas.height = croppedHeight;

    const croppedContext = croppedCanvas.getContext("2d");

    if (!croppedContext) {
      return renderCanvas.toDataURL("image/png");
    }

    croppedContext.drawImage(
      renderCanvas,
      0,
      0,
      canvasWidth,
      croppedHeight,
      0,
      0,
      canvasWidth,
      croppedHeight,
    );

    return croppedCanvas.toDataURL("image/png");
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
      })),
    );

    setSelectedObjectId(null);
    setSelectedObjectIds([]);
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
    setRedoStack((currentStack) => [
      ...currentStack.slice(-49),
      currentSnapshot,
    ]);

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
    setUndoStack((currentStack) => [
      ...currentStack.slice(-49),
      currentSnapshot,
    ]);

    restoreHistorySnapshot(nextSnapshot);
    setMessage("Redone.");
  }

  function getPitchPointFromClient(clientX: number, clientY: number) {
    const rect = pitchRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    // The complete pitch layer transforms from its upper-left corner. Convert
    // the pointer into that layer's untransformed coordinate system.
    let localX = clientX - rect.left - pan.x;
    let localY = clientY - rect.top - pan.y;

    // Undo pitch rotation before undoing zoom.
    const rotationRadians = (-pitchRotationDegrees * Math.PI) / 180;
    const rotatedX =
      localX * Math.cos(rotationRadians) - localY * Math.sin(rotationRadians);
    const rotatedY =
      localX * Math.sin(rotationRadians) + localY * Math.cos(rotationRadians);

    localX = rotatedX / zoom;
    localY = rotatedY / zoom;

    return {
      x: clamp((localX / rect.width) * 100, 0, 100),
      y: clamp((localY / rect.height) * 100, 0, 100),
    };
  }

  function getPitchPoint(event: PointerEvent<HTMLDivElement>) {
    return getPitchPointFromClient(event.clientX, event.clientY);
  }

  function getPanBounds(forZoom: number) {
    const rect = pitchRef.current?.getBoundingClientRect();

    if (!rect) {
      return {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
      };
    }

    return {
      // Keep horizontal panning disabled at 1.00x. When zoomed in, preserve
      // the existing left/right boundaries so no white space is exposed.
      minX: forZoom <= 1 ? 0 : rect.width * (1 - forZoom),
      maxX: 0,

      // Allow upward panning even at 1.00x. Because the transformed pitch uses
      // a top-left origin, moving it up by half of its scaled height places
      // the center line exactly at the top edge of the visible pitch window.
      minY: -(rect.height * forZoom) / 2,
      maxY: 0,
    };
  }

  function clampPanToZoom(nextPan: { x: number; y: number }, forZoom: number) {
    const bounds = getPanBounds(forZoom);

    return {
      x: clamp(nextPan.x, bounds.minX, bounds.maxX),
      y: clamp(nextPan.y, bounds.minY, bounds.maxY),
    };
  }

  function changeZoom(nextZoom: number) {
    if (isZoomLocked) {
      return;
    }

    const clampedZoom = clamp(nextZoom, 1, 3);

    setZoom(clampedZoom);
    setPan((currentPan) => clampPanToZoom(currentPan, clampedZoom));
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

    setZoom((currentZoom) => {
      const nextZoom = clamp(currentZoom + zoomDirection, 1, 3);

      setPan((currentPan) => clampPanToZoom(currentPan, nextZoom));

      return nextZoom;
    });
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

    if (type === "textBox") {
      return 120;
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

    if (object.type === "textBox") {
      return Math.max(object.fontSize ?? 20, 20) + 16;
    }

    return width;
  }

  function addObject(type: ObjectToolType) {
    saveHistorySnapshot();

    const nextPlayerNumber = playerCount + 1;
    const similarObjects = objects.filter((object) => object.type === type);
    const pitchRect = pitchRef.current?.getBoundingClientRect();

    // Add new objects relative to the center of the pitch area that is
    // currently visible on screen. getPitchPointFromClient reverses the
    // current pan, rotation, and zoom so the stored x/y coordinates remain
    // anchored to the pitch.
    let visiblePlacementPoint = { x: 22, y: 50 };

    if (pitchRect) {
      // Determine the portion of the transformed pitch that is actually
      // visible inside the fixed viewport. Using the viewport center directly
      // is wrong after upward panning because the lower half of the viewport
      // may no longer contain any pitch.
      const transformedLeft = pitchRect.left + pan.x;
      const transformedTop = pitchRect.top + pan.y;
      const transformedRight =
        transformedLeft + pitchRect.width * zoom;
      const transformedBottom =
        transformedTop + pitchRect.height * zoom;

      const visibleLeft = Math.max(pitchRect.left, transformedLeft);
      const visibleTop = Math.max(pitchRect.top, transformedTop);
      const visibleRight = Math.min(pitchRect.right, transformedRight);
      const visibleBottom = Math.min(pitchRect.bottom, transformedBottom);

      const hasVisiblePitch =
        visibleRight > visibleLeft && visibleBottom > visibleTop;

      const placementClientX = hasVisiblePitch
        ? visibleLeft + (visibleRight - visibleLeft) * 0.22
        : pitchRect.left + pitchRect.width * 0.22;

      const placementClientY = hasVisiblePitch
        ? visibleTop + (visibleBottom - visibleTop) * 0.5
        : pitchRect.top + pitchRect.height * 0.5;

      visiblePlacementPoint = getPitchPointFromClient(
        placementClientX,
        placementClientY,
      );
    }

    // Start on the left-middle of the visible pitch. Offset repeated objects
    // slightly to the right and downward so they do not stack exactly.
    const objectIndex = similarObjects.length;
    const columnOffset = (objectIndex % 5) * 6;
    const rowOffset = Math.floor(objectIndex / 5) * 6;

    const nextX = clamp(visiblePlacementPoint.x + columnOffset, 5, 95);
    const rowY = clamp(visiblePlacementPoint.y + rowOffset, 5, 95);

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
      playerShape:
        type === "team1"
          ? team1Shape
          : type === "team2"
            ? team2Shape
            : undefined,
      textColor:
        type === "team1" || type === "team2" ? playerTextColor : "#111827",
      textContent: type === "textBox" ? "Text" : undefined,
      fontSize: type === "textBox" ? 20 : undefined,
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
      tool === "fullGoal" ||
      tool === "textBox"
    ) {
      addObject(tool);
    }
  }

  function handlePitchPointerDown(event: PointerEvent<HTMLDivElement>) {
    const point = getPitchPoint(event);

    if (selectedObjectId || selectedObjectIds.length > 0) {
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
    }

    // When zoom/pan is unlocked, dragging the empty pitch must always begin a
    // pan gesture, regardless of which drawing tool was selected previously.
    if (!isZoomLocked) {
      setPanState({
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (
      selectedTool === "line" ||
      selectedTool === "freehand" ||
      selectedTool === "dribble"
    ) {
      setActiveLinePoints([point]);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (selectedTool === "eraser") {
      eraseNearestLine(point);
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
            : object,
        ),
      );
      return;
    }

    if (panState) {
      setPan(
        clampPanToZoom(
          {
            x: panState.startPanX + (event.clientX - panState.startClientX),
            y: panState.startPanY + (event.clientY - panState.startClientY),
          },
          zoom,
        ),
      );
      return;
    }

    if (
      (selectedTool === "freehand" || selectedTool === "dribble") &&
      activeLinePoints.length > 0
    ) {
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
      (selectedTool === "line" ||
        selectedTool === "freehand" ||
        selectedTool === "dribble") &&
      activeLinePoints.length > 1
    ) {
      saveHistorySnapshot();

      setLines((currentLines) => [
        ...currentLines,
        {
          id: makeId(),
          points: activeLinePoints,
          dashed: selectedTool === "dribble" ? false : isDashed,
          arrow: selectedTool === "dribble" ? true : isArrow,
          color: lineColor,
          lineWidth,
          lineStyle: selectedTool === "dribble" ? "dribble" : "standard",
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
      currentLines.filter((line) => line.id !== lineToErase.id),
    );
  }

  function deleteObject(objectId: string) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.filter((object) => object.id !== objectId),
    );

    setSelectedObjectIds((currentIds) =>
      currentIds.filter((id) => id !== objectId),
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
          : object,
      ),
    );
  }

  function openObjectEditor(objectId: string) {
    setSelectedObjectIds([objectId]);
    setSelectedObjectId(objectId);
    setMessage("");
  }

  function openObjectEditorFromContextMenu(
    event: ReactMouseEvent<HTMLElement>,
    objectId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    openObjectEditor(objectId);
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
          : object,
      ),
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
          : object,
      ),
    );
  }

  function updatePlayerShape(objectId: string, playerShape: PlayerShape) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              playerShape,
            }
          : object,
      ),
    );
  }

  function updatePlayerDisplayMode(
    objectId: string,
    playerDisplayModeOverride: PlayerDisplayMode,
  ) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              playerDisplayModeOverride,
            }
          : object,
      ),
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
          : object,
      ),
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
          : object,
      ),
    );
  }

  function updateObjectTextColor(objectId: string, textColor: string) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              textColor,
            }
          : object,
      ),
    );
  }

  function updateTextContent(objectId: string, textContent: string) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              textContent,
            }
          : object,
      ),
    );
  }

  function updateTextFontSize(objectId: string, fontSize: number) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              fontSize,
            }
          : object,
      ),
    );
  }

  function applyShapeToExistingPlayers(
    objectType: "team1" | "team2",
    playerShape: PlayerShape,
    messageText: string,
  ) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.type === objectType
          ? {
              ...object,
              playerShape,
            }
          : object,
      ),
    );

    setMessage(messageText);
  }

  function applyColorToExistingObjects(
    objectTypes: ObjectToolType[],
    fillColor: string,
    messageText: string,
  ) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        objectTypes.includes(object.type)
          ? {
              ...object,
              fillColor,
            }
          : object,
      ),
    );

    setMessage(messageText);
  }

  function applyTextColorToExistingPlayers(
    textColor: string,
    messageText: string,
  ) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.type === "team1" || object.type === "team2"
          ? {
              ...object,
              textColor,
            }
          : object,
      ),
    );

    setMessage(messageText);
  }

  function applySizeToExistingObjects(
    objectTypes: ObjectToolType[],
    size: number,
    messageText: string,
  ) {
    saveHistorySnapshot();

    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        objectTypes.includes(object.type)
          ? {
              ...object,
              size,
            }
          : object,
      ),
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
    setSelectedObjectIds([]);
    setPanState(null);
    setMessage("Pitch cleared.");
  }

  function startDraggingObject(
    event: PointerEvent<HTMLButtonElement>,
    objectId: string,
  ) {
    event.stopPropagation();

    if (event.shiftKey) {
      selectObject(objectId, true);
      setDraggingObjectId(null);
      return;
    }

    // A normal click highlights the object for moving/deleting, but does not
    // open its properties. Properties open only by double-click or right-click.
    setSelectedObjectIds([objectId]);
    setSelectedObjectId(null);

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
        className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[9px] font-semibold md:h-14 md:w-14 md:text-[10px] ${
          selectedTool === tool.type
            ? "bg-[#0d2140] text-white"
            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <ToolIcon
          type={tool.type}
          team1Color={team1Color}
          team2Color={team2Color}
          playerTextColor={playerTextColor}
          team1Shape={team1Shape}
          team2Shape={team2Shape}
          coneColor={coneColor}
          lineColor={lineColor}
        />
        <span className="leading-none">{tool.shortLabel}</span>
      </button>
    );
  }

  function getDribblePolylinePoints(points: { x: number; y: number }[]) {
    if (points.length < 2) return points;

    const wavelength = 4.2;
    const amplitude = 1.15;
    const sampleStep = 0.45;
    const output: { x: number; y: number }[] = [];
    let travelled = 0;

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.001) continue;

      const normalX = -dy / length;
      const normalY = dx / length;
      const steps = Math.max(1, Math.ceil(length / sampleStep));

      for (let step = 0; step <= steps; step += 1) {
        if (index > 0 && step === 0) continue;
        const t = step / steps;
        const distance = travelled + length * t;
        const offset =
          Math.sin((distance / wavelength) * Math.PI * 2) * amplitude;
        output.push({
          x: start.x + dx * t + normalX * offset,
          y: start.y + dy * t + normalY * offset,
        });
      }

      travelled += length;
    }

    return output;
  }

  function renderLine(line: PitchLine, isPreview = false) {
    if (line.points.length < 2) {
      return null;
    }

    const renderedPoints =
      line.lineStyle === "dribble"
        ? getDribblePolylinePoints(line.points)
        : line.points;
    const points = renderedPoints
      .map((point) => `${point.x},${point.y}`)
      .join(" ");

    const end = renderedPoints[renderedPoints.length - 1];
    const directionStart =
      line.lineStyle === "dribble"
        ? line.points[0]
        : (renderedPoints[renderedPoints.length - 2] ??
          line.points[line.points.length - 2]);
    const angle = Math.atan2(
      line.points[line.points.length - 1].y - directionStart.y,
      line.points[line.points.length - 1].x - directionStart.x,
    );
    const arrowExtension = line.lineStyle === "dribble" ? 3.6 : 0;
    const arrowTip = {
      x: end.x + arrowExtension * Math.cos(angle),
      y: end.y + arrowExtension * Math.sin(angle),
    };
    const arrowLength = 2.5;
    const arrowAngle = Math.PI / 6;

    const arrowPoint1 = {
      x: arrowTip.x - arrowLength * Math.cos(angle - arrowAngle),
      y: arrowTip.y - arrowLength * Math.sin(angle - arrowAngle),
    };

    const arrowPoint2 = {
      x: arrowTip.x - arrowLength * Math.cos(angle + arrowAngle),
      y: arrowTip.y - arrowLength * Math.sin(angle + arrowAngle),
    };

    const strokeColor = isPreview ? lineColor : line.color;
    const strokeWidth = Math.max(
      0.14,
      (isPreview ? lineWidth : line.lineWidth || 4) * 0.1375,
    );
    const dashLength = Math.max(1.2, strokeWidth * 3.25);
    const dashGap = Math.max(1, strokeWidth * 2.5);

    return (
      <g key={line.id}>
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={
            line.lineStyle !== "dribble" && line.dashed
              ? `${dashLength} ${dashGap}`
              : undefined
          }
          opacity={isPreview ? 0.75 : 1}
        />

        {(line.arrow || line.lineStyle === "dribble") && (
          <>
            {line.lineStyle === "dribble" && (
              <line
                x1={end.x}
                y1={end.y}
                x2={arrowTip.x}
                y2={arrowTip.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={isPreview ? 0.75 : 1}
              />
            )}
            <polyline
              points={`${arrowPoint1.x},${arrowPoint1.y} ${arrowTip.x},${arrowTip.y} ${arrowPoint2.x},${arrowPoint2.y}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isPreview ? 0.75 : 1}
            />
          </>
        )}
      </g>
    );
  }

  function renderPlayerObject(object: PitchObject) {
    const fallbackColor = object.type === "team1" ? team1Color : team2Color;
    const fillColor = object.fillColor ?? fallbackColor;
    const size = object.size ?? playerDefaultSize;
    const playerShape =
      object.playerShape ?? (object.type === "team1" ? team1Shape : team2Shape);
    const hitSize = Math.max(size, 44);
    const fontSize = Math.max(10, Math.round(size * 0.42));
    const nameFontSize = Math.max(
      9,
      Math.round(object.nameFontSize ?? size * 0.3),
    );

    const effectiveDisplayMode =
      object.playerDisplayModeOverride ?? playerDisplayMode;
    const shouldShowNumber =
      effectiveDisplayMode === "number" || effectiveDisplayMode === "both";

    const shouldShowName =
      effectiveDisplayMode === "name" || effectiveDisplayMode === "both";

    const displayName = object.playerName?.trim();

    return (
      <div
        key={object.id}
        className={`absolute z-20 flex flex-col items-center justify-center ${
          isObjectSelected(object.id)
            ? "rounded-lg ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent"
            : ""
        }`}
        style={{
          left: `${object.x}%`,
          top: `${object.y}%`,
          width: `${hitSize}px`,
          minHeight: `${hitSize}px`,
          transform: "translate(-50%, -50%)",
          transition: isPlayingAnimation
            ? `left ${Math.max(250, playbackFrame.durationMs)}ms linear, top ${Math.max(250, playbackFrame.durationMs)}ms linear`
            : undefined,
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
          onContextMenu={(event) =>
            openObjectEditorFromContextMenu(event, object.id)
          }
          className="flex items-center justify-center border-2 border-black font-bold shadow-sm"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            fontSize: `${fontSize}px`,
            backgroundColor: fillColor,
            color: object.textColor ?? playerTextColor,
            borderRadius:
              playerShape === "circle"
                ? "9999px"
                : playerShape === "square"
                  ? "8px"
                  : "0",
            clipPath:
              playerShape === "triangle"
                ? "polygon(50% 0%, 100% 100%, 0% 100%)"
                : playerShape === "diamond"
                  ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                  : undefined,
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
        onContextMenu={(event) =>
          openObjectEditorFromContextMenu(event, object.id)
        }
        className={`absolute z-20 flex touch-none items-center justify-center bg-transparent p-0 ${
          isObjectSelected(object.id)
            ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent"
            : ""
        }`}
        style={{
          left: `${object.x}%`,
          top: `${object.y}%`,
          transition: isPlayingAnimation
            ? `left ${Math.max(250, playbackFrame.durationMs)}ms linear, top ${Math.max(250, playbackFrame.durationMs)}ms linear`
            : undefined,
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
        onContextMenu={(event) =>
          openObjectEditorFromContextMenu(event, object.id)
        }
        className={`absolute z-20 flex touch-none items-center justify-center bg-transparent p-0 ${
          isObjectSelected(object.id)
            ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent"
            : ""
        }`}
        style={{
          left: `${object.x}%`,
          top: `${object.y}%`,
          transition: isPlayingAnimation
            ? `left ${Math.max(250, playbackFrame.durationMs)}ms linear, top ${Math.max(250, playbackFrame.durationMs)}ms linear`
            : undefined,
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

  function renderTextBoxObject(object: PitchObject) {
    const width = object.size ?? 120;
    const fontSize = object.fontSize ?? 20;
    const hitWidth = Math.max(width, 60);
    const hitHeight = Math.max(fontSize + 18, 44);

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
        onContextMenu={(event) =>
          openObjectEditorFromContextMenu(event, object.id)
        }
        className={`absolute z-20 flex touch-none items-center justify-center whitespace-pre-wrap break-words rounded-lg border border-slate-500/40 bg-white/70 px-2 py-1 text-center font-bold leading-tight shadow-sm ${
          isObjectSelected(object.id)
            ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent"
            : ""
        }`}
        style={{
          left: `${object.x}%`,
          top: `${object.y}%`,
          transition: isPlayingAnimation
            ? `left ${Math.max(250, playbackFrame.durationMs)}ms linear, top ${Math.max(250, playbackFrame.durationMs)}ms linear`
            : undefined,
          width: `${hitWidth}px`,
          minHeight: `${hitHeight}px`,
          transform: "translate(-50%, -50%)",
          color: object.textColor ?? "#111827",
          fontSize: `${fontSize}px`,
        }}
        title="Drag to move. Double-click to edit."
      >
        {object.textContent?.trim() || "Text"}
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

    if (object.type === "textBox") {
      return renderTextBoxObject(object);
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
      selectedObject.type === "cone" ||
      selectedObject.type === "textBox";

    const supportsPlayerFields =
      selectedObject.type === "team1" || selectedObject.type === "team2";

    const selectedPlayerShape =
      selectedObject.playerShape ??
      (selectedObject.type === "team1" ? team1Shape : team2Shape);

    const colorValue =
      selectedObject.type === "textBox"
        ? (selectedObject.textColor ?? "#111827")
        : (selectedObject.fillColor ??
          (selectedObject.type === "team1"
            ? team1Color
            : selectedObject.type === "team2"
              ? team2Color
              : coneColor));

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
              {supportsPlayerFields ? "Shape Color" : "Color"}
            </label>

            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={colorValue}
                onChange={(event) =>
                  selectedObject.type === "textBox"
                    ? updateObjectTextColor(
                        selectedObject.id,
                        event.target.value,
                      )
                    : updateObjectColor(selectedObject.id, event.target.value)
                }
                className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-1"
              />

              <input
                type="text"
                value={colorValue}
                onChange={(event) =>
                  selectedObject.type === "textBox"
                    ? updateObjectTextColor(
                        selectedObject.id,
                        event.target.value,
                      )
                    : updateObjectColor(selectedObject.id, event.target.value)
                }
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
          </div>
        )}

        {supportsPlayerFields && (
          <div className="mt-2">
            <label className="block text-[11px] font-semibold text-slate-600">
              Shape
            </label>

            <select
              value={selectedPlayerShape}
              onChange={(event) =>
                updatePlayerShape(
                  selectedObject.id,
                  event.target.value as PlayerShape,
                )
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
            >
              <option value="circle">Circle</option>
              <option value="triangle">Triangle</option>
              <option value="square">Square</option>
              <option value="diamond">Diamond</option>
            </select>
          </div>
        )}

        {supportsPlayerFields && (
          <div className="mt-2">
            <label className="block text-[11px] font-semibold text-slate-600">
              Number Text Color
            </label>

            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={selectedObject.textColor ?? playerTextColor}
                onChange={(event) =>
                  updateObjectTextColor(selectedObject.id, event.target.value)
                }
                className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-1"
              />

              <input
                type="text"
                value={selectedObject.textColor ?? playerTextColor}
                onChange={(event) =>
                  updateObjectTextColor(selectedObject.id, event.target.value)
                }
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
          </div>
        )}

        {supportsPlayerFields && (
          <div className="mt-2">
            <label className="block text-[11px] font-semibold text-slate-600">
              Display
            </label>

            <select
              value={
                selectedObject.playerDisplayModeOverride ?? playerDisplayMode
              }
              onChange={(event) =>
                updatePlayerDisplayMode(
                  selectedObject.id,
                  event.target.value as PlayerDisplayMode,
                )
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
            >
              <option value="number">Number</option>
              <option value="name">Name</option>
              <option value="both">Both</option>
              <option value="none">None</option>
            </select>
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

        {selectedObject.type === "textBox" && (
          <div className="mt-2 grid grid-cols-1 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Text
              </label>

              <textarea
                value={selectedObject.textContent ?? ""}
                onChange={(event) =>
                  updateTextContent(selectedObject.id, event.target.value)
                }
                className="mt-1 min-h-16 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Font Size: {selectedObject.fontSize ?? 20}px
              </label>

              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={selectedObject.fontSize ?? 20}
                onChange={(event) =>
                  updateTextFontSize(
                    selectedObject.id,
                    Number(event.target.value),
                  )
                }
                className="mt-1 w-full"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const playbackFrame = frames[playbackFrameIndex] ?? frames[0];
  const displayedObjects = isPlayingAnimation ? playbackFrame.objects : objects;
  const displayedLines = isPlayingAnimation ? playbackFrame.lines : lines;

  return (
    <div className="grid gap-2">
      <section
        ref={controlBarRef}
        className={`rounded-xl bg-white p-2 shadow-sm md:p-3 ${
          isControlBarPinned
            ? "sticky top-[72px] z-[60] border border-slate-200 shadow-lg"
            : ""
        }`}
      >
        {showActivityTabs && (
          <div className="mb-1 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={openFrameManager}
                disabled={isPlayingAnimation}
                className="mr-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-[#0d2140] shadow-sm hover:bg-slate-100 disabled:opacity-40"
                title="Open Frame Manager"
                aria-label="Open Frame Manager"
              >
                <FrameManagerIcon className="h-4 w-4" />
              </button>
              {frames.map((frame, index) => (
                <div
                  key={frame.id}
                  className="flex items-center overflow-hidden rounded-md border border-slate-300 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => switchFrame(frame.id)}
                    onDoubleClick={() => renameFrame(frame.id)}
                    disabled={isPlayingAnimation}
                    className={`px-2 py-1 text-xs font-bold ${
                      frame.id === activeFrameId && !isPlayingAnimation
                        ? "bg-[#0d2140] text-white"
                        : isPlayingAnimation && index === playbackFrameIndex
                          ? "bg-emerald-600 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                    }`}
                    title="Click to open. Double-click to rename."
                  >
                    {frame.name}
                  </button>
                  {showAnimationDurations && (
                    <input
                      type="number"
                      min="250"
                      max="10000"
                      step="250"
                      value={frame.durationMs}
                      onChange={(event) =>
                        updateFrameDuration(
                          frame.id,
                          Number(event.target.value),
                        )
                      }
                      disabled={isPlayingAnimation}
                      className="w-16 border-l border-slate-200 px-1.5 py-1 text-[10px] text-slate-600"
                      title="Animation duration in milliseconds"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => deleteFrame(frame.id)}
                    disabled={isPlayingAnimation || frames.length === 1}
                    className="border-l border-slate-200 px-1.5 py-1 text-[10px] font-bold text-red-600 disabled:text-slate-300"
                    title="Delete tab"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFrame}
                disabled={isPlayingAnimation}
                className="rounded-md bg-[#0d2140] px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
              >
                + New Tab
              </button>
              <button
                type="button"
                onClick={toggleAnimationPlayback}
                className={`rounded-md px-2 py-1 text-xs font-bold text-white ${
                  isPlayingAnimation ? "bg-red-600" : "bg-emerald-600"
                }`}
              >
                {isPlayingAnimation ? "Stop Animation" : "Play Animation"}
              </button>
            </div>
            <p className="mt-1 text-[10px] leading-tight text-slate-500">
              New tabs copy the most recent tab and preserve object IDs so
              movement can animate between tabs. Animation plays once and stops
              on the final tab.
            </p>
          </div>
        )}
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

        {!isToolbarOnLeft && (
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
          </div>
        )}

        {showToolbarSettings && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-800">
                Toolbar Settings
              </h3>

              <button
                type="button"
                onClick={() => setShowToolbarSettings(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isToolbarOnLeft}
                onChange={(event) => setIsToolbarOnLeft(event.target.checked)}
              />
              Move toolbar to the left of the pitch
            </label>

            <label className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showAnimationDurations}
                onChange={(event) =>
                  setShowAnimationDurations(event.target.checked)
                }
              />
              Show animation duration controls in milliseconds
            </label>

            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              <label className="text-sm font-semibold text-slate-700">
                Default Frame Duration: {defaultFrameDurationMs} ms
              </label>
              <input
                type="range"
                min="250"
                max="10000"
                step="250"
                value={defaultFrameDurationMs}
                onChange={(event) =>
                  setDefaultFrameDurationMs(
                    clamp(Number(event.target.value), 250, 10000),
                  )
                }
                className="mt-3 w-full"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>250 ms</span>
                <span>10,000 ms</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                New frames use this duration. Duplicated frames keep the
                duration of the source frame.
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <label className="text-sm font-semibold text-slate-700">
                  Team 1 Default Shape
                </label>

                <select
                  value={team1Shape}
                  onChange={(event) =>
                    setTeam1Shape(event.target.value as PlayerShape)
                  }
                  className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="circle">Circle</option>
                  <option value="triangle">Triangle</option>
                  <option value="square">Square</option>
                  <option value="diamond">Diamond</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    applyShapeToExistingPlayers(
                      "team1",
                      team1Shape,
                      "Team 1 shape applied to existing Team 1 players.",
                    )
                  }
                  className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Apply to Existing Team 1
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <label className="text-sm font-semibold text-slate-700">
                  Team 2 Default Shape
                </label>

                <select
                  value={team2Shape}
                  onChange={(event) =>
                    setTeam2Shape(event.target.value as PlayerShape)
                  }
                  className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="circle">Circle</option>
                  <option value="triangle">Triangle</option>
                  <option value="square">Square</option>
                  <option value="diamond">Diamond</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    applyShapeToExistingPlayers(
                      "team2",
                      team2Shape,
                      "Team 2 shape applied to existing Team 2 players.",
                    )
                  }
                  className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Apply to Existing Team 2
                </button>
              </div>
            </div>

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
                        "Team 1 color applied to existing Team 1 players.",
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
                        "Team 2 color applied to existing Team 2 players.",
                      )
                    }
                    className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Apply to Existing Team 2
                  </button>
                }
              />

              <ColorSetting
                label="Player Number Text Color"
                value={playerTextColor}
                onChange={setPlayerTextColor}
                buttonPrefix="player-text"
                footer={
                  <button
                    type="button"
                    onClick={() =>
                      applyTextColorToExistingPlayers(
                        playerTextColor,
                        "Player number text color applied to existing players.",
                      )
                    }
                    className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Apply to Existing Players
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
                        "Cone color applied to existing cones.",
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

              <SizeSetting
                label="Line Thickness"
                value={lineWidth}
                min={1}
                max={12}
                onChange={setLineWidth}
                onApply={() => {
                  setLines((currentLines) =>
                    currentLines.map((line) => ({ ...line, lineWidth })),
                  );
                  setMessage("Line thickness applied to existing lines.");
                }}
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
                    "Player size applied to existing players.",
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
                    "Cone size applied to existing cones.",
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
                    "Mannequin size applied to existing mannequins.",
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
                    "Soccer ball size applied to existing soccer balls.",
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
                event.target.value as PitchBackgroundType,
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
            onClick={() => setShowActivityTabs((current) => !current)}
            aria-expanded={showActivityTabs}
            className={`flex h-14 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] font-bold transition ${
              showActivityTabs
                ? "border-[#0d2140] bg-[#0d2140] text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            title={
              showActivityTabs ? "Hide Activity Tabs" : "Show Activity Tabs"
            }
          >
            <MovieCameraIcon />
            <span className="leading-none">Animate</span>
          </button>

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

          {initialActivity?.id && (
            <Link
              href={`/activity/${initialActivity.id}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Back to Activity
            </Link>
          )}

          <button
            type="button"
            onClick={openSavePanel}
            className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-50"
          >
            Save
          </button>

          <button
            type="button"
            onClick={() => setIsControlBarPinned((current) => !current)}
            aria-pressed={isControlBarPinned}
            title={
              isControlBarPinned
                ? "Unpin controls from top"
                : "Pin controls to top"
            }
            className={`ml-auto flex h-12 w-12 items-center justify-center rounded-lg border transition ${
              isControlBarPinned
                ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <PinIcon pinned={isControlBarPinned} />
          </button>
        </div>

      </section>

      <section
        ref={pitchSectionRef}
        className={
          isPitchPoppedOut
            ? "fixed z-[220] h-[calc(100vh-3rem)] w-[calc(100vw-3rem)] min-h-[520px] min-w-[720px] resize overflow-auto rounded-2xl border border-slate-300 bg-white p-2 shadow-2xl"
            : "overflow-hidden rounded-xl bg-white p-1 shadow-sm md:p-2"
        }
        style={
          isPitchPoppedOut
            ? {
                left: `${popOutPosition.left}px`,
                top: `${popOutPosition.top}px`,
              }
            : undefined
        }
      >
        {isPitchPoppedOut && (
          <div
            onPointerDown={startDraggingPitchPopOut}
            className={`sticky top-0 z-[240] mb-2 flex cursor-move touch-none items-center justify-between rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 shadow-sm ${
              popOutDragState ? "select-none bg-slate-200" : ""
            }`}
            title="Drag to move the pop-out window"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <span aria-hidden="true">⋮⋮</span>
              <span>Activity Pitch</span>
              <span className="text-xs font-medium text-slate-500">
                Drag this bar to move
              </span>
            </div>

            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={returnPitchToPage}
              className="rounded-lg border border-sky-600 bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
            >
              Return
            </button>
          </div>
        )}

        <div
          ref={pitchControlsBoundaryRef}
          className={`relative mx-auto flex max-w-full justify-center rounded-xl border border-slate-200 bg-slate-100 ${
            isPitchPoppedOut ? "overflow-hidden" : "overflow-visible"
          }`}
          onWheel={handleWheel}
        >
          <div
            className={`pointer-events-none z-50 ${
              dockedPitchControls.isDocked
                ? "fixed"
                : "absolute inset-0"
            }`}
            style={
              dockedPitchControls.isDocked
                ? {
                    left: `${dockedPitchControls.left}px`,
                    top: `${dockedPitchControls.top}px`,
                    width: `${dockedPitchControls.width}px`,
                    height: 0,
                  }
                : undefined
            }
          >
            <div className="relative h-0 w-full">
              <div className="pointer-events-auto absolute left-2 top-2 flex flex-col gap-1 md:left-3 md:top-3 md:flex-row md:gap-2">
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
                  <span className="md:hidden">
                    {isZoomLocked ? "🔒" : "🔓"}
                  </span>
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
                  disabled={isZoomLocked || zoom <= 1}
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

              {isToolbarOnLeft && (
                <div className="pointer-events-auto absolute left-3 top-16 hidden md:block">
                  <div className="grid max-h-[calc(100vh-16rem)] grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-slate-300 bg-white/95 p-2 shadow-lg backdrop-blur">
                    <button
                      type="button"
                      onClick={() => setShowToolbarSettings((current) => !current)}
                      className={`sticky top-0 z-10 col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg text-[10px] font-semibold shadow-sm ${
                        showToolbarSettings
                          ? "bg-[#0d2140] text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Settings
                    </button>

                    {tools.map((tool) => renderToolButton(tool))}

                    <label className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-300 bg-white text-[9px] font-semibold text-slate-700 md:h-14 md:w-14 md:text-[10px]">
                      <input
                        type="checkbox"
                        checked={isDashed}
                        onChange={(event) => setIsDashed(event.target.checked)}
                      />
                      Dashed
                    </label>

                    <label className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-300 bg-white text-[9px] font-semibold text-slate-700 md:h-14 md:w-14 md:text-[10px]">
                      <input
                        type="checkbox"
                        checked={isArrow}
                        onChange={(event) => setIsArrow(event.target.checked)}
                      />
                      Arrow
                    </label>
                  </div>
                </div>
              )}

              <div className="pointer-events-auto absolute right-2 top-2 flex flex-col items-end gap-2 md:right-3 md:top-3">
                <button
                  type="button"
                  onClick={clearPitch}
                  className="flex h-9 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 md:h-10"
                  title="Clear pitch"
                >
                  <SmallTrashIcon />
                  <span className="hidden sm:inline">Clear</span>
                </button>

                <button
                  type="button"
                  onClick={openPitchPopOut}
                  disabled={isPitchPoppedOut}
                  className="flex h-9 items-center justify-center rounded-lg border border-sky-300 bg-white px-3 text-xs font-bold text-sky-700 shadow-sm hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40 md:h-10"
                  title="Pop out pitch and toolbar"
                >
                  Pop Out
                </button>
              </div>
            </div>
          </div>

          <div
            className={`flex min-h-[420px] w-full justify-center overflow-visible ${
              isPitchPoppedOut ? "min-h-[calc(100vh-9rem)]" : ""
            } ${
              isToolbarOnLeft
                ? "md:pl-[12rem] md:pr-[6rem]"
                : "h-[70vh] pt-14 md:h-auto md:px-14 md:pt-20"
            }`}
          >
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
              className={`relative aspect-[3/4] max-w-full touch-none overflow-hidden rounded-xl bg-white shadow-inner ${
                isToolbarOnLeft
                  ? "h-auto w-full"
                  : "h-full max-h-full w-auto md:h-auto md:w-full"
              } ${
                !isZoomLocked && !panState ? "cursor-grab" : ""
              } ${panState ? "cursor-grabbing" : ""}`}
              style={{
                transform: "none",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${pitchRotationDegrees}deg) scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
                <CodedPitchBackground background={selectedPitchBackground} />

                <svg
                  className="absolute inset-0 z-10 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {displayedLines.map((line) => renderLine(line))}

                  {activeLinePoints.length > 1 &&
                    renderLine(
                      {
                        id: "preview",
                        points: activeLinePoints,
                        dashed: isDashed,
                        arrow: selectedTool === "dribble" ? true : isArrow,
                        color: lineColor,
                        lineWidth,
                        lineStyle:
                          selectedTool === "dribble" ? "dribble" : "standard",
                      },
                      true,
                    )}
                </svg>

                {displayedObjects.map((object) => renderObject(object))}
                {!isPlayingAnimation && renderSelectedObjectPitchControls()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showFrameManager && (
        <div className="fixed inset-0 z-[170] bg-slate-900/30">
          <button
            type="button"
            aria-label="Close Frame Manager"
            onClick={closeFrameManager}
            className="absolute inset-0"
          />

          <div
            ref={frameManagerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="frame-manager-title"
            className="fixed z-10 flex h-[min(760px,calc(100vh-3rem))] w-[min(1000px,calc(100vw-3rem))] min-h-[420px] min-w-[340px] max-h-[calc(100vh-1.5rem)] max-w-[calc(100vw-1.5rem)] resize flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl"
            style={{
              left: `${frameManagerPosition.left}px`,
              top: `${frameManagerPosition.top}px`,
            }}
          >
            <div
              onPointerDown={startDraggingFrameManager}
              className={`flex cursor-move touch-none select-none items-center justify-between border-b border-slate-200 px-5 py-4 ${
                frameManagerDragState ? "bg-slate-100" : "bg-white"
              }`}
              title="Drag to move the Frame Manager"
            >
              <div>
                <h2
                  id="frame-manager-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Frame Manager
                </h2>
                <p className="text-sm text-slate-500">
                  Select a thumbnail to display that frame on the pitch behind
                  this window. Drag the header to move; drag the lower-right
                  edge to resize.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFrameManager}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-600 hover:bg-slate-50"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {frames.map((frame, index) => {
                  const isActive = frame.id === activeFrameId;
                  const thumbnailObjects = isActive ? objects : frame.objects;
                  const thumbnailLines = isActive ? lines : frame.lines;

                  return (
                    <div
                      key={frame.id}
                      className={`rounded-xl border p-3 ${
                        isActive
                          ? "border-[#0d2140] bg-blue-50 ring-2 ring-[#0d2140]/20"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => switchFrame(frame.id)}
                        disabled={isPlayingAnimation}
                        className="block w-full text-left"
                      >
                        <div className="relative mx-auto aspect-[3/4] w-full max-w-[180px] overflow-hidden rounded-lg border border-slate-300 bg-white shadow-inner">
                          <CodedPitchBackground
                            background={selectedPitchBackground}
                          />
                          <svg
                            className="absolute inset-0 z-10 h-full w-full"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            {thumbnailLines.map((line) => renderLine(line))}
                          </svg>
                          {thumbnailObjects.map((object) => (
                            <span
                              key={object.id}
                              className="absolute z-20 block rounded-full border border-white bg-[#0d2140] shadow"
                              style={{
                                left: `${object.x}%`,
                                top: `${object.y}%`,
                                width: "7px",
                                height: "7px",
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800">
                            {frame.name}
                          </span>
                          {isActive && (
                            <span className="rounded-full bg-[#0d2140] px-2 py-0.5 text-[10px] font-bold text-white">
                              Active
                            </span>
                          )}
                        </div>
                      </button>

                      <label className="mt-3 block text-xs font-semibold text-slate-600">
                        Duration (ms)
                      </label>
                      <input
                        type="number"
                        min="250"
                        max="10000"
                        step="250"
                        value={frame.durationMs}
                        onChange={(event) =>
                          updateFrameDuration(
                            frame.id,
                            Number(event.target.value),
                          )
                        }
                        disabled={isPlayingAnimation}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => renameFrame(frame.id)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateFrame(frame.id)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFrame(frame.id, -1)}
                          disabled={index === 0}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-35"
                        >
                          Move Left
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFrame(frame.id, 1)}
                          disabled={index === frames.length - 1}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-35"
                        >
                          Move Right
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFrame(frame.id)}
                          disabled={frames.length === 1}
                          className="col-span-2 rounded-lg border border-red-300 bg-white px-2 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-35"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={addFrame}
                  disabled={isPlayingAnimation}
                  className="rounded-lg border border-[#0d2140] bg-white px-4 py-2 text-sm font-bold text-[#0d2140] hover:bg-slate-50"
                >
                  + New Frame
                </button>
                <button
                  type="button"
                  onClick={toggleAnimationPlayback}
                  className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${
                    isPlayingAnimation ? "bg-red-600" : "bg-emerald-600"
                  }`}
                >
                  {isPlayingAnimation ? "Stop Animation" : "Play Animation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUnsavedChangesPrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-activity-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2
              id="unsaved-activity-title"
              className="text-xl font-bold text-slate-900"
            >
              Save this activity?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              You have changes that have not been saved. Save the activity
              before leaving this page?
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={saveBeforeLeaving}
                className="rounded-lg bg-[#0d2140] px-4 py-3 font-bold text-white hover:bg-[#142f57]"
              >
                Save Activity
              </button>

              <button
                type="button"
                onClick={leaveWithoutSaving}
                className="rounded-lg border border-red-300 bg-white px-4 py-3 font-bold text-red-700 hover:bg-red-50"
              >
                Leave Without Saving
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowUnsavedChangesPrompt(false);
                  setPendingNavigationUrl(null);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {showMetadataCloseWarning && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/55 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="metadata-close-warning-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2
              id="metadata-close-warning-title"
              className="text-xl font-bold text-slate-900"
            >
              Close without updating?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              You changed the activity metadata, but those changes have not been
              saved. Closing now will leave the saved activity unchanged.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => setShowMetadataCloseWarning(false)}
                className="rounded-lg bg-[#0d2140] px-4 py-3 font-bold text-white hover:bg-[#142f57]"
              >
                Keep Editing
              </button>

              <button
                type="button"
                onClick={closeSavePanelWithoutUpdating}
                className="rounded-lg border border-red-300 bg-white px-4 py-3 font-bold text-red-700 hover:bg-red-50"
              >
                Close Without Updating
              </button>
            </div>
          </div>
        </div>
      )}

      {isSavePanelOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Close save panel"
            onClick={closeSavePanel}
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
                onClick={closeSavePanel}
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
                onSaved={handleActivitySaved}
                onDirtyChange={setIsMetadataFormDirty}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
