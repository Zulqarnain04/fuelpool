export function Loaders() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* List Skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-16 animate-pulse"></div>
        </div>
        
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-slate-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Card Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="h-24 bg-slate-200 animate-pulse w-full"></div>
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-3 bg-slate-100 rounded w-full animate-pulse"></div>
            <div className="h-3 bg-slate-100 rounded w-4/5 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full"></div>
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}