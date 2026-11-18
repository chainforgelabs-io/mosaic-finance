export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-44 w-full" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    </div>
  );
}
