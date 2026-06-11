import ActionCards from "@/components/ActionCards";
import ActivityTable from "@/components/ActivityTable";
import AppHeader from "@/components/AppHeader";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="mx-auto max-w-6xl px-8 py-10">
        <ActionCards />

        <ActivityTable />
      </section>
    </main>
  );
}