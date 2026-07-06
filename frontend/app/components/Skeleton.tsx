'use client';

interface SkeletonLineProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }: SkeletonLineProps) {
  return (
    <div className={`${width} ${height} rounded-lg bg-slate-800/50 animate-pulse ${className}`} />
  );
}

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <div className={`${sizes[size]} rounded-full bg-slate-800/50 animate-pulse ${className}`} />
  );
}

interface SkeletonCardProps {
  className?: string;
  lines?: number;
  hasAvatar?: boolean;
  hasImage?: boolean;
}

export function SkeletonCard({ className = '', lines = 3, hasAvatar = false, hasImage = false }: SkeletonCardProps) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 ${className}`}>
      {/* Image placeholder */}
      {hasImage && (
        <div className="w-full h-40 rounded-xl bg-slate-800/50 animate-pulse mb-4" />
      )}

      {/* Avatar + name row */}
      {hasAvatar && (
        <div className="flex items-center gap-3 mb-4">
          <SkeletonAvatar size="sm" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width="w-32" height="h-3.5" />
            <SkeletonLine width="w-20" height="h-2.5" />
          </div>
        </div>
      )}

      {/* Text lines */}
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine
            key={i}
            width={i === lines - 1 ? 'w-3/4' : 'w-full'}
            height="h-3.5"
          />
        ))}
      </div>

      {/* Action row */}
      <div className="mt-4 flex items-center gap-2">
        <SkeletonLine width="w-16" height="h-8" className="rounded-lg" />
        <SkeletonLine width="w-16" height="h-8" className="rounded-lg" />
      </div>
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  columns?: number;
  hasImage?: boolean;
  hasAvatar?: boolean;
}

export function SkeletonGrid({ count = 6, columns = 3, hasImage = true, hasAvatar = true }: SkeletonGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[3]} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard
          key={i}
          hasImage={hasImage}
          hasAvatar={hasAvatar}
          className="animate-pulse"
        />
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-800/60">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLine key={i} width="flex-1" height="h-3" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-4 px-5 py-4 border-b border-slate-800/30 last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <SkeletonLine key={colIdx} width="flex-1" height="h-3.5" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} hasImage hasAvatar />
      ))}
    </div>
  );
}

export function SkeletonEventGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} hasImage hasAvatar lines={4} />
      ))}
    </div>
  );
}

export function SkeletonDetailPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero image */}
      <div className="w-full h-64 rounded-2xl bg-slate-800/50 animate-pulse" />

      {/* Title area */}
      <div className="space-y-3">
        <SkeletonLine width="w-3/4" height="h-8" />
        <SkeletonLine width="w-1/2" height="h-4" />
      </div>

      {/* Avatar + meta */}
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="space-y-1.5">
          <SkeletonLine width="w-32" height="h-3.5" />
          <SkeletonLine width="w-20" height="h-3" />
        </div>
      </div>

      {/* Content lines */}
      <div className="space-y-2.5">
        <SkeletonLine height="h-4" />
        <SkeletonLine height="h-4" />
        <SkeletonLine width="w-5/6" height="h-4" />
        <SkeletonLine width="w-2/3" height="h-4" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <SkeletonLine width="w-28" height="h-10" className="rounded-xl" />
        <SkeletonLine width="w-28" height="h-10" className="rounded-xl" />
      </div>
    </div>
  );
}
