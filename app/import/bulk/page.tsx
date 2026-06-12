import AppHeader from "@/components/AppHeader";
import BulkImportFlow from "@/components/BulkImportFlow";
import ProtectedPage from "@/components/ProtectedPage";

export default function BulkImportPage() {
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Upload Bulk Activities</h2>
            <p className="mt-2 text-slate-600">
              Upload a CSV file with activity metadata, then select the matching
              PNG or PDF files.
            </p>
          </div>

          <BulkImportFlow />
        </section>
      </main>
    </ProtectedPage>
  );
}