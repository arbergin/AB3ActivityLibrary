import AppHeader from "@/components/AppHeader";
import ActivityCreator from "@/components/ActivityCreator";
import ProtectedPage from "@/components/ProtectedPage";

export default function CreateActivityPage() {
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Create Activity</h2>
            <p className="mt-2 text-slate-600">
              Build a soccer activity on the pitch using players, cones, goals,
              mannequins, and drawing tools.
            </p>
          </div>

          <ActivityCreator />
        </section>
      </main>
    </ProtectedPage>
  );
}