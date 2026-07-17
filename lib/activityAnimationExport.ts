"use client";

import { GIFEncoder, applyPalette, quantize } from "gifenc";
import type {
  Activity,
  ActivityCreatorColorObject,
  ActivityCreatorFrame,
  ActivityCreatorLine,
  ActivityCreatorObject,
  ActivityCreatorState,
} from "@/types/activity";
import { getActivityCreatorFrames } from "@/lib/activityCreatorFrames";

const WIDTH = 600;
const HEIGHT = 800;
const MIN_DURATION = 250;

const GIF_DURATION_MULTIPLIER = 0.18;
const GIF_MIN_FRAME_DELAY_MS = 30;
const GIF_FINAL_FRAME_HOLD_MS = 150;

const MP4_UPLOAD_WIDTH = 360;
const MP4_UPLOAD_HEIGHT = 480;
const MP4_JPEG_QUALITY = 0.70;
const ASSETS = {
  ball: "/activity-assets/soccer_ball.png",
  mannequin: "/activity-assets/mannequin.png",
  miniGoal: "/activity-assets/mini_goal.png",
  fullGoal: "/activity-assets/full_goal.png",
};

type Pitch = {
  background: "pitchGreen" | "pitchWhite" | "greenBlank" | "whiteBlank";
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotationDegrees: number;
};

