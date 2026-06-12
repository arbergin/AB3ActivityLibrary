import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import SearchPageClient from "@/components/SearchPageClient";

export default function SearchPage() {
  return (
    <ProtectedPage>
      <main className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6 min-w-0">
            <h2 className="text-2xl font-bold">Search Activities</h2>
            <p className="mt-2 max-w-3xl text-slate-600">
              Filter activities by name, field location, game phase, category,
              positions involved, number of players, or activity details.
            </p>
          </div>

          <div className="min-w-0 overflow-hidden">
            <SearchPageClient />
          </div>
        </section>
      </main>
    </ProtectedPage>
  );
}