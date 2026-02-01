import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const StatsSkeleton = () => (
  <Card className="border-none shadow-sm bg-white overflow-hidden">
    <div className="p-4 bg-white border-b border-gray-100">
      <Skeleton className="h-5 w-32" />
    </div>
    <CardContent className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="bg-muted/50 rounded-xl p-3 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-2 w-28" />
      </div>
      <Skeleton className="h-3 w-36 mx-auto" />
    </CardContent>
  </Card>
);

export const MessageListSkeleton = () => (
  <div className="p-4 space-y-3">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="bg-card rounded-xl p-4 shadow-sm border animate-pulse"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-3 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SidebarSkeleton = () => (
  <div className="space-y-6">
    <StatsSkeleton />
    <Skeleton className="h-12 w-full rounded-xl" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-12" />
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  </div>
);
