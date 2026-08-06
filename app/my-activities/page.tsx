import AppHeader from "@/components/AppHeader";
import MyActivitiesClient from "@/components/MyActivitiesClient";
import ProtectedPage from "@/components/ProtectedPage";

export default function MyActivitiesPage() {
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
          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <MyActivitiesClient />
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}
