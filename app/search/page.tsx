import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import SearchPageClient from "@/components/SearchPageClient";

export default function SearchPage() {
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Search Activities</h2>
            <p className="mt-2 text-slate-600">
              Filter activities by name, field location, game phase, category,
              positions involved, number of players, or activity details.
            </p>
          </div>

          <SearchPageClient />
        </section>
      </main>
    </ProtectedPage>
  );
}