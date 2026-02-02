import { Skeleton } from "@/components/ui/skeleton";

export const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    {/* Header */}
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="px-4 h-16 flex items-center gap-4 max-w-lg mx-auto w-full">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-6 w-24" />
      </div>
    </header>

    {/* Content */}
    <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6 pb-12">
      {/* Avatar Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-4">
        <Skeleton className="w-28 h-28 rounded-full" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>

      {/* Email Address */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);
