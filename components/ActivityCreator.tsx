"use client";

import { useMemo, useRef, useState } from "react";

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

type PitchObject = {
  id: string;
  type: Exclude<ToolType, "line" | "freehand" | "eraser">;
  x: number;
  y: number;
  label?: string;
  rotation: number;
};

type PitchLine = {
  id: string;
  points: { x: number; y: number }[];
  dashed: boolean;
  arrow: boolean;
};

const tools: { type: ToolType; label: string }[] = [
  { type: "team1", label: "Team 1" },
  { type: "team2", label: "Team 2" },
  { type: "cone", label: "Cone" },
  { type: "ball", label: "Ball" },
  { type: "mannequin", label: "Mannequin" },
  { type: "miniGoal", label: "Mini Goal" },
  { type: "fullGoal", label: "Goal" },
  { type: "line", label: "Line" },
  { type: "freehand", label: "Free Draw" },
  { type: "eraser", label: "Erase" },
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

export default function ActivityCreator() {
  const pitchRef = useRef<HTMLDivElement | null>(null);

  const [selectedTool, setSelectedTool] = useState<ToolType>("team1");
  const [objects, setObjects] = useState<PitchObject[]>([]);
  const [lines, setLines] = useState<PitchLine[]>([]);
  const [isDashed, setIsDashed] = useState(false);
  const [isArrow, setIsArrow] = useState(false);
  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null);
  const [activeLinePoints, setActiveLinePoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [message, setMessage] = useState("");

  const playerCount = useMemo(() => {
    return objects.filter(
      (object) => object.type === "team1" || object.type === "team2"
    ).length;
  }, [objects]);

  function getPitchPoint(event: React.PointerEvent) {
    const rect = pitchRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function addObject(type: PitchObject["type"]) {
    const nextPlayerNumber = playerCount + 1;

    const rowY =
      type === "team1" || type === "team2"
        ? 12
        : type === "cone"
          ? 20
          : type === "ball"
            ? 28
            : type === "mannequin"
              ? 36
              : 46;

    const similarObjects = objects.filter((object) => object.type === type);
    const nextX = clamp(10 + similarObjects.length * 7, 5, 95);

    const newObject: PitchObject = {
      id: makeId(),
      type,
      x: nextX,
      y: rowY,
      label:
        type === "team1" || type === "team2" ? String(nextPlayerNumber) : "",
      rotation: 0,
    };

    setObjects((currentObjects) => [...currentObjects, newObject]);
  }

  function handleToolClick(tool: ToolType) {
    setSelectedTool(tool);
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

  function handlePitchPointerDown(event: React.PointerEvent) {
    const point = getPitchPoint(event);

    if (selectedTool === "line" || selectedTool === "freehand") {
      setActiveLinePoints([point]);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (selectedTool === "eraser") {
      eraseNearestLine(point);
    }
  }

  function handlePitchPointerMove(event: React.PointerEvent) {
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

  function handlePitchPointerUp(event: React.PointerEvent) {
    if (draggingObjectId) {
      setDraggingObjectId(null);
      return;
    }

    if (
      (selectedTool === "line" || selectedTool === "freehand") &&
      activeLinePoints.length > 1
    ) {
      setLines((currentLines) => [
        ...currentLines,
        {
          id: makeId(),
          points: activeLinePoints,
          dashed: isDashed,
          arrow: isArrow,
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

    setLines((currentLines) =>
      currentLines.filter((line) => line.id !== lineToErase.id)
    );
  }

  function deleteObject(objectId: string) {
    setObjects((currentObjects) =>
      currentObjects.filter((object) => object.id !== objectId)
    );
  }

  function rotateObject(objectId: string) {
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

  function clearPitch() {
    setObjects([]);
    setLines([]);
    setActiveLinePoints([]);
    setMessage("Pitch cleared.");
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

    return (
      <g key={line.id}>
        <polyline
          points={points}
          fill="none"
          stroke={isPreview ? "#2563eb" : "#111827"}
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
            stroke={isPreview ? "#2563eb" : "#111827"}
            strokeWidth="0.55"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isPreview ? 0.75 : 1}
          />
        )}
      </g>
    );
  }

  function renderObject(object: PitchObject) {
    const commonStyle = {
      left: `${object.x}%`,
      top: `${object.y}%`,
      transform: `translate(-50%, -50%) rotate(${object.rotation}deg)`,
    };

    if (object.type === "team1" || object.type === "team2") {
      return (
        <button
          key={object.id}
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
            setDraggingObjectId(object.id);
          }}
          onDoubleClick={() => deleteObject(object.id)}
          className={`absolute z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-black text-sm font-bold text-white shadow-sm ${
            object.type === "team1" ? "bg-blue-600" : "bg-red-600"
          }`}
          style={commonStyle}
          title="Drag to move. Double-click to delete."
        >
          {object.label}
        </button>
      );
    }

    if (object.type === "cone") {
      return (
        <button
          key={object.id}
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
            setDraggingObjectId(object.id);
          }}
          onDoubleClick={() => deleteObject(object.id)}
          className="absolute z-20 h-7 w-7 rounded-full border-2 border-black bg-orange-500 shadow-sm"
          style={commonStyle}
          title="Drag to move. Double-click to delete."
        >
          <span className="absolute left-1/2 top-1/2 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </button>
      );
    }

    if (object.type === "ball") {
      return (
        <button
          key={object.id}
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
            setDraggingObjectId(object.id);
          }}
          onDoubleClick={() => deleteObject(object.id)}
          className="absolute z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-lg shadow-sm"
          style={commonStyle}
          title="Drag to move. Double-click to delete."
        >
          ⚽
        </button>
      );
    }

    if (object.type === "mannequin") {
      return (
        <button
          key={object.id}
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
            setDraggingObjectId(object.id);
          }}
          onDoubleClick={() => deleteObject(object.id)}
          className="absolute z-20 flex h-14 w-8 items-center justify-center rounded-t-full border-2 border-black bg-yellow-400 shadow-sm"
          style={commonStyle}
          title="Drag to move. Double-click to delete."
        >
          <span className="absolute bottom-1 h-3 w-6 rounded border-2 border-black bg-black" />
        </button>
      );
    }

    if (object.type === "miniGoal" || object.type === "fullGoal") {
      const widthClass = object.type === "miniGoal" ? "w-14" : "w-24";
      const heightClass = object.type === "miniGoal" ? "h-8" : "h-12";

      return (
        <div
          key={object.id}
          className="absolute z-20"
          style={commonStyle}
          title="Drag to move. Double-click goal to rotate."
        >
          <button
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation();
              setDraggingObjectId(object.id);
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              rotateObject(object.id);
            }}
            className={`${widthClass} ${heightClass} rounded-sm border-4 border-slate-700 bg-white/70 shadow-sm`}
          >
            <span className="block h-full w-full bg-[linear-gradient(45deg,transparent_45%,rgba(71,85,105,.35)_46%,rgba(71,85,105,.35)_54%,transparent_55%),linear-gradient(-45deg,transparent_45%,rgba(71,85,105,.35)_46%,rgba(71,85,105,.35)_54%,transparent_55%)] bg-[length:12px_12px]" />
          </button>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {tools.map((tool) => (
            <button
              key={tool.type}
              type="button"
              onClick={() => handleToolClick(tool.type)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                selectedTool === tool.type
                  ? "bg-[#0d2140] text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tool.label}
            </button>
          ))}

          <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />

          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isDashed}
              onChange={(event) => setIsDashed(event.target.checked)}
            />
            Dashed
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isArrow}
              onChange={(event) => setIsArrow(event.target.checked)}
            />
            Arrow
          </label>

          <button
            type="button"
            onClick={clearPitch}
            className="ml-auto rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Clear
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Click a tool to add it. Drag objects to move them. Double-click an
          object to delete it. Double-click a goal to rotate it. Select Line or
          Free Draw and drag on the pitch to draw. Select Erase and drag across
          a line to remove it.
        </p>

        {message && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {message}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl bg-white p-4 shadow-sm">
        <div
          ref={pitchRef}
          onPointerDown={handlePitchPointerDown}
          onPointerMove={handlePitchPointerMove}
          onPointerUp={handlePitchPointerUp}
          onPointerCancel={() => {
            setDraggingObjectId(null);
            setActiveLinePoints([]);
          }}
          className="relative mx-auto aspect-[68/105] max-h-[760px] w-full max-w-[720px] touch-none overflow-hidden rounded-xl border-4 border-slate-800 bg-green-600 shadow-inner"
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.06)_50%,transparent_50%)] bg-[length:14.285%_100%]" />

          <div className="absolute left-[5%] top-[3%] h-[94%] w-[90%] border-2 border-white" />
          <div className="absolute left-[5%] top-1/2 h-0 w-[90%] border-t-2 border-white" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />

          <div className="absolute left-[22%] top-[3%] h-[16%] w-[56%] border-x-2 border-b-2 border-white" />
          <div className="absolute left-[34%] top-[3%] h-[7%] w-[32%] border-x-2 border-b-2 border-white" />
          <div className="absolute left-[44%] top-[3%] h-[2%] w-[12%] border-x-2 border-b-2 border-white" />

          <div className="absolute bottom-[3%] left-[22%] h-[16%] w-[56%] border-x-2 border-t-2 border-white" />
          <div className="absolute bottom-[3%] left-[34%] h-[7%] w-[32%] border-x-2 border-t-2 border-white" />
          <div className="absolute bottom-[3%] left-[44%] h-[2%] w-[12%] border-x-2 border-t-2 border-white" />

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
                },
                true
              )}
          </svg>

          {objects.map((object) => renderObject(object))}
        </div>
      </section>
    </div>
  );
}