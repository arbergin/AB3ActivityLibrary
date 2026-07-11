"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import {
  deleteStoredActivity,
  getStoredActivityById,
  updateStoredActivityHidden,
} from "@/lib/activityStorage";
import { downloadActivityAsPdf } from "@/lib/downloadActivityPdf";
import { mockActivities } from "@/lib/mockActivities";
import { recordRecentActivityOpen } from "@/lib/recentActivityViews";
import { supabase } from "@/lib/supabaseClient";
import {
  deleteSupabaseActivity,
  duplicateSupabaseActivity,
  getSupabaseActivityById,
  updateSupabaseActivityHidden,
} from "@/lib/supabaseActivities";
import type { Activity } from "@/types/activity";
import { canManageActivity, isActivityOwner } from "@/lib/activityPermissions";
import { getCurrentUserProfile, type UserProfile } from "@/lib/userProfile";

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


type CreatorStateRecord = Record<string, unknown>;

type PreviewObject = {
  id: string;
  type: string;
  x: number;
  y: number;
  label?: string;
  playerName?: string;
  rotation: number;
  fillColor?: string;
  textColor?: string;
  size?: number;
  nameFontSize?: number;
  playerShape?: "circle" | "triangle" | "square" | "diamond";
  textContent?: string;
  fontSize?: number;
};

type PreviewLine = {
  id: string;
  points: { x: number; y: number }[];
  dashed: boolean;
  arrow: boolean;
  color: string;
  lineWidth: number;
};

