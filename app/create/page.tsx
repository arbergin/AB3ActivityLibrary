import AppHeader from "@/components/AppHeader";
import ActivityCreator from "@/components/ActivityCreator";
import ProtectedPage from "@/components/ProtectedPage";

export default function CreateActivityPage() {
  return (
    <ProtectedPage>
      <main className="flex min-h-screen flex-col text-slate-900">
        <AppHeader />

        <div
          className="flex-1"
          style={{
            backgroundColor: "#e8eef7",
            backgroundImage:
              "linear-gradient(135deg, #c5d3e5 0%, #d9e3f0 42%, #f4f7fb 100%)",
          }}
        >
          <section className="mx-auto max-w-7xl px-4 py-1 sm:px-6 lg:px-8">
            <ActivityCreator />
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}