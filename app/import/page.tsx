import AppHeader from "@/components/AppHeader";
import ImportFlow from "@/components/ImportFlow";
import ProtectedPage from "@/components/ProtectedPage";

export default function ImportPage() {
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-5xl px-8 py-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Import Activity</h2>
            <p className="mt-2 text-slate-600">
              Upload a PNG or PDF exported from the AB3 Activity Planner, then
              add metadata so it can be searched in the library.
            </p>
          </div>

          <ImportFlow />
        </section>
      </main>
    </ProtectedPage>
  );
}