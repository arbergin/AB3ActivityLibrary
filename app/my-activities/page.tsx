import AppHeader from "@/components/AppHeader";
import MyActivitiesClient from "@/components/MyActivitiesClient";
import ProtectedPage from "@/components/ProtectedPage";

export default function MyActivitiesPage() {
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6">
            <h2 className="text-3xl font-bold">My Activities</h2>
            <p className="mt-2 text-slate-600">
              View, sort, and open activities you created.
            </p>
          </div>

          <MyActivitiesClient />
        </section>
      </main>
    </ProtectedPage>
  );
}
