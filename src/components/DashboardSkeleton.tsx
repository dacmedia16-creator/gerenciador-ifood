import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Score + KPIs */}
      <Card className="p-4 sm:p-6 shadow-card">
        <div className="grid md:grid-cols-4 gap-6 items-center">
          <div className="text-center space-y-2">
            <Skeleton className="h-4 w-24 mx-auto" />
            <Skeleton className="h-16 w-24 mx-auto" />
            <Skeleton className="h-5 w-20 mx-auto" />
          </div>
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 shadow-card lg:col-span-2">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="p-4 shadow-card">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>

      {/* Lists */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 shadow-card space-y-2">
          <Skeleton className="h-5 w-40 mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
        <Card className="p-4 shadow-card space-y-2">
          <Skeleton className="h-5 w-40 mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
