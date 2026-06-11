import ActivityMetadataForm from "@/components/ActivityMetadataForm";
import AppHeader from "@/components/AppHeader";
import ImportActivityModal from "@/components/ImportActivityModal";

export default function ImportTestPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-6xl px-8 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Import Flow Test</h2>
          <p className="mt-2 text-slate-600">
            Temporary page to preview the import modal and metadata form.
          </p>
        </div>

        <div className="grid gap-8">
          <ImportActivityModal />

          <ActivityMetadataForm />
        </div>
      </section>
    </main>
  );
}