const PREVIEW_ASSETS = {
  ball: "/activity-assets/soccer_ball.png",
  mannequin: "/activity-assets/mannequin.png",
  miniGoal: "/activity-assets/mini_goal.png",
  fullGoal: "/activity-assets/full_goal.png",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is CreatorStateRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isColorObject(
  value: unknown
): value is { red: number; green: number; blue: number; opacity?: number } {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.red === "number" &&
    typeof value.green === "number" &&
    typeof value.blue === "number"
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

function normalizePreviewCoordinate(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  // iOS v2 stores 0...1. Older web creator states store 0...100.
  if (Math.abs(value) <= 1) {
    return clamp(value * 100, 0, 100);
  }

  return clamp(value, 0, 100);
}

function getStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getNumberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getCreatorStatePitch(activity: Activity) {
  const creatorState = activity.creatorState;

  if (!isRecord(creatorState)) {
    return {
      background: "pitchGreen",
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotationDegrees: 0,
    };
  }

  const creatorStateRecord: CreatorStateRecord = creatorState;
  const pitch: CreatorStateRecord | undefined = isRecord(creatorStateRecord.pitch)
    ? creatorStateRecord.pitch
    : undefined;

  const background =
    getStringValue(pitch?.background) ||
    getStringValue(creatorStateRecord.selectedPitchBackground) ||
    "pitchGreen";

  return {
    background:
      background === "pitchWhite" ||
      background === "greenBlank" ||
      background === "whiteBlank"
        ? background
        : "pitchGreen",
    zoom: getNumberValue(pitch?.zoom, 1),
    offsetX: getNumberValue(pitch?.offsetX, 0),
    offsetY: getNumberValue(pitch?.offsetY, 0),
    rotationDegrees: getNumberValue(pitch?.rotationDegrees, 0),
  };
}

function getCreatorStateSettings(activity: Activity) {
  const creatorState = activity.creatorState;

  if (!isRecord(creatorState)) {
    return {
      team1Color: "#2563eb",
      team2Color: "#dc2626",
      coneColor: "#f97316",
      playerTextColor: "#ffffff",
      playerDisplayMode: "number",
    };
  }

  const creatorStateRecord: CreatorStateRecord = creatorState;
  const settings: CreatorStateRecord = isRecord(creatorStateRecord.settings)
    ? creatorStateRecord.settings
    : {};

  return {
    team1Color:
      colorToCss(settings.team1DefaultColor, "") ||
      colorToCss(settings.team1Color, "#2563eb"),
    team2Color:
      colorToCss(settings.team2DefaultColor, "") ||
      colorToCss(settings.team2Color, "#dc2626"),
    coneColor:
      colorToCss(settings.coneDefaultColor, "") ||
      colorToCss(settings.coneColor, "#f97316"),
    playerTextColor: colorToCss(settings.playerTextDefaultColor, "#ffffff"),
    playerDisplayMode:
      getStringValue(settings.playerDisplayMode) === "both"
        ? "both"
        : getStringValue(settings.playerDisplayMode) === "name"
          ? "name"
          : getStringValue(settings.playerDisplayMode) === "none"
            ? "none"
            : "number",
  };
}

function getCreatorStateObjects(activity: Activity): PreviewObject[] {
  const creatorState = activity.creatorState;

  if (!isRecord(creatorState)) {
    return [];
  }

  const creatorStateRecord: CreatorStateRecord = creatorState;
  const rawObjects = Array.isArray(creatorStateRecord.objects)
    ? creatorStateRecord.objects
    : [];

  return rawObjects
    .map<PreviewObject | undefined>((rawObject) => {
      if (!isRecord(rawObject)) {
        return undefined;
      }

      const type = getStringValue(rawObject.type);

      if (
        type !== "team1" &&
        type !== "team2" &&
        type !== "cone" &&
        type !== "ball" &&
        type !== "mannequin" &&
        type !== "miniGoal" &&
        type !== "fullGoal" &&
        type !== "textBox"
      ) {
        return undefined;
      }

      const playerShape = getStringValue(rawObject.playerShape);

      return {
        id: getStringValue(rawObject.id, crypto.randomUUID()),
        type,
        x: normalizePreviewCoordinate(rawObject.x),
        y: normalizePreviewCoordinate(rawObject.y),
        label:
          getStringValue(rawObject.label) || getStringValue(rawObject.number),
        playerName:
          getStringValue(rawObject.playerName) || getStringValue(rawObject.name),
        rotation: getNumberValue(
          rawObject.rotation,
          getNumberValue(rawObject.rotationDegrees, 0)
        ),
        fillColor: colorToCss(rawObject.fillColor, ""),
        textColor: colorToCss(rawObject.textColor, ""),
        size:
          typeof rawObject.size === "number" && Number.isFinite(rawObject.size)
            ? rawObject.size
            : undefined,
        nameFontSize:
          typeof rawObject.nameFontSize === "number" &&
          Number.isFinite(rawObject.nameFontSize)
            ? rawObject.nameFontSize
            : undefined,
        playerShape:
          playerShape === "triangle" ||
          playerShape === "square" ||
          playerShape === "diamond"
            ? playerShape
            : "circle",
        textContent: getStringValue(rawObject.textContent, "Text"),
        fontSize:
          typeof rawObject.fontSize === "number" &&
          Number.isFinite(rawObject.fontSize)
            ? rawObject.fontSize
            : undefined,
      };
    })
    .filter((object): object is PreviewObject => Boolean(object));
}

function getCreatorStateLines(activity: Activity): PreviewLine[] {
  const creatorState = activity.creatorState;

  if (!isRecord(creatorState)) {
    return [];
  }

  const creatorStateRecord: CreatorStateRecord = creatorState;
  const rawLines = Array.isArray(creatorStateRecord.lines)
    ? creatorStateRecord.lines
    : [];

  return rawLines
    .map<PreviewLine | undefined>((rawLine) => {
      if (!isRecord(rawLine) || !Array.isArray(rawLine.points)) {
        return undefined;
      }

      const points = rawLine.points
        .map((rawPoint) => {
          if (!isRecord(rawPoint)) {
            return undefined;
          }

          return {
            x: normalizePreviewCoordinate(rawPoint.x),
            y: normalizePreviewCoordinate(rawPoint.y),
          };
        })
        .filter((point): point is { x: number; y: number } => Boolean(point));

      if (points.length < 2) {
        return undefined;
      }

      return {
        id: getStringValue(rawLine.id, crypto.randomUUID()),
        points,
        dashed: Boolean(rawLine.dashed ?? rawLine.isDashed),
        arrow: Boolean(rawLine.arrow ?? rawLine.isArrow),
        color: colorToCss(rawLine.color, "#111827"),
        lineWidth: getNumberValue(rawLine.lineWidth, 4),
      };
    })
    .filter((line): line is PreviewLine => Boolean(line));
}

function CodedPitchBackground({
  background,
}: {
  background: string;
}) {
  const isGreen = background === "pitchGreen" || background === "greenBlank";
  const isBlank = background === "greenBlank" || background === "whiteBlank";
  const lineColor = isGreen ? "#ffffff" : "#111827";

  return (
    <svg
      viewBox="0 0 100 133.333333"
      aria-label="Soccer pitch"
      className="absolute inset-0 block h-full w-full select-none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="ab3-view-green-pitch-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#168807" />
          <stop offset="50%" stopColor="#27c20d" />
          <stop offset="100%" stopColor="#147506" />
        </linearGradient>

        <linearGradient id="ab3-view-white-pitch-gradient" x1="0" y1="0" x2="0" y2="1">
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
            ? "url(#ab3-view-green-pitch-gradient)"
            : "url(#ab3-view-white-pitch-gradient)"
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
            fill={index % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}
          />
        ))}

      {!isBlank && (
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
      )}

      {!isBlank && (
        <g fill={lineColor}>
          <circle cx="50" cy="66.666667" r="0.65" />
          <circle cx="50" cy="18.666667" r="0.65" />
          <circle cx="50" cy="114.666667" r="0.65" />
        </g>
      )}
    </svg>
  );
}

