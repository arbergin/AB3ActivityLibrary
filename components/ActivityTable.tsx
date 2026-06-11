import ActivityTable from "@/components/ActivityTable";
type ActivityRow = {
  activityName: string;
  location: string;
  phase: string;
  category: string;
};

const activities: ActivityRow[] = [];

export default function ActivityTable() {
  return (
    <ActivityTable />
  );
}