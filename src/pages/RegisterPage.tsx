import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { Spinner } from '../components/ui/Spinner';

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Look up the enrollment code in batches to fail early
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('enrollment_code', enrollmentCode.trim())
        .single();

      if (batchError || !batch) {
        setError('Invalid enrollment code. Please check with your instructor.');
        setLoading(false);
        return;
      }

      // 2. Sign up the user (with emailRedirectTo: undefined to avoid hangs)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: fullName },
          emailRedirectTo: undefined
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // 3. Immediately sign in to force a session (Supabase email confirmations can hang)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError('Signed up but failed to auto-login: ' + signInError.message);
        setLoading(false);
        return;
      }

      if (!signInData.user) {
         setError('Registration failed: no user returned');
         setLoading(false);
         return;
      }

      // 4. Enroll in the batch using secure RPC
      const { error: enrollError } = await supabase.rpc('enroll_student', {
        p_code: enrollmentCode.trim()
      });

      if (enrollError) {
        setError('Failed to enroll in batch: ' + enrollError.message);
        setLoading(false);
        return;
      }

      // 5. Success — redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/50 focus:bg-white/[0.06] transition-all duration-200';

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 relative">
                 <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]">
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="url(#register-logo-gradient)" />
                    <defs>
                       <linearGradient id="register-logo-gradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
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
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label htmlFor="register-name" className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputClass}
                placeholder="John Doe"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="register-email" className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="you@email.com"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="register-password" className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="register-code" className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">
                Enrollment Code
              </label>
              <input
                id="register-code"
                type="text"
                value={enrollmentCode}
                onChange={(e) => setEnrollmentCode(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter code from your teacher"
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
                  Creating account…
                </>
              ) : (
                'Register'
              )}
            </button>
          </form>
        </GlassCard>

        <p className="text-center mt-6 text-white/40 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan font-medium hover:text-cyan/80">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
