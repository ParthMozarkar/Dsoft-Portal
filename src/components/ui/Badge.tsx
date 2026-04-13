import type { ReactNode } from 'react';

type BadgeVariant = 'info' | 'important' | 'urgent' | 'success' | 'pending' | 'live';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  info: 'bg-cyan/10 text-cyan border border-cyan/20',
  important: 'bg-amber/10 text-amber border border-amber/20',
  urgent: 'bg-danger/10 text-danger border border-danger/20 animate-pulse',
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pending: 'bg-amber/10 text-amber border border-amber/20',
  live: 'bg-danger text-white animate-pulse',
};

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-2.5 py-0.5 rounded-full
        text-[11px] font-medium tracking-wide uppercase
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
      )}
      {children}
    </span>
  );
}