type Settings = {
  team1Color: string;
  team2Color: string;
  coneColor: string;
  playerTextColor: string;
  playerDisplayMode: "number" | "name" | "both" | "none";
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function isColorObject(value: unknown): value is ActivityCreatorColorObject {
  return Boolean(
    value &&
      typeof value === "object" &&
      "red" in value &&
      "green" in value &&
      "blue" in value &&
      typeof value.red === "number" &&
      typeof value.green === "number" &&
      typeof value.blue === "number"
  );
}

function colorToCss(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (!isColorObject(value)) return fallback;

  return `rgba(${Math.round(clamp(value.red, 0, 1) * 255)}, ${Math.round(
    clamp(value.green, 0, 1) * 255
  )}, ${Math.round(clamp(value.blue, 0, 1) * 255)}, ${
    typeof value.opacity === "number" ? clamp(value.opacity, 0, 1) : 1
  })`;
}

function coordinate(value: number) {
  return Math.abs(value) <= 1 ? clamp(value * 100, 0, 100) : clamp(value, 0, 100);
}

function getPitch(state: ActivityCreatorState): Pitch {
  if ("pitch" in state) {
    return {
      background: state.pitch.background,
      zoom: state.pitch.zoom ?? 1,
      offsetX: state.pitch.offsetX ?? 0,
      offsetY: state.pitch.offsetY ?? 0,
      rotationDegrees: state.pitch.rotationDegrees ?? 0,
    };
  }

  return {
    background: state.selectedPitchBackground ?? "pitchGreen",
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotationDegrees: 0,
  };
}

function getSettings(state: ActivityCreatorState): Settings {
  const settings = state.settings;

  if ("team1DefaultColor" in settings) {
    return {
      team1Color: colorToCss(settings.team1DefaultColor, "#2563eb"),
      team2Color: colorToCss(settings.team2DefaultColor, "#dc2626"),
      coneColor: colorToCss(settings.coneDefaultColor, "#f97316"),
      playerTextColor: colorToCss(
        settings.playerTextDefaultColor,
        "#ffffff"
      ),
      playerDisplayMode:
        settings.playerDisplayMode === "name" ||
        settings.playerDisplayMode === "both" ||
        settings.playerDisplayMode === "none"
          ? settings.playerDisplayMode
          : "number",
    };
  }

  return {
    team1Color: settings.team1Color ?? "#2563eb",
    team2Color: settings.team2Color ?? "#dc2626",
    coneColor: settings.coneColor ?? "#f97316",
    playerTextColor: "#ffffff",
    playerDisplayMode:
      settings.playerDisplayMode === "name" ||
      settings.playerDisplayMode === "both" ||
      settings.playerDisplayMode === "none"
        ? settings.playerDisplayMode
        : "number",
  };
}

async function loadImage(source: string, cache: Map<string, HTMLImageElement>) {
  const cached = cache.get(source);
  if (cached) return cached;

  const image = new Image();
  image.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to load ${source}.`));
    image.src = source;
  });

  try {
    await image.decode?.();
  } catch {
    // Continue; the browser may still be able to draw it.
  }

  cache.set(source, image);
  return image;
}

function drawPitch(context: CanvasRenderingContext2D, pitch: Pitch) {
  context.save();
  context.translate(WIDTH / 2 + pitch.offsetX, HEIGHT / 2 + pitch.offsetY);
  context.rotate((pitch.rotationDegrees * Math.PI) / 180);
  context.scale(pitch.zoom, pitch.zoom);
  context.translate(-WIDTH / 2, -HEIGHT / 2);

  const isGreen =
    pitch.background === "pitchGreen" || pitch.background === "greenBlank";
  const isBlank =
    pitch.background === "greenBlank" || pitch.background === "whiteBlank";
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);

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
  context.fillRect(0, 0, WIDTH, HEIGHT);

  if (isGreen) {
    const stripeHeight = HEIGHT / 14;
    for (let index = 0; index < 14; index += 1) {
      context.fillStyle =
        index % 2 === 0
          ? "rgba(255,255,255,0.08)"
          : "rgba(0,0,0,0.08)";
      context.fillRect(0, index * stripeHeight, WIDTH, stripeHeight);
    }
  }

  if (!isBlank) {
    const x = (value: number) => (value / 100) * WIDTH;
    const y = (value: number) => (value / 133.333333) * HEIGHT;
    const lineColor = isGreen ? "#ffffff" : "#111827";

    context.strokeStyle = lineColor;
    context.fillStyle = lineColor;
    context.lineWidth = Math.max(2, Math.min(WIDTH, HEIGHT) * 0.0045);
    context.lineCap = "round";
    context.lineJoin = "round";

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

    const arcRadius = x(8.5);
    const lineDistance = Math.abs(y(25.333333) - y(18.666667));
    const arcCut = Math.asin(
      Math.min(1, Math.max(-1, lineDistance / Math.max(arcRadius, 1)))
    );

    context.beginPath();
    context.arc(x(50), y(18.666667), arcRadius, arcCut, Math.PI - arcCut);
    context.stroke();
    context.beginPath();
    context.arc(
      x(50),
      y(114.666667),
      arcRadius,
      Math.PI + arcCut,
      Math.PI * 2 - arcCut
    );
    context.stroke();

    const corner = x(2.8);
    for (const [cx, cy, start, end] of [
      [8, 6, 0, Math.PI / 2],
      [92, 6, Math.PI / 2, Math.PI],
      [8, 127.333333, 1.5 * Math.PI, 2 * Math.PI],
      [92, 127.333333, Math.PI, 1.5 * Math.PI],
    ] as const) {
      context.beginPath();
      context.arc(x(cx), y(cy), corner, start, end);
      context.stroke();
    }

    const dotRadius = Math.max(2, Math.min(WIDTH, HEIGHT) * 0.0048);
    for (const [cx, cy] of [
      [50, 66.666667],
      [50, 18.666667],
      [50, 114.666667],
    ] as const) {
      context.beginPath();
      context.arc(x(cx), y(cy), dotRadius, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.restore();
}

function dribblePoints(points: { x: number; y: number }[]) {
  if (points.length < 2) return points;

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
    const steps = Math.max(1, Math.ceil(length / 0.45));

    for (let step = 0; step <= steps; step += 1) {
      if (index > 0 && step === 0) continue;
      const t = step / steps;
      const distance = travelled + length * t;
      const offset = Math.sin((distance / 4.2) * Math.PI * 2) * 1.15;
      output.push({
        x: start.x + dx * t + normalX * offset,
        y: start.y + dy * t + normalY * offset,
      });
    }

    travelled += length;
  }

  return output;
}

function drawLine(context: CanvasRenderingContext2D, line: ActivityCreatorLine) {
  const points = line.points.map((point) => ({
    x: coordinate(point.x),
    y: coordinate(point.y),
  }));
  if (points.length < 2) return;

  const lineStyle = line.lineStyle === "dribble" ? "dribble" : "standard";
  const rendered = lineStyle === "dribble" ? dribblePoints(points) : points;
  const lineWidth = Math.max(1, line.lineWidth ?? 4) * (WIDTH / 1000);

  context.save();
  context.strokeStyle = colorToCss(line.color, "#111827");
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (lineStyle !== "dribble" && Boolean(line.dashed ?? line.isDashed)) {
    context.setLineDash([lineWidth * 2.5, lineWidth * 2]);
  }

  context.beginPath();
  rendered.forEach((point, index) => {
    const x = (point.x / 100) * WIDTH;
    const y = (point.y / 100) * HEIGHT;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  if (lineStyle === "dribble" || Boolean(line.arrow ?? line.isArrow)) {
    const end = rendered[rendered.length - 1];
    const directionStart =
      lineStyle === "dribble" ? points[0] : rendered[rendered.length - 2];
    const underlyingEnd = points[points.length - 1];
    const angle = Math.atan2(
      underlyingEnd.y - directionStart.y,
      underlyingEnd.x - directionStart.x
    );
    const endX = (end.x / 100) * WIDTH;
    const endY = (end.y / 100) * HEIGHT;
    const extension = lineStyle === "dribble" ? WIDTH * 0.036 : 0;
    const tipX = endX + extension * Math.cos(angle);
    const tipY = endY + extension * Math.sin(angle);
    const arrowLength = WIDTH * 0.03;
    const arrowAngle = Math.PI / 6;

    context.beginPath();
    if (lineStyle === "dribble") {
      context.moveTo(endX, endY);
      context.lineTo(tipX, tipY);
    }
    context.moveTo(
      tipX - arrowLength * Math.cos(angle - arrowAngle),
      tipY - arrowLength * Math.sin(angle - arrowAngle)
    );
    context.lineTo(tipX, tipY);
    context.lineTo(
      tipX - arrowLength * Math.cos(angle + arrowAngle),
      tipY - arrowLength * Math.sin(angle + arrowAngle)
    );
    context.stroke();
  }

  context.restore();
}

function objectSize(object: ActivityCreatorObject) {
  const fallback =
    object.type === "miniGoal"
      ? 64
      : object.type === "fullGoal"
        ? 112
        : object.type === "mannequin"
          ? 44
          : object.type === "ball"
            ? 32
            : object.type === "cone"
              ? 17
              : object.type === "textBox"
                ? 120
                : 30;

  return (object.size ?? fallback) * (WIDTH / 1000);
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  object: ActivityCreatorObject,
  settings: Settings
) {
  const size = objectSize(object);
  const x = (coordinate(object.x) / 100) * WIDTH;
  const y = (coordinate(object.y) / 100) * HEIGHT;
  const fallback =
    object.type === "team1" ? settings.team1Color : settings.team2Color;
  const shape = object.playerShape ?? "circle";

  context.save();
  context.beginPath();

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

  context.fillStyle = colorToCss(object.fillColor, fallback);
  context.fill();
  context.strokeStyle = "#000000";
  context.lineWidth = Math.max(1.5, WIDTH * 0.0025);
  context.stroke();

  const number = object.label ?? object.number ?? "";
  const name = (object.playerName ?? object.name ?? "").trim();
  const showNumber =
    settings.playerDisplayMode === "number" ||
    settings.playerDisplayMode === "both";
  const showName =
    settings.playerDisplayMode === "name" ||
    settings.playerDisplayMode === "both";

  if (showNumber && number) {
    context.fillStyle = colorToCss(
      object.textColor,
      settings.playerTextColor
    );
    context.font = `700 ${Math.max(10, size * 0.42)}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(number, x, y);
  }

  if (showName && name) {
    const fontSize =
      (object.nameFontSize ?? Math.max(9, (object.size ?? 30) * 0.3)) *
      (WIDTH / 1000);
    context.font = `700 ${fontSize}px Arial`;
    const metrics = context.measureText(name);
    const labelWidth = metrics.width + 8;
    const labelHeight = fontSize + 6;
    const labelY = y + size / 2 + 4;

    context.fillStyle = "rgba(255,255,255,0.88)";
    context.fillRect(x - labelWidth / 2, labelY, labelWidth, labelHeight);
    context.fillStyle = "#0f172a";
    context.fillText(name, x, labelY + labelHeight / 2);
  }

  context.restore();
}

