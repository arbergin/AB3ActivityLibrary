import AppHeader from "@/components/AppHeader";
import BulkImportFlow from "@/components/BulkImportFlow";
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
          <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Import Activities</h1>
              <p className="mt-2 text-slate-600">
                Import one activity at a time or upload multiple activities in
                bulk.
              </p>
            </div>

            <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-md sm:p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Import Single Activity</h2>
                <p className="mt-2 text-slate-600">
                  Upload one PNG or PDF activity file and add searchable
                  metadata.
                </p>
              </div>

              <ImportFlow />
            </section>

            <section className="mt-8 rounded-2xl border border-slate-300 bg-white p-5 shadow-md sm:p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Import Bulk Activities</h2>
                <p className="mt-2 text-slate-600">
                  Upload a CSV file with activity metadata, then select the
                  matching PNG or PDF files.
                </p>
              </div>

              <BulkImportFlow />
            </section>
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}
