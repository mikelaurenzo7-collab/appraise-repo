interface ShimmerSkeletonProps {
  className?: string;
  count?: number;
  gap?: string;
}

export function ShimmerSkeleton({ className = "h-4 w-full", count = 1, gap = "0.5rem" }: ShimmerSkeletonProps) {
  return (
    <div className="flex flex-col" style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`shimmer ${className}`} />
      ))}
    </div>
  );
}

export function ShimmerCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-[#334155]/50 bg-[#1E293B]/60 p-6 space-y-4">
      <div className="shimmer h-6 w-1/3 rounded-md" />
      <ShimmerSkeleton count={lines} className="h-3 w-full rounded-md" />
      <div className="shimmer h-8 w-24 rounded-md mt-2" />
    </div>
  );
}

export function ShimmerStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[#334155]/50 bg-[#1E293B]/60 p-6 space-y-3"
        >
          <div className="shimmer h-3 w-20 rounded-md" />
          <div className="shimmer h-10 w-28 rounded-md" />
        </div>
      ))}
    </div>
  );
}
