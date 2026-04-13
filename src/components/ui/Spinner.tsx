interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 20,
  md: 32,
  lg: 48,
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const s = sizeMap[size];
  const strokeWidth = size === 'sm' ? 2.5 : size === 'md' ? 3 : 3.5;
  const r = (s - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className={`animate-spin-slow ${className}`}
      style={{ display: 'block' }}
    >
      {/* Track */}
      <circle
        cx={s / 2}
        cy={s / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      {/* Spinner */}
      <circle
        cx={s / 2}
        cy={s / 2}
        r={r}
        fill="none"
        stroke="#00E5FF"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
        style={{ transformOrigin: 'center' }}
      />
    </svg>
  );
}

/** Full-screen centered spinner for page loading states */
export function FullScreenSpinner() {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-void">
      <Spinner size="lg" />
    </div>
  );
}
