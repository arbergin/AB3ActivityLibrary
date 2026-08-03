import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import TeamPlanner from "@/components/TeamPlanner";

type TeamPlanningDetailPageProps = {
  params: Promise<{
    teamId: string;
  }>;
};

export default async function TeamPlanningDetailPage({
  params,
}: TeamPlanningDetailPageProps) {
  const { teamId } = await params;

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <TeamPlanner teamId={teamId} />
        </section>
      </main>
    </ProtectedPage>
  );
}