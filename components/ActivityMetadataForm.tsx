import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";

export default function ActivityMetadataForm() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Activity Metadata</h2>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          File preview
          <div className="mt-2 text-xs">PNG or PDF page thumbnail</div>
        </div>

        <form className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Activity Name *</span>
            <input
              type="text"
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Free text"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Field Location</span>
            <select className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Select value</option>
              {fieldLocationOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Game Phase</span>
            <select className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Select value</option>
              {gamePhaseOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Category</span>
            <select className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Select value</option>
              {categoryOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Positions Involved</span>
            <input
              type="text"
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Free text"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Number of Players</span>
            <input
              type="number"
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="#"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold">Activity Details</span>
            <textarea
              className="min-h-32 rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Rules, setup, coaching points, progressions, constraints, etc."
            />
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>

      <p className="mt-4 text-sm text-slate-500">* Required</p>
    </div>
  );
}