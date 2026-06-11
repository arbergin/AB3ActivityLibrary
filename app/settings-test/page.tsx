import AppHeader from "@/components/AppHeader";

export default function SettingsTestPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-6xl px-8 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Settings Test</h2>
          <p className="mt-2 text-slate-600">
            Temporary page to preview admin settings for users and dropdown values.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">User Management</h3>
            <p className="mt-2 text-slate-600">
              Admins will add/remove users, reset passwords, send invites, and assign roles.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Dropdown Values</h3>
            <p className="mt-2 text-slate-600">
              Admins will manage field locations, game phases, and activity categories.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}