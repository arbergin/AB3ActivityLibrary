import AppHeader from "@/components/AppHeader";
import ImportFlow from "@/components/ImportFlow";
import ProtectedPage from "@/components/ProtectedPage";

export default function ImportPage() {
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
          <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Import Single Activity</h2>
            <p className="mt-2 text-slate-600">
              Upload a single PNG or PDF activity file and add searchable
              metadata.
            </p>
          </div>

            <ImportFlow />
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}