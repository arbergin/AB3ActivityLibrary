export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="flex items-center justify-between bg-slate-900 px-8 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-900">
            LOGO
          </div>
          <div>
            <h1 className="text-2xl font-bold">AB3 Activity Library</h1>
            <p className="text-sm text-slate-300">
              Store, tag, search, and download soccer activities.
            </p>
          </div>
        </div>

        <nav className="flex gap-3">
          <button className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-900">
            Import
          </button>
          <button className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-900">
            Search
          </button>
          <button className="rounded-lg border border-slate-500 px-4 py-2 font-semibold text-white">
            Settings
          </button>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-8 py-10">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Import a new activity</h2>
            <p className="mt-2 text-slate-600">
              Upload a PNG or PDF exported from the AB3 Activity Planner app.
              After upload, the metadata form will open.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Search existing activities</h2>
            <p className="mt-2 text-slate-600">
              Search by activity name, field location, game phase, category,
              positions involved, number of players, or activity details.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Recent / My Activities</h2>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-5 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              <div>Activity Name</div>
              <div>Location</div>
              <div>Phase</div>
              <div>Category</div>
              <div>Actions</div>
            </div>

            <div className="grid grid-cols-5 px-4 py-4 text-sm text-slate-500">
              <div>No activities yet</div>
              <div>—</div>
              <div>—</div>
              <div>—</div>
              <div>—</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}