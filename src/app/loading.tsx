export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-32 bg-gray-800 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-800 animate-pulse" />
            <div>
              <div className="h-8 w-12 bg-gray-800 rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Ticket list skeleton */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="h-5 w-48 bg-gray-800 rounded animate-pulse mb-2" />
                <div className="h-4 w-96 bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-gray-800 rounded-full animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-gray-800 rounded-full animate-pulse" />
              <div className="h-6 w-24 bg-gray-800 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
