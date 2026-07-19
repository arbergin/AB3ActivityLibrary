"use client";

import { useEffect, useRef, useState } from "react";
import type { Activity } from "@/types/activity";
import { getActivityCreatorFrameCount } from "@/lib/activityCreatorFrames";
import {
  downloadActivityAnimationAsGif,
  downloadActivityAnimationAsMp4,
} from "@/lib/activityAnimationExport";
import { downloadActivityAsPdf } from "@/lib/downloadActivityPdf";

type Props = {
  activity: Activity;
  onMessage?: (message: string) => void;
  className?: string;
};

type ExportType = "pdf-full" | "pdf-half" | "pdf-quarter" | "gif" | "mp4";
type AnimationExportType = Extract<ExportType, "gif" | "mp4">;

const MIN_SPEED_MULTIPLIER = 0.25;
const MAX_SPEED_MULTIPLIER = 3;
const DEFAULT_SPEED_MULTIPLIER = 1;
const SLIDER_MIN = -100;
const SLIDER_MAX = 100;
const SLIDER_STEP = 1;

function sliderValueToSpeedMultiplier(sliderValue: number) {
  if (sliderValue <= 0) {
    const progress = (sliderValue - SLIDER_MIN) / (0 - SLIDER_MIN);

    return (
      MIN_SPEED_MULTIPLIER +
      progress * (DEFAULT_SPEED_MULTIPLIER - MIN_SPEED_MULTIPLIER)
    );
  }

  const progress = sliderValue / SLIDER_MAX;

  return (
    DEFAULT_SPEED_MULTIPLIER +
    progress * (MAX_SPEED_MULTIPLIER - DEFAULT_SPEED_MULTIPLIER)
  );
}

function speedMultiplierToSliderValue(speedMultiplier: number) {
  if (speedMultiplier <= DEFAULT_SPEED_MULTIPLIER) {
    const progress =
      (speedMultiplier - MIN_SPEED_MULTIPLIER) /
      (DEFAULT_SPEED_MULTIPLIER - MIN_SPEED_MULTIPLIER);

    return SLIDER_MIN + progress * (0 - SLIDER_MIN);
  }

  const progress =
    (speedMultiplier - DEFAULT_SPEED_MULTIPLIER) /
    (MAX_SPEED_MULTIPLIER - DEFAULT_SPEED_MULTIPLIER);

  return progress * SLIDER_MAX;
}

function formatSpeedMultiplier(value: number) {
  return `${value.toFixed(2)}×`;
}

