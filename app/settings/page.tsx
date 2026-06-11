import AppHeader from "@/components/AppHeader";
import SettingsPanel from "@/components/SettingsPanel";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-6xl px-8 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Admin Settings</h2>
          <p className="mt-2 text-slate-600">
            Manage users, onboarding, roles, and dropdown values used across the
            activity library.
          </p>
        </div>

        <SettingsPanel />
      </section>
    </main>
  );
}