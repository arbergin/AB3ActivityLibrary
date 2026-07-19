import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegStaticPath from "ffmpeg-static";

export const runtime = "nodejs";
export const maxDuration = 60;

type Mp4RequestBody = {
  frames?: string[];
  durationsMs?: number[];
  activityName?: string;
  speedMultiplier?: number;
};

const MP4_DURATION_MULTIPLIER = 0.08;
const MIN_FRAME_SECONDS = 0.05;
const MAX_FRAME_SECONDS = 2.5;
const FINAL_FRAME_HOLD_SECONDS = 0.12;

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(
    /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/
  );

  if (!match) {
    throw new Error("One or more animation frames are invalid.");
  }

  const format = match[1] === "jpg" ? "jpeg" : match[1];
  const extension =
    format === "jpeg" ? "jpg" : format === "webp" ? "webp" : "png";

  return {
    buffer: Buffer.from(match[2], "base64"),
    extension,
  };
}

function escapeConcatPath(filePath: string) {
  return filePath.replace(/'/g, "'\\''");
}

function resolveFfmpegPath() {
  const possiblePaths = [
    process.env.FFMPEG_PATH,
    ffmpegStaticPath,
    path.join(
      process.cwd(),
      "node_modules",
      "ffmpeg-static",
      process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
    ),
  ].filter((value): value is string => Boolean(value));

  const resolvedPath = possiblePaths.find((candidate) => existsSync(candidate));

  if (!resolvedPath) {
    throw new Error(
      `FFmpeg could not be found. Checked: ${possiblePaths.join(", ")}`
    );
  }

  return resolvedPath;
}

function normalizeSpeedMultiplier(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(3, Math.max(0.25, value));
}

function getMp4FrameDurationSeconds(
  durationMs: number,
  isFinalFrame: boolean,
  speedMultiplier: number
) {
  const normalizedSpeed = normalizeSpeedMultiplier(speedMultiplier);

  if (isFinalFrame) {
    return Math.max(
      MIN_FRAME_SECONDS,
      FINAL_FRAME_HOLD_SECONDS / normalizedSpeed
    );
  }

  const adjustedSeconds =
    ((Math.max(250, durationMs) / 1000) * MP4_DURATION_MULTIPLIER) /
    normalizedSpeed;

  return Math.min(
    MAX_FRAME_SECONDS,
    Math.max(MIN_FRAME_SECONDS, adjustedSeconds)
  );
}

async function runFfmpeg(args: string[]) {
  const resolvedFfmpegPath = resolveFfmpegPath();

  await new Promise<void>((resolve, reject) => {
    const ffmpegProcess = spawn(resolvedFfmpegPath, args);
    let stderr = "";

    ffmpegProcess.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    ffmpegProcess.on("error", reject);

    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          stderr.trim() || `FFmpeg exited with status ${String(code)}.`
        )
      );
    });
  });
}

export async function POST(request: Request) {
  let workDirectory = "";

  try {
    const body = (await request.json()) as Mp4RequestBody;
    const frames = Array.isArray(body.frames) ? body.frames : [];
    const durationsMs = Array.isArray(body.durationsMs)
      ? body.durationsMs
      : [];
    const speedMultiplier = normalizeSpeedMultiplier(body.speedMultiplier);

    if (frames.length < 2 || frames.length > 60) {
      return NextResponse.json(
        {
          error:
            "An MP4 export requires between 2 and 60 animation frames.",
        },
        { status: 400 }
      );
    }

    if (durationsMs.length !== frames.length) {
      return NextResponse.json(
        {
          error: "Animation frame durations are missing or invalid.",
        },
        { status: 400 }
      );
    }

    workDirectory = await mkdtemp(
      path.join(tmpdir(), "ab3-animation-")
    );

    const framePaths: string[] = [];

    for (let index = 0; index < frames.length; index += 1) {
      const parsedFrame = parseImageDataUrl(frames[index]);
      const framePath = path.join(
        workDirectory,
        `frame-${String(index).padStart(3, "0")}.${parsedFrame.extension}`
      );

      await writeFile(framePath, parsedFrame.buffer);
      framePaths.push(framePath);
    }

    const concatLines: string[] = [];

    framePaths.forEach((framePath, index) => {
      const isFinalFrame = index === framePaths.length - 1;
      const frameDuration = getMp4FrameDurationSeconds(
        durationsMs[index],
        isFinalFrame,
        speedMultiplier
      );

      concatLines.push(`file '${escapeConcatPath(framePath)}'`);
      concatLines.push(`duration ${frameDuration.toFixed(3)}`);
    });

    concatLines.push(
      `file '${escapeConcatPath(framePaths[framePaths.length - 1])}'`
    );

    const concatPath = path.join(workDirectory, "frames.txt");
    const outputPath = path.join(workDirectory, "animation.mp4");

    await writeFile(concatPath, concatLines.join("\n"), "utf8");

    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatPath,
      "-vf",
      "scale=600:800:flags=lanczos,format=yuv420p",
      "-vsync",
      "vfr",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    const output = await readFile(outputPath);
    const fileNameBase =
      sanitizeFileName(body.activityName || "activity") || "activity";

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${fileNameBase}_animation.mp4"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("MP4 animation export failed.", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "The MP4 animation could not be created.",
      },
      { status: 500 }
    );
  } finally {
    if (workDirectory) {
      await rm(workDirectory, {
        recursive: true,
        force: true,
      }).catch(() => {});
    }
  }
}
