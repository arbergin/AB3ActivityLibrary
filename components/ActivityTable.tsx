type ActivityRow = {
  activityName: string;
  location: string;
  phase: string;
  category: string;
};

const activities: ActivityRow[] = [];

export default function ActivityTable() {
  return (
    <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Recent / My Activities</h2>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-5 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
          <div>Activity Name</div>
          <div>Location</div>
          <div>Phase</div>
          <div>Category</div>
          <div>Actions</div>
        </div>

        {activities.length === 0 ? (
          <div className="grid grid-cols-5 px-4 py-4 text-sm text-slate-500">
            <div>No activities yet</div>
            <div>—</div>
            <div>—</div>
            <div>—</div>
            <div>—</div>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.activityName}
              className="grid grid-cols-5 border-t border-slate-200 px-4 py-4 text-sm"
            >
              <div>{activity.activityName}</div>
              <div>{activity.location}</div>
              <div>{activity.phase}</div>
              <div>{activity.category}</div>
              <div>
                <button className="font-semibold text-slate-700">Open</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}