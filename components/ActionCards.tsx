export default function ActionCards() {
  return (
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
  );
}