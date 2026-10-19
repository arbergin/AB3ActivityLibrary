import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import TeamPlayers from "@/components/TeamPlayers";

export default async function TeamPlayersPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <ProtectedPage><main className="min-h-screen bg-slate-100 text-slate-900">
    <AppHeader /><section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><TeamPlayers teamId={teamId} /></section>
  </main></ProtectedPage>;
}
