import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { Spinner } from '../components/ui/Spinner';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 relative">
                 <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]">
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="url(#login-logo-gradient)" />
                    <defs>
                       <linearGradient id="login-logo-gradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#A855F7" />
                          <stop offset="1" stopColor="#3B82F6" />
                       </linearGradient>
                    </defs>
                 </svg>
              </div>
              <div className="flex flex-col">
                 <h1 className="font-heading text-3xl font-black text-white tracking-tighter leading-none uppercase">
                    ARDSOFT<span className="text-cyan">.</span>
                 </h1>
                 <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-bold mt-0.5">IT SOLUTIONS</p>
              </div>
           </div>
        </div>

        <GlassCard padding="2rem" hover={false}>
          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label
                htmlFor="login-email"
                className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/50 focus:bg-white/[0.06] transition-all duration-200"
                placeholder="you@email.com"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="login-password"
                className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/50 focus:bg-white/[0.06] transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[13px]"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-heading font-semibold text-sm bg-cyan text-void hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </GlassCard>

        <p className="text-center mt-6 text-white/40 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-cyan font-medium hover:text-cyan/80">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