function drawCone(
  context: CanvasRenderingContext2D,
  object: ActivityCreatorObject,
  settings: Settings
) {
  const size = objectSize(object);
  const x = (coordinate(object.x) / 100) * WIDTH;
  const y = (coordinate(object.y) / 100) * HEIGHT;

  context.save();
  context.beginPath();
  context.arc(x, y, size / 2, 0, Math.PI * 2);
  context.fillStyle = colorToCss(object.fillColor, settings.coneColor);
  context.fill();
  context.strokeStyle = "#000000";
  context.lineWidth = Math.max(1.5, WIDTH * 0.0025);
  context.stroke();
  context.beginPath();
  context.arc(x, y, size * 0.175, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();
  context.restore();
}

function drawTextBox(
  context: CanvasRenderingContext2D,
  object: ActivityCreatorObject
) {
  const boxWidth = objectSize(object);
  const x = (coordinate(object.x) / 100) * WIDTH;
  const y = (coordinate(object.y) / 100) * HEIGHT;
  const fontSize = Math.max(10, object.fontSize ?? 20) * (WIDTH / 1000);
  const lineHeight = fontSize * 1.22;
  const rawText = object.textContent?.trim() || "Text";
  const maxTextWidth = Math.max(boxWidth - 18, 40);
  const lines: string[] = [];

  context.save();
  context.font = `700 ${fontSize}px Arial`;

  for (const paragraph of rawText.replace(/\r\n/g, "\n").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (context.measureText(next).width <= maxTextWidth || !current) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  const widest = lines.reduce(
    (max, line) => Math.max(max, context.measureText(line).width),
    0
  );
  const finalWidth = Math.max(boxWidth, widest + 18);
  const finalHeight = Math.max(lineHeight * lines.length + 16, fontSize + 16);

  context.fillStyle = "rgba(255,255,255,0.72)";
  context.fillRect(x - finalWidth / 2, y - finalHeight / 2, finalWidth, finalHeight);
  context.strokeStyle = "rgba(15,23,42,0.35)";
  context.lineWidth = Math.max(1, WIDTH * 0.001);
  context.strokeRect(
    x - finalWidth / 2,
    y - finalHeight / 2,
    finalWidth,
    finalHeight
  );

  context.fillStyle = colorToCss(object.textColor, "#111827");
  context.textAlign = "center";
  context.textBaseline = "middle";
  const firstY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) =>
    context.fillText(line, x, firstY + index * lineHeight)
  );
  context.restore();
}

async function drawAsset(
  context: CanvasRenderingContext2D,
  object: ActivityCreatorObject,
  cache: Map<string, HTMLImageElement>
) {
  const source =
    object.type === "ball"
      ? ASSETS.ball
      : object.type === "mannequin"
        ? ASSETS.mannequin
        : object.type === "miniGoal"
          ? ASSETS.miniGoal
          : object.type === "fullGoal"
            ? ASSETS.fullGoal
            : "";

  if (!source) return;

  const image = await loadImage(source, cache);
  const width = objectSize(object);
  const height =
    object.type === "mannequin"
      ? width * 1.6
      : object.type === "miniGoal"
        ? width * 0.625
        : object.type === "fullGoal"
          ? width * 0.5
          : width;
  const x = (coordinate(object.x) / 100) * WIDTH;
  const y = (coordinate(object.y) / 100) * HEIGHT;
  const rotation = object.rotationDegrees ?? object.rotation ?? 0;

  context.save();
  context.translate(x, y);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
}

async function renderFrame(
  activity: Activity,
  frame: ActivityCreatorFrame,
  cache: Map<string, HTMLImageElement>
) {
  if (!activity.creatorState) {
    throw new Error("This activity does not contain animation data.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("The browser could not create an animation canvas.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  drawPitch(context, getPitch(activity.creatorState));

  frame.lines.forEach((line) => drawLine(context, line));

  const settings = getSettings(activity.creatorState);
  for (const object of frame.objects) {
    if (object.type === "team1" || object.type === "team2") {
      drawPlayer(context, object, settings);
    } else if (object.type === "cone") {
      drawCone(context, object, settings);
    } else if (object.type === "textBox") {
      drawTextBox(context, object);
    } else {
      await drawAsset(context, object, cache);
    }
  }

  return canvas;
}

function interpolateNumber(
  fromValue: number | undefined,
  toValue: number | undefined,
  progress: number
) {
  const from = typeof fromValue === "number" ? fromValue : toValue ?? 0;
  const to = typeof toValue === "number" ? toValue : from;
  return from + (to - from) * progress;
}

function interpolateOptionalNumber(
  fromValue: number | undefined,
  toValue: number | undefined,
  progress: number
) {
  if (typeof fromValue !== "number" && typeof toValue !== "number") {
    return undefined;
  }

  return interpolateNumber(fromValue, toValue, progress);
}

function interpolateFrame(
  fromFrame: ActivityCreatorFrame,
  toFrame: ActivityCreatorFrame,
  progress: number
): ActivityCreatorFrame {
  const previousObjects = new Map(
    fromFrame.objects.map((object) => [object.id, object])
  );
  const previousLines = new Map(
    fromFrame.lines.map((line) => [line.id, line])
  );

  return {
    ...toFrame,
    objects: toFrame.objects.map((object) => {
      const previous = previousObjects.get(object.id);
      if (!previous) return object;

      return {
        ...object,
        x: interpolateNumber(previous.x, object.x, progress),
        y: interpolateNumber(previous.y, object.y, progress),
        size: interpolateOptionalNumber(previous.size, object.size, progress),
        rotation: interpolateNumber(
          previous.rotation ?? previous.rotationDegrees,
          object.rotation ?? object.rotationDegrees,
          progress
        ),
        rotationDegrees: interpolateNumber(
          previous.rotationDegrees ?? previous.rotation,
          object.rotationDegrees ?? object.rotation,
          progress
        ),
        fontSize: interpolateOptionalNumber(previous.fontSize, object.fontSize, progress),
        nameFontSize: interpolateOptionalNumber(
          previous.nameFontSize,
          object.nameFontSize,
          progress
        ),
      };
    }),
    lines: toFrame.lines.map((line) => {
      const previous = previousLines.get(line.id);
      if (!previous || previous.points.length !== line.points.length) {
        return line;
      }

      return {
        ...line,
        lineWidth: interpolateOptionalNumber(
          previous.lineWidth,
          line.lineWidth,
          progress
        ),
        points: line.points.map((point, index) => ({
          x: interpolateNumber(previous.points[index]?.x, point.x, progress),
          y: interpolateNumber(previous.points[index]?.y, point.y, progress),
        })),
      };
    }),
  };
}

function getAnimationRenderSteps(frames: ActivityCreatorFrame[]) {
  const steps: { frame: ActivityCreatorFrame; durationMs: number }[] = [];
  const firstFrame = frames[0];

  steps.push({
    frame: firstFrame,
    durationMs: Math.max(MIN_DURATION, firstFrame.durationMs ?? 1500),
  });

  for (let frameIndex = 1; frameIndex < frames.length; frameIndex += 1) {
    const previousFrame = frames[frameIndex - 1];
    const targetFrame = frames[frameIndex];
    const transitionDuration = Math.max(
      MIN_DURATION,
      targetFrame.durationMs ?? 1500
    );
    const sampleCount = clamp(Math.round(transitionDuration / 100), 3, 30);
    const sampleDuration = transitionDuration / sampleCount;

    for (let sampleIndex = 1; sampleIndex <= sampleCount; sampleIndex += 1) {
      steps.push({
        frame: interpolateFrame(
          previousFrame,
          targetFrame,
          sampleIndex / sampleCount
        ),
        durationMs: sampleDuration,
      });
    }
  }

  return steps;
}

async function renderFrames(activity: Activity) {
  const frames = getActivityCreatorFrames(activity.creatorState);
  if (frames.length < 2) {
    throw new Error("This activity does not contain an animation.");
  }

  const cache = new Map<string, HTMLImageElement>();
  const output: { canvas: HTMLCanvasElement; durationMs: number }[] = [];

  for (const step of getAnimationRenderSteps(frames)) {
    output.push({
      canvas: await renderFrame(activity, step.frame, cache),
      durationMs: step.durationMs,
    });
  }

  return output;
}

type RenderedAnimationFrame = {
  canvas: HTMLCanvasElement;
  durationMs: number;
};

function distributeSamplesByDuration(
  durationsMs: number[],
  remainingSamples: number
) {
  const allocations = new Array(durationsMs.length).fill(0);

  if (remainingSamples <= 0 || durationsMs.length === 0) {
    return allocations;
  }

  const totalDuration = durationsMs.reduce(
    (sum, duration) => sum + Math.max(1, duration),
    0
  );

  const rawAllocations = durationsMs.map((duration) => {
    const exact =
      (Math.max(1, duration) / Math.max(1, totalDuration)) *
      remainingSamples;

    return {
      base: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let allocated = 0;

  rawAllocations.forEach((allocation, index) => {
    allocations[index] = allocation.base;
    allocated += allocation.base;
  });

  const order = rawAllocations
    .map((allocation, index) => ({
      index,
      remainder: allocation.remainder,
    }))
    .sort((a, b) => b.remainder - a.remainder);

  let cursor = 0;

  while (allocated < remainingSamples && order.length > 0) {
    allocations[order[cursor % order.length].index] += 1;
    allocated += 1;
    cursor += 1;
  }

  return allocations;
}

function getAdaptiveMp4RenderSteps(
  frames: ActivityCreatorFrame[],
  maxOutputFrames = 60,
  minimumSamplesPerTransition = 3
) {
  if (frames.length < 2) {
    return getAnimationRenderSteps(frames);
  }

  const transitionCount = frames.length - 1;
  const safeMinimumSamples = Math.max(1, minimumSamplesPerTransition);
  const requiredMinimum =
    1 + transitionCount * safeMinimumSamples;

  // If there are so many user-created frames that the preferred minimum
  // cannot fit inside the endpoint limit, preserve every transition with
  // at least one sample and distribute the rest by duration.
  const baseSamplesPerTransition =
    requiredMinimum <= maxOutputFrames
      ? safeMinimumSamples
      : 1;

  const baseFrameCount =
    1 + transitionCount * baseSamplesPerTransition;

  const transitionDurations = frames.slice(1).map((frame) =>
    Math.max(MIN_DURATION, frame.durationMs ?? 1500)
  );

  const extraSamples = distributeSamplesByDuration(
    transitionDurations,
    Math.max(0, maxOutputFrames - baseFrameCount)
  );

  const steps: {
    frame: ActivityCreatorFrame;
    durationMs: number;
  }[] = [
    {
      frame: frames[0],
      durationMs: Math.max(
        MIN_DURATION,
        frames[0].durationMs ?? 1500
      ),
    },
  ];

  for (
    let transitionIndex = 0;
    transitionIndex < transitionCount;
    transitionIndex += 1
  ) {
    const previousFrame = frames[transitionIndex];
    const targetFrame = frames[transitionIndex + 1];
    const transitionDuration =
      transitionDurations[transitionIndex];

    const sampleCount =
      baseSamplesPerTransition +
      (extraSamples[transitionIndex] ?? 0);

    const sampleDuration =
      transitionDuration / Math.max(1, sampleCount);

    for (
      let sampleIndex = 1;
      sampleIndex <= sampleCount;
      sampleIndex += 1
    ) {
      steps.push({
        frame: interpolateFrame(
          previousFrame,
          targetFrame,
          sampleIndex / sampleCount
        ),
        durationMs: sampleDuration,
      });
    }
  }

  return steps.slice(0, maxOutputFrames);
}

async function renderMp4Frames(activity: Activity) {
  const frames = getActivityCreatorFrames(activity.creatorState);

  if (frames.length < 2) {
    throw new Error("This activity does not contain an animation.");
  }

  const cache = new Map<string, HTMLImageElement>();
  const output: RenderedAnimationFrame[] = [];

  for (const step of getAdaptiveMp4RenderSteps(frames)) {
    output.push({
      canvas: await renderFrame(activity, step.frame, cache),
      durationMs: step.durationMs,
    });
  }

  return output;
}

function canvasToCompressedMp4Frame(canvas: HTMLCanvasElement) {
  const compressedCanvas = document.createElement("canvas");
  compressedCanvas.width = MP4_UPLOAD_WIDTH;
  compressedCanvas.height = MP4_UPLOAD_HEIGHT;

  const context = compressedCanvas.getContext("2d");
  if (!context) {
    throw new Error("The browser could not prepare the MP4 frame.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, MP4_UPLOAD_WIDTH, MP4_UPLOAD_HEIGHT);
  context.drawImage(
    canvas,
    0,
    0,
    MP4_UPLOAD_WIDTH,
    MP4_UPLOAD_HEIGHT
  );

  return compressedCanvas.toDataURL(
    "image/jpeg",
    MP4_JPEG_QUALITY
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function getGifFrameDelayMs(
  durationMs: number,
  isFinalFrame: boolean
) {
  if (isFinalFrame) {
    return GIF_FINAL_FRAME_HOLD_MS;
  }

  return Math.max(
    GIF_MIN_FRAME_DELAY_MS,
    Math.round(durationMs * GIF_DURATION_MULTIPLIER)
  );
}

export async function downloadActivityAnimationAsGif(activity: Activity) {
  const frames = await renderFrames(activity);
  const gif = GIFEncoder();

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const context = frame.canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("The GIF frame could not be read.");

    const imageData = context.getImageData(0, 0, WIDTH, HEIGHT);
    const palette = quantize(imageData.data, 256);
    const indexed = applyPalette(imageData.data, palette);
    gif.writeFrame(indexed, WIDTH, HEIGHT, {
      palette,
      delay: getGifFrameDelayMs(
        frame.durationMs,
        index === frames.length - 1
      ),
    });
  }

  gif.finish();
  const name = sanitizeFileName(activity.activityName || "activity") || "activity";
  downloadBlob(new Blob([new Uint8Array(gif.bytes())], { type: "image/gif" }), `${name}_animation.gif`);
}

export async function downloadActivityAnimationAsMp4(activity: Activity) {
  const rendered = await renderMp4Frames(activity);
  const response = await fetch("/api/animation/mp4", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      frames: rendered.map((frame) =>
        canvasToCompressedMp4Frame(frame.canvas)
      ),
      durationsMs: rendered.map((frame) => frame.durationMs),
      activityName: activity.activityName,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error || "The MP4 animation could not be created.");
  }

  const name = sanitizeFileName(activity.activityName || "activity") || "activity";
  downloadBlob(await response.blob(), `${name}_animation.mp4`);
}
