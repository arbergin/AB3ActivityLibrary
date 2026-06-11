export default function ImportActivityModal() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Import Activity File</h2>

      <div className="mt-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="font-semibold text-slate-700">Drop PNG/PDF here</p>
        <p className="mt-1 text-sm text-slate-500">or click to browse</p>
        <p className="mt-4 text-xs text-slate-400">
          Accepted formats: .png, .pdf
        </p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">
          Cancel
        </button>
        <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">
          Continue
        </button>
      </div>
    </div>
  );
}