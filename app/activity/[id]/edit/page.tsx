import ActivityEditClient from "@/components/ActivityEditClient";

type EditActivityPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditActivityPage({
  params,
}: EditActivityPageProps) {
  const { id } = await params;

  return <ActivityEditClient activityId={id} />;
}
