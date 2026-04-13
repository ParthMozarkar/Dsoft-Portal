import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function NotFoundPage() {
  return (
    <div className="fixed inset-0 bg-void flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.03)_0%,transparent_70%)]">
      <div className="text-center max-w-sm">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="mb-8"
        >
          <h1 className="text-8xl font-heading font-black text-white/5 mb-[-2rem] select-none">404</h1>
          <h2 className="text-2xl font-heading font-bold text-white mb-2">Signal Lost.</h2>
          <p className="text-sm text-white/30 font-medium">The page you are looking for does not exist in the VAULT core.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan text-void font-heading font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:scale-105 transition-all"
          >
            Return to Dashboard
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
