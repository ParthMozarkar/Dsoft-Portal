import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

function DefaultIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className="text-white/10"
    >
      <rect
        x="6"
        y="10"
        width="36"
        height="28"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M6 18h36"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
      <circle cx="22" cy="14" r="1.5" fill="currentColor" />
      <rect x="14" y="24" width="20" height="2" rx="1" fill="currentColor" />
      <rect x="18" y="30" width="12" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4">
        {icon || <DefaultIcon />}
      </div>
      <h3 className="text-base font-heading font-medium text-white/60 mb-1">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-white/30 max-w-xs mb-4">
          {subtitle}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
