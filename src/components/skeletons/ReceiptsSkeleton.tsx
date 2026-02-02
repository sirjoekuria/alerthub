import { Skeleton } from "@/components/ui/skeleton";

export const ReceiptsSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header */}
    <div className="bg-card border-b sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-7 w-40" />
          </div>
        </div>
      </div>
    </div>

    {/* Content */}
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-xl p-6 shadow-sm border animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
