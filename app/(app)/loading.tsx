import { SkeletonCard, SkeletonList } from '@/components/ui/loading-skeleton'

export default function AppLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="bg-muted h-8 w-1/4 animate-pulse rounded" />
        <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* List skeleton */}
      <div className="space-y-4">
        <div className="bg-muted h-6 w-1/6 animate-pulse rounded" />
        <SkeletonList count={5} />
      </div>
    </div>
  )
}
