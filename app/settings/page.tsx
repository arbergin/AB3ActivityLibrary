"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import {
  clearStoredActivities,
  getStoredActivitiesSummary,
} from "@/lib/activityStorage";

type LocalDataSummary = {
  count: number;
  storageSizeKb: number;
};

export default function SettingsPage() {
  const [localDataSummary, setLocalDataSummary] = useState<LocalDataSummary>({
    count: 0,
    storageSizeKb: 0,
  });

  const [message, setMessage] = useState("");

  function refreshLocalDataSummary() {
    setLocalDataSummary(getStoredActivitiesSummary());
  }

  function handleClearLocalData() {
    clearStoredActivities();
    refreshLocalDataSummary();
    setMessage("Local browser data cleared.");
  }

  useEffect(() => {
    refreshLocalDataSummary();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-5xl px-8 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="mt-2 text-slate-600">
            Manage temporary browser data and setup options while the Activity
            Library is being built.
          </p>
        </div>

        <div className="grid gap-6">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Local Browser Data</h3>

            <p className="mt-2 text-sm text-slate-600">
              Supabase is now the main storage location. Local browser data is
              only kept as a temporary fallback during development.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700">
                  Local Activities
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {localDataSummary.count}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700">
                  Approx. Local Storage Size
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {localDataSummary.storageSizeKb} KB
                </div>
              </div>
            </div>

            {message && (
              <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                {message}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={refreshLocalDataSummary}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={handleClearLocalData}
                className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700"
              >
                Clear Local Data
              </button>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Current Storage Setup</h3>

            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="font-semibold text-slate-800">
                  Supabase Database
                </div>
                <div className="mt-1">
                  Activity metadata is saved in the Supabase{" "}
                  <span className="font-semibold">activities</span> table.
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="font-semibold text-slate-800">
                  Supabase Storage
                </div>
                <div className="mt-1">
                  PNG and PDF files are saved in the{" "}
                  <span className="font-semibold">activity-files</span> bucket.
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="font-semibold text-slate-800">
                  Mock Activities
                </div>
                <div className="mt-1">
                  Sample/mock activities remain visible for testing while we
                  continue building.
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}