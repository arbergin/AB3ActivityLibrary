import ActivityTable from "@/components/ActivityTable";
import AppHeader from "@/components/AppHeader";

export default function SearchTestPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-6xl px-8 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Search Test</h2>
          <p className="mt-2 text-slate-600">
            Temporary page to preview the search results layout.
          </p>
        </div>

        <ActivityTable />
      </section>
    </main>
  );
}