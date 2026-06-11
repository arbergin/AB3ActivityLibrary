import ActivityEditClient from "@/components/ActivityEditClient";

type ActivityEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ActivityEditPage({
  params,
}: ActivityEditPageProps) {
  const { id } = await params;

  return <ActivityEditClient activityId={id} />;
}