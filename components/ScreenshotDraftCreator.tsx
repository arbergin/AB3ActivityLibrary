"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ActivityCreator from "@/components/ActivityCreator";
import { SCREENSHOT_DRAFT_KEY } from "@/lib/screenshotDraft";
import type { Activity } from "@/types/activity";

export default function ScreenshotDraftCreator() {
  const [draft, setDraft] = useState<Activity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(SCREENSHOT_DRAFT_KEY);
      if (raw) {
        const candidate: unknown = JSON.parse(raw);
        if (candidate && typeof candidate === "object" &&
            "creatorState" in candidate && "activityName" in candidate) {
          setDraft(candidate as Activity);
        }
      }
    } catch (error) {
      console.error("Unable to restore screenshot draft", error);
    } finally {
      setReady(true);
    }
  }, []);

  if (!ready) return <p className="p-6 text-slate-700">Opening screenshot draft…</p>;
  if (!draft) return <div className="mx-auto max-w-xl rounded-xl bg-white p-6">
    <h1 className="text-xl font-bold">Screenshot draft unavailable</h1>
    <p className="mt-2 text-slate-600">This draft is stored only in the original browser tab. Return to Import and generate the activity again.</p>
    <Link href="/import" className="mt-4 inline-block rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white">Back to Import</Link>
  </div>;

  return <>
    <div className="mx-auto max-w-7xl px-4 pt-3 text-sm font-medium text-amber-900 sm:px-6 lg:px-8">
      Unsaved screenshot activity — it will appear in My Activities only after you click Save.
    </div>
    <ActivityCreator draftActivity={draft} />
  </>;
}
