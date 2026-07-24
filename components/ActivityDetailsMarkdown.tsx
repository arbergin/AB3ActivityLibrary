"use client";

import { Fragment, type ReactNode } from "react";
import { parseActivityDetailsMarkdown } from "@/lib/activityDetailsMarkdown";

type Props = {
  value?: string | null;
  fallback?: string;
  className?: string;
  compact?: boolean;
};

export default function ActivityDetailsMarkdown({
  value,
  fallback = "—",
  className = "",
  compact = false,
}: Props) {
  const blocks = parseActivityDetailsMarkdown(value);

  if (blocks.length === 0) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div
      className={`break-words ${
        compact ? "space-y-0.5" : "space-y-2"
      } ${className}`}
    >
      {blocks.map((block, blockIndex) => {
        if (block.type === "blank") {
          return (
            <div
              key={blockIndex}
              className={compact ? "h-1" : "h-2"}
            />
          );
        }

        const content = block.runs.map((run, runIndex) => {
          let renderedContent: ReactNode = run.text;

          if (run.underline) {
            renderedContent = (
              <span className="underline">{renderedContent}</span>
            );
          }

          if (run.italic) {
            renderedContent = <em>{renderedContent}</em>;
          }

          if (run.bold) {
            renderedContent = <strong>{renderedContent}</strong>;
          }

          return (
            <Fragment key={`${blockIndex}-${runIndex}`}>
              {renderedContent}
            </Fragment>
          );
        });

        if (block.type === "bullet") {
          return (
            <div key={blockIndex} className="flex items-start gap-2">
              <span aria-hidden="true" className="shrink-0">
                •
              </span>

              <div className="min-w-0">{content}</div>
            </div>
          );
        }

        return <div key={blockIndex}>{content}</div>;
      })}
    </div>
  );
}
