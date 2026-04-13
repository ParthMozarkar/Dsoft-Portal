import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-white/40 text-sm mb-6">You don't have permission to view this page.</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.1] transition-all duration-200"
        >
          ← Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