function renderPreviewLine(line: PreviewLine) {
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

  const strokeWidth = Math.max(0.14, line.lineWidth * 0.1375);
  const dashLength = Math.max(1.2, strokeWidth * 3.25);
  const dashGap = Math.max(1, strokeWidth * 2.5);

  return (
    <g key={line.id}>
      <polyline
        points={points}
        fill="none"
        stroke={line.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={line.dashed ? `${dashLength} ${dashGap}` : undefined}
      />

      {line.arrow && (
        <polyline
          points={`${arrowPoint1.x},${arrowPoint1.y} ${end.x},${end.y} ${arrowPoint2.x},${arrowPoint2.y}`}
          fill="none"
          stroke={line.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

function CreatorStateActivityPreview({ activity }: { activity: Activity }) {
  const pitch = getCreatorStatePitch(activity);
  const settings = getCreatorStateSettings(activity);
  const objects = getCreatorStateObjects(activity);
  const lines = getCreatorStateLines(activity);

  function renderObject(object: PreviewObject) {
    const left = `${object.x}%`;
    const top = `${object.y}%`;

    if (object.type === "team1" || object.type === "team2") {
      const size = object.size ?? 30;
      const fallbackColor =
        object.type === "team1" ? settings.team1Color : settings.team2Color;
      const shouldShowNumber =
        settings.playerDisplayMode === "number" ||
        settings.playerDisplayMode === "both";
      const shouldShowName =
        settings.playerDisplayMode === "name" ||
        settings.playerDisplayMode === "both";
      const playerShape = object.playerShape ?? "circle";

      return (
        <div
          key={object.id}
          className="absolute z-20 flex flex-col items-center"
          style={{
            left,
            top,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="flex items-center justify-center border-2 border-black font-bold shadow-sm"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              fontSize: `${Math.max(10, size * 0.42)}px`,
              backgroundColor: object.fillColor || fallbackColor,
              color: object.textColor || settings.playerTextColor,
              borderRadius: playerShape === "square" ? "8px" : "9999px",
              clipPath:
                playerShape === "triangle"
                  ? "polygon(50% 0%, 100% 100%, 0% 100%)"
                  : playerShape === "diamond"
                    ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                    : undefined,
            }}
          >
            {shouldShowNumber ? object.label : ""}
          </div>

          {shouldShowName && object.playerName && (
            <div
              className="mt-1 max-w-[90px] rounded bg-white/85 px-1 text-center font-bold leading-tight text-slate-900 shadow-sm"
              style={{
                fontSize: `${Math.max(9, object.nameFontSize ?? size * 0.3)}px`,
              }}
            >
              {object.playerName}
            </div>
          )}
        </div>
      );
    }

    if (object.type === "cone") {
      const size = object.size ?? 17;

      return (
        <div
          key={object.id}
          className="absolute z-20 flex items-center justify-center rounded-full border-2 border-black"
          style={{
            left,
            top,
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: object.fillColor || settings.coneColor,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className="rounded-full bg-white"
            style={{ width: `${size * 0.35}px`, height: `${size * 0.35}px` }}
          />
        </div>
      );
    }

    if (object.type === "textBox") {
      const width = object.size ?? 120;
      const fontSize = object.fontSize ?? 20;

      return (
        <div
          key={object.id}
          className="absolute z-20 whitespace-pre-wrap break-words rounded-lg border border-slate-500/40 bg-white/70 px-2 py-1 text-center font-bold leading-tight shadow-sm"
          style={{
            left,
            top,
            width: `${width}px`,
            minHeight: `${Math.max(fontSize + 18, 44)}px`,
            transform: "translate(-50%, -50%)",
            color: object.textColor || "#111827",
            fontSize: `${fontSize}px`,
          }}
        >
          {object.textContent || "Text"}
        </div>
      );
    }

    const assetPath =
      object.type === "ball"
        ? PREVIEW_ASSETS.ball
        : object.type === "mannequin"
          ? PREVIEW_ASSETS.mannequin
          : object.type === "miniGoal"
            ? PREVIEW_ASSETS.miniGoal
            : object.type === "fullGoal"
              ? PREVIEW_ASSETS.fullGoal
              : "";

    if (!assetPath) {
      return null;
    }

    const width =
      object.size ??
      (object.type === "miniGoal" ? 45 : object.type === "fullGoal" ? 110 : 32);

    const height =
      object.type === "mannequin"
        ? width * 1.6
        : object.type === "miniGoal"
          ? width * 0.625
          : object.type === "fullGoal"
            ? width * 0.5
            : width;

    return (
      <img
        key={object.id}
        src={assetPath}
        alt=""
        draggable={false}
        className="absolute z-20 object-contain drop-shadow-sm"
        style={{
          left,
          top,
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(-50%, -50%) rotate(${object.rotation}deg)`,
        }}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative aspect-[3/4] h-[620px] max-h-full max-w-full overflow-hidden rounded-lg bg-white shadow-inner">
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pitch.offsetX}px, ${pitch.offsetY}px) rotate(${pitch.rotationDegrees}deg) scale(${pitch.zoom})`,
            transformOrigin: "center center",
          }}
        >
          <CodedPitchBackground background={pitch.background} />
        </div>

        <svg
          className="absolute inset-0 z-10 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {lines.map((line) => renderPreviewLine(line))}
        </svg>

        {objects.map((object) => renderObject(object))}
      </div>
    </div>
  );
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
  const [isCreatingCopy, setIsCreatingCopy] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);

  async function recordActivityOpen(activityIdToRecord: string) {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;

    if (!userId) {
      return;
    }

    recordRecentActivityOpen(userId, activityIdToRecord);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentProfile() {
      try {
        const profile = await getCurrentUserProfile();
        if (isMounted) {
          setCurrentProfile(profile ?? null);
        }
      } catch (error) {
        console.error("Unable to load current user permissions.", error);
        if (isMounted) {
          setCurrentProfile(null);
        }
      }
    }

    loadCurrentProfile();

    return () => {
      isMounted = false;
    };
  }, []);

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
          recordActivityOpen(supabaseActivity.id);
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

  async function handleCreateCopy() {
    if (!activity || activitySource !== "supabase") {
      return;
    }

    setDownloadMessage("");
    setShowDeleteConfirm(false);
    setActionMessage("");
    setIsCreatingCopy(true);

    try {
      const copiedActivity = await duplicateSupabaseActivity(activity.id);
      router.push(`/activity/${copiedActivity.id}/edit`);
    } catch (error) {
      console.error("Supabase activity copy failed.", error);
      setActionMessage("This activity could not be copied. Please try again.");
      setIsCreatingCopy(false);
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

  const canManageCurrentActivity =
    activitySource !== "supabase" || canManageActivity(activity, currentProfile);
  const showCreateCopy =
    activitySource === "supabase" &&
    Boolean(currentProfile) &&
    !isActivityOwner(activity, currentProfile);

  if (!hasLoaded) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100 text-slate-900">
          <AppHeader />

          <section className="mx-auto max-w-6xl px-8 py-10">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              Loading activity...
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  if (!activity) {
    return (
      <ProtectedPage>
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
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{activity.activityName}</h2>
              <p className="mt-2 text-slate-600">
                Open activity view with larger preview and full metadata.
              </p>
              <div className="mt-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {activity.creatorState
                    ? "Created with Activity Creator"
                    : "Imported PNG/PDF"}
                </span>
              </div>


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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Large Activity Preview
                  </h3>

                  {activity.hidden && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      Hidden — admin only
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {showCreateCopy && (
                    <button
                      type="button"
                      onClick={handleCreateCopy}
                      disabled={isCreatingCopy}
                      className="rounded-lg border border-[#0d2140] bg-white px-3 py-1.5 text-sm font-semibold text-[#0d2140] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreatingCopy ? "Creating Copy..." : "Create Copy"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-lg bg-[#0d2140] px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Download
                  </button>

                  {canManageCurrentActivity && (
                    <>
                      <Link
                        href={`/activity/${activity.id}/edit`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
                      >
                        {activity.creatorState ? "Edit Activity" : "Edit Metadata"}
                      </Link>

                      <button
                        type="button"
                        onClick={handleToggleHidden}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
                      >
                        {activity.hidden ? "Unhide" : "Hide"}
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteClick}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
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
                ) : activity.creatorState ? (
                  <CreatorStateActivityPreview activity={activity} />
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
                  <div className="mt-1 whitespace-pre-line break-words text-slate-600">
                    {activity.activityDetails || "—"}
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
                  <div className="font-semibold text-slate-700">
                    Created By
                  </div>
                  <div className="mt-1 text-slate-600">
                    {activity.createdBy}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </ProtectedPage>
  );
}