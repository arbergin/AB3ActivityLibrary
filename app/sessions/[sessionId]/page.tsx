import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import TeamPlanner from "@/components/TeamPlanner";

type SessionPageProps = { params: Promise<{ sessionId: string }> };

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <TeamPlanner teamId={sessionId} standalone />
        </section>
      </main>
    </ProtectedPage>
  );
}