export default function ActivityDownloadButton({
  activity,
  onMessage,
  className = "",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeExport, setActiveExport] = useState<ExportType | null>(null);
  const [pendingAnimationExport, setPendingAnimationExport] =
    useState<AnimationExportType | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(
    DEFAULT_SPEED_MULTIPLIER
  );
  const menuRef = useRef<HTMLDivElement | null>(null);
  const hasAnimation = getActivityCreatorFrameCount(activity.creatorState) > 1;

  useEffect(() => {
    function closeFromOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (pendingAnimationExport) {
          setPendingAnimationExport(null);
          setSpeedMultiplier(DEFAULT_SPEED_MULTIPLIER);
          return;
        }

        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeFromOutside);
    window.addEventListener("keydown", closeFromEscape);

    return () => {
      document.removeEventListener("mousedown", closeFromOutside);
      window.removeEventListener("keydown", closeFromEscape);
    };
  }, [pendingAnimationExport]);

  useEffect(() => {
    if (!pendingAnimationExport) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingAnimationExport]);

  function openAnimationExport(type: AnimationExportType) {
    if (activeExport) return;

    setIsOpen(false);
    setSpeedMultiplier(DEFAULT_SPEED_MULTIPLIER);
    setPendingAnimationExport(type);
    onMessage?.("");
  }

  function closeAnimationExport() {
    if (activeExport) return;

    setPendingAnimationExport(null);
    setSpeedMultiplier(DEFAULT_SPEED_MULTIPLIER);
  }

  async function runExport(
    type: ExportType,
    animationSpeedMultiplier = DEFAULT_SPEED_MULTIPLIER
  ) {
    if (activeExport) return;

    setActiveExport(type);
    setIsOpen(false);
    onMessage?.("");

    try {
      if (type === "pdf-full") {
        await downloadActivityAsPdf(activity, "full-page");
        onMessage?.("Full-page PDF export download started.");
      } else if (type === "pdf-half") {
        await downloadActivityAsPdf(activity, "half-page");
        onMessage?.("Half-page PDF export download started.");
      } else if (type === "pdf-quarter") {
        await downloadActivityAsPdf(activity, "quarter-page");
        onMessage?.("Quarter-page PDF export download started.");
      } else if (type === "gif") {
        await downloadActivityAnimationAsGif(
          activity,
          animationSpeedMultiplier
        );
        onMessage?.("GIF animation download started.");
      } else {
        await downloadActivityAnimationAsMp4(
          activity,
          animationSpeedMultiplier
        );
        onMessage?.("MP4 animation download started.");
      }

      if (type === "gif" || type === "mp4") {
        setPendingAnimationExport(null);
        setSpeedMultiplier(DEFAULT_SPEED_MULTIPLIER);
      }
    } catch (error) {
      console.error(`${type.toUpperCase()} export failed.`, error);

      const fallback =
        type === "pdf-full" ||
        type === "pdf-half" ||
        type === "pdf-quarter"
          ? "The PDF export could not be created."
          : type === "gif"
            ? "The GIF animation could not be created."
            : "The MP4 animation could not be created.";

      onMessage?.(
        error instanceof Error && error.message.trim()
          ? error.message
          : fallback
      );
    } finally {
      setActiveExport(null);
    }
  }

  const exportLabel =
    activeExport === "pdf-full"
      ? "Preparing Full PDF..."
      : activeExport === "pdf-half"
        ? "Preparing Half PDF..."
        : activeExport === "pdf-quarter"
          ? "Preparing Quarter PDF..."
          : activeExport === "gif"
            ? "Preparing GIF..."
            : activeExport === "mp4"
              ? "Preparing MP4..."
              : "Download";

  const exportOptions: { type: ExportType; label: string }[] = [
    {
      type: "pdf-full",
      label: "PDF Export - Full Page",
    },
    {
      type: "pdf-half",
      label: "PDF Export - Half Page",
    },
    {
      type: "pdf-quarter",
      label: "PDF Export - Quarter Page",
    },
    ...(hasAnimation
      ? [
          { type: "gif" as const, label: "Download GIF" },
          { type: "mp4" as const, label: "Download MP4" },
        ]
      : []),
  ];

  const buttonClass =
    "rounded-lg bg-[#0d2140] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#17345f] disabled:cursor-not-allowed disabled:opacity-60";

  const animationExportLabel =
    pendingAnimationExport === "gif" ? "GIF" : "MP4";

  return (
    <>
      <div ref={menuRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          disabled={Boolean(activeExport)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={`${buttonClass} inline-flex items-center gap-2`}
        >
          <span>{exportLabel}</span>
          <span aria-hidden="true">▾</span>
        </button>

        {isOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 min-w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
          >
            {exportOptions.map((option) => (
              <button
                key={option.type}
                type="button"
                role="menuitem"
                onClick={() => {
                  if (option.type === "gif" || option.type === "mp4") {
                    openAnimationExport(option.type);
                    return;
                  }

                  void runExport(option.type);
                }}
                className="block w-full px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {pendingAnimationExport && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="animation-export-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAnimationExport();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="animation-export-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Export {animationExportLabel}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Adjust how quickly the animation plays before exporting.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAnimationExport}
                disabled={Boolean(activeExport)}
                className="rounded-full px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close animation export"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-700">
                  Animation Speed
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#0d2140] shadow-sm">
                  {formatSpeedMultiplier(speedMultiplier)}
                </span>
              </div>

              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={SLIDER_STEP}
                value={speedMultiplierToSliderValue(speedMultiplier)}
                onChange={(event) =>
                  setSpeedMultiplier(
                    sliderValueToSpeedMultiplier(
                      Number(event.target.value)
                    )
                  )
                }
                disabled={Boolean(activeExport)}
                className="mt-5 w-full accent-[#0d2140]"
                aria-label="Animation speed"
              />

              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
                <span>Slower</span>
                <span>Normal</span>
                <span>Faster</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void runExport(
                  pendingAnimationExport,
                  speedMultiplier
                )
              }
              disabled={Boolean(activeExport)}
              className="mt-6 w-full rounded-lg bg-[#0d2140] px-4 py-3 font-semibold text-white transition hover:bg-[#17345f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeExport === pendingAnimationExport
                ? `Preparing ${animationExportLabel}...`
                : `Export ${animationExportLabel}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
