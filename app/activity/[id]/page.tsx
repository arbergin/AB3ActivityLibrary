import ActivityViewClient from "@/components/ActivityViewClient";

type ActivityPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { id } = await params;

  return <ActivityViewClient activityId={id} />;
}