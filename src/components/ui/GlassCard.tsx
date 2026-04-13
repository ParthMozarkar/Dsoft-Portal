import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function GlassCard({
  children,
  className = '',
  padding = '1.5rem',
  onClick,
  hover = true,
}: GlassCardProps) {
  return (
    <motion.div
      className={`glass-bg rounded-2xl ${className}`}
      style={{ padding }}
      onClick={onClick}
      whileHover={hover ? { scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </motion.div>
  );
}
