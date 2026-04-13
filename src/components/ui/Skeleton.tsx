interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export function Skeleton({ className = '', width, height, circle }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-white/[0.04] rounded-lg animate-shimmer ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '1rem',
        borderRadius: circle ? '50%' : undefined,
      }}
    />
  );
}

// Global CSS for shimmer added to index.css
