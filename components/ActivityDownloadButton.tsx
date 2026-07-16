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

type ExportType = "pdf" | "gif" | "mp4";

export default function ActivityDownloadButton({
  activity,
  onMessage,
  className = "",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeExport, setActiveExport] = useState<ExportType | null>(null);
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
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", closeFromOutside);
    window.addEventListener("keydown", closeFromEscape);

    return () => {
      document.removeEventListener("mousedown", closeFromOutside);
      window.removeEventListener("keydown", closeFromEscape);
    };
  }, []);

  async function runExport(type: ExportType) {
    if (activeExport) return;

    setActiveExport(type);
    setIsOpen(false);
    onMessage?.("");

    try {
      if (type === "pdf") {
        await downloadActivityAsPdf(activity);
        onMessage?.("PDF export download started.");
      } else if (type === "gif") {
        await downloadActivityAnimationAsGif(activity);
        onMessage?.("GIF animation download started.");
      } else {
        await downloadActivityAnimationAsMp4(activity);
        onMessage?.("MP4 animation download started.");
      }
    } catch (error) {
      console.error(`${type.toUpperCase()} export failed.`, error);
      const fallback =
        type === "pdf"
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

  const buttonClass =
    "rounded-lg bg-[#0d2140] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#17345f] disabled:cursor-not-allowed disabled:opacity-60";

  if (!hasAnimation) {
    return (
      <button
        type="button"
        onClick={() => runExport("pdf")}
        disabled={Boolean(activeExport)}
        className={`${buttonClass} ${className}`}
      >
        {activeExport === "pdf" ? "Preparing..." : "Download"}
      </button>
    );
  }

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={Boolean(activeExport)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`${buttonClass} inline-flex items-center gap-2`}
      >
        <span>
          {activeExport
            ? activeExport === "pdf"
              ? "Preparing PDF..."
              : activeExport === "gif"
                ? "Preparing GIF..."
                : "Preparing MP4..."
            : "Download"}
        </span>
        <span aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
        >
          {(["pdf", "gif", "mp4"] as ExportType[]).map((type) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              onClick={() => runExport(type)}
              className="block w-full px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download {type.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
