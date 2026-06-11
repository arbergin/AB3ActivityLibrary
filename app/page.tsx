import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";

export default function HomePage() {
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="mt-2 text-slate-600">
              Welcome to the AB3 Activity Library. Import, organize, search, and
              manage soccer training activities.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Link
              href="/import"
              className="rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-lg font-bold">Import Activity</div>
              <p className="mt-2 text-sm text-slate-600">
                Upload a PNG or PDF activity file and add searchable metadata.
              </p>
            </Link>

            <Link
              href="/search"
              className="rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-lg font-bold">Search Library</div>
              <p className="mt-2 text-sm text-slate-600">
                Find activities by name, field location, game phase, category,
                positions, number of players, or details.
              </p>
            </Link>

            <Link
              href="/settings"
              className="rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-lg font-bold">Settings</div>
              <p className="mt-2 text-sm text-slate-600">
                Manage local browser data and review the current storage setup.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </ProtectedPage>
  );
}