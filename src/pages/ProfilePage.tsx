import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { PageTransition, StaggerItem } from '../components/layout/PageTransition';

/* ── Types ───────────────────────────────────────── */
interface ProfileStats {
  totalSubmitted: number;
  totalReviewed: number;
  averageMarks: number;
  subjectAverages: Array<{ subject: string; average: number }>;
}

/* ══════════════════════════════════════════════════════
   PROFILE PAGE
   ══════════════════════════════════════════════════════ */
export function ProfilePage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [studentStats, setStudentStats] = useState<ProfileStats | null>(null);
  const [enrolledBatches, setEnrolledBatches] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setName(profile.name);

    try {
      if (profile.role === 'student') {
        const [{ data: enr }, { data: subs }] = await Promise.all([
          supabase.from('batch_enrollments').select('enrolled_at, batches(name, subject, profiles(name))').eq('student_id', profile.id),
          supabase.from('submissions').select('marks, status, assignments(batch_id, batches(subject))').eq('student_id', profile.id)
        ]);

        setEnrolledBatches(enr ?? []);

        const reviewed = subs?.filter(s => s.status === 'reviewed' && s.marks !== null) ?? [];
        const avg = reviewed.length > 0 ? reviewed.reduce((acc, curr) => acc + (curr.marks || 0), 0) / reviewed.length : 0;

        // Group by subject
        const subjects: Record<string, { total: number; count: number }> = {};
        reviewed.forEach(s => {
          const sub = (s.assignments as any)?.batches?.subject || 'Unknown';
          if (!subjects[sub]) subjects[sub] = { total: 0, count: 0 };
          subjects[sub].total += s.marks || 0;
          subjects[sub].count += 1;
        });

        const subjectAvgs = Object.entries(subjects).map(([subject, data]) => ({
          subject,
          average: data.total / data.count
        }));

        setStudentStats({
          totalSubmitted: subs?.length ?? 0,
          totalReviewed: reviewed.length,
          averageMarks: avg,
          subjectAverages: subjectAvgs
        });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateProfile = async () => {
    if (!profile || !name.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', profile.id);
      if (error) throw error;
      toast('Profile updated', 'success');
      setEditing(false);
      window.location.reload(); // Refresh to update AuthContext
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 2 * 1024 * 1024) {
      toast('File too large (max 2MB)', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;

      setUploadProgress(40);
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      setUploadProgress(70);
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profile.id);
      
      setUploadProgress(100);
      toast('Avatar updated', 'success');
      window.location.reload();
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  if (loading && !profile) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Header */}
        <StaggerItem>
           <GlassCard padding="2rem" hover={false} className="relative group overflow-hidden">
             {/* Background glow */}
             <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan/5 rounded-full blur-[100px]" />

             <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                <div className="relative">
                   <div className="w-24 h-24 rounded-full bg-cyan/10 border-2 border-cyan/20 flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                      ) : (
                        <span className="text-3xl font-heading font-bold text-cyan">
                           {profile?.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                   </div>
                   <button
                     onClick={() => fileInputRef.current?.click()}
                     className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-white text-void flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                     title="Change Avatar"
                   >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                   </button>
                   <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                   
                   {uploading && (
                      <div className="absolute inset-0 rounded-full bg-void/60 flex items-center justify-center">
                         <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <motion.div className="h-full bg-cyan" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} />
                         </div>
                      </div>
                   )}
                </div>

                <div className="flex-1 text-center md:text-left">
                   <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                      {editing ? (
                         <input
                           autoFocus
                           value={name}
                           onChange={e => setName(e.target.value)}
                           onBlur={handleUpdateProfile}
                           onKeyDown={e => e.key === 'Enter' && handleUpdateProfile()}
                           className="bg-white/5 border-b border-cyan text-xl font-heading font-bold text-white outline-none px-2"
                         />
                      ) : (
                         <h2 className="font-heading text-2xl font-bold text-white">{profile?.name}</h2>
                      )}
                      <button onClick={() => setEditing(!editing)} className="text-white/20 hover:text-white transition-colors">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                   </div>
                   <p className="text-sm text-white/40 mb-3">{user?.email}</p>
                   <Badge variant={profile?.role as any}>{profile?.role}</Badge>
                </div>
             </div>
           </GlassCard>
        </StaggerItem>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Stats Summary */}
           {profile?.role === 'student' && studentStats && (
              <StaggerItem>
                 <GlassCard padding="1.5rem" hover={false}>
                    <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider mb-6 opacity-30">Summary</h3>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Overall Avg</p>
                          <p className="text-2xl font-heading font-bold text-cyan">{studentStats.averageMarks.toFixed(1)}</p>
                       </div>
                       <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Reviewed</p>
                          <p className="text-2xl font-heading font-bold text-white">{studentStats.totalReviewed}/{studentStats.totalSubmitted}</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <p className="text-[10px] text-white/20 uppercase tracking-widest">Subject Averages</p>
                       {studentStats.subjectAverages.map(s => (
                          <div key={s.subject}>
                             <div className="flex justify-between items-center mb-1.5 px-1">
                                <span className="text-xs text-white/60 font-medium">{s.subject}</span>
                                <span className="text-[10px] text-cyan font-mono">{s.average.toFixed(0)}%</span>
                             </div>
                             <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${s.average}%` }}
                                  transition={{ duration: 1, delay: 0.5 }}
                                  className="h-full bg-gradient-to-r from-cyan/40 to-cyan shadow-[0_0_8px_rgba(0,229,255,0.3)]"
                                />
                             </div>
                          </div>
                       ))}
                    </div>
                 </GlassCard>
              </StaggerItem>
           )}

           {/* Enrolled Batches */}
           {profile?.role === 'student' && (
              <StaggerItem>
                 <GlassCard padding="1.5rem" hover={false}>
                    <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider mb-6 opacity-30">Enrolled Batches</h3>
                    <div className="space-y-3">
                       {enrolledBatches.length === 0 ? <p className="text-xs text-white/20 italic">No batches yet</p> : 
                        enrolledBatches.map((e, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                             <div>
                                <p className="text-xs font-bold text-white">{e.batches?.name}</p>
                                <p className="text-[10px] text-white/40">{e.batches?.profiles?.name}</p>
                             </div>
                             <Badge variant="info">{e.batches?.subject}</Badge>
                          </div>
                        ))
                       }
                    </div>
                 </GlassCard>
              </StaggerItem>
           )}
        </div>
      </div>
    </PageTransition>
  );
}
