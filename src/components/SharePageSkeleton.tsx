"use client";

export function SharePageSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Hero skeleton */}
      <div className="relative -mx-8 md:-ml-64 md:w-[calc(100%+16rem)]">
        <div className="h-64 md:h-96 bg-[#141210] animate-pulse" />
        {/* Stats skeleton overlay */}
        <div className="absolute bottom-6 left-6 md:left-10 space-y-3">
          <div className="h-8 w-80 bg-elevated/60 rounded animate-pulse" />
          <div className="flex gap-4">
            <div className="h-5 w-28 bg-elevated/60 rounded animate-pulse" />
            <div className="h-5 w-24 bg-elevated/60 rounded animate-pulse" />
            <div className="h-5 w-20 bg-elevated/60 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="max-w-3xl mx-auto mt-10 px-2">
        {/* Section heading skeleton */}
        <div className="h-7 w-48 bg-elevated rounded animate-pulse mb-6" />

        {/* Category chips skeleton */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-20 bg-elevated rounded-full animate-pulse"
            />
          ))}
        </div>

        {/* Timeline event skeletons */}
        <div className="relative pl-8 md:pl-10">
          <div className="absolute left-[15px] md:left-[19px] top-2 bottom-2 w-[2px] bg-border-subtle rounded-full" />

          <div className="space-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="relative">
                {/* Date skeleton */}
                <div className="absolute left-[-1.6rem] md:left-[-1.9rem] top-0 w-[34px] md:w-[40px] text-right -translate-x-full pr-3">
                  <div className="h-3 w-12 bg-elevated rounded animate-pulse ml-auto" />
                </div>

                {/* Dot */}
                <div className="absolute left-[11px] md:left-[15px] top-1.5 w-[10px] h-[10px] rounded-full bg-border-subtle" />

                {/* Card skeleton */}
                <div className="card p-4 md:p-5">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-elevated animate-pulse shrink-0" />
                    <div className="min-w-0 space-y-2 flex-1">
                      <div className="h-4 w-3/4 bg-elevated rounded animate-pulse" />
                      <div className="h-4 w-full bg-elevated rounded animate-pulse" />
                      <div className="h-4 w-5/6 bg-elevated rounded animate-pulse" />
                      <div className="h-4 w-2/3 bg-elevated rounded animate-pulse" />
                    </div>
                  </div>
                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-subtle">
                    <div className="h-3 w-20 bg-elevated rounded animate-pulse" />
                    <div className="h-3 w-16 bg-elevated rounded animate-pulse" />
                  </div>
                  {/* Photo thumbnails */}
                  <div className="flex gap-2 mt-3">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <div
                        key={j}
                        className="w-16 h-16 rounded-lg bg-elevated animate-pulse shrink-0"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ShareLinkBar skeleton */}
      <div className="max-w-3xl mx-auto mt-10">
        <div className="card flex items-center gap-4 p-4">
          <div className="h-5 w-12 bg-elevated rounded animate-pulse" />
          <div className="h-4 w-64 bg-elevated rounded animate-pulse flex-1" />
          <div className="h-8 w-8 bg-elevated rounded-lg animate-pulse" />
          <div className="h-24 w-24 bg-elevated rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
