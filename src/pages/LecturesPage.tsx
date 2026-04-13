import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageTransition, StaggerItem } from '../components/layout/PageTransition';
import { VideoRoom } from '../components/lectures/VideoRoom';
import type { Lecture } from '../types';

/* ══════════════════════════════════════════════════════
   LECTURES PAGE
   ══════════════════════════════════════════════════════ */
export function LecturesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';

  const [lectures, setLectures] = useState<(Lecture & { batch_name: string })[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Live session
  const [activeSession, setActiveSession] = useState<Lecture | null>(null);
  const [joining, setJoining] = useState(false);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formDate, setFormDate] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const fetchLectures = useCallback(async () => {
    if (!profile) return;
    try {
      let batchIds: string[] = [];
      if (profile.role === 'student') {
        const { data: e } = await supabase.from('batch_enrollments').select('batch_id').eq('student_id', profile.id);
        batchIds = e?.map(x => x.batch_id) ?? [];
      } else {
        const { data: b } = await supabase.from('batches').select('id, name');
        batchIds = b?.map(x => x.id) ?? [];
        setBatches(b ?? []);
      }

      if (batchIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase.from('lectures').select('*, batches(name)').in('batch_id', batchIds).order('scheduled_at', { ascending: false });
      setLectures((data ?? []).map(l => ({ ...l, batch_name: (l.batches as any)?.name ?? 'Unknown' })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile]);

  useEffect(() => { fetchLectures(); }, [fetchLectures]);

  // Realtime subscription for live lectures
  useEffect(() => {
    const channel = supabase.channel('lectures-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lectures' }, (payload) => {
          setLectures(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async () => {
    if (!formTitle || !formBatch || !formDate || !profile) return;
    setScheduling(true);
    try {
      const { error } = await supabase.from('lectures').insert({
        title: formTitle,
        batch_id: formBatch,
        scheduled_at: new Date(formDate).toISOString(),
        status: 'scheduled'
      });
      if (error) throw error;
      toast('Lecture scheduled', 'success');
      setModalOpen(false);
      fetchLectures();
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setScheduling(false); }
  };

  const handleGoLive = async (l: Lecture) => {
    setJoining(true);
    try {
      // 1. Call Edge Function to create Daily room
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-daily-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ lectureId: l.id, batchId: l.batch_id })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Edge Function Error:', res.status, errorText);
        throw new Error(`Edge Function failed: ${res.status} ${errorText}`);
      }

      const room = await res.json();
      if (room.error) throw new Error(room.error);

      // 2. Update status to live
      await supabase.from('lectures').update({
        status: 'live',
        daily_room_url: room.url,
        daily_room_name: room.name
      }).eq('id', l.id);

      setActiveSession({ ...l, daily_room_url: room.url });
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setJoining(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const pastLectures = lectures.filter(l => l.status === 'ended');
  const upcomingLectures = lectures.filter(l => l.status !== 'ended');

  return (
    <PageTransition>
      {/* Active Session Overlay */}
      <AnimatePresence>
        {activeSession && (
          <VideoRoom
            url={activeSession.daily_room_url!}
            isTeacher={isTeacher}
            userName={profile?.name || 'User'}
            onLeave={() => {
                setActiveSession(null);
                fetchLectures();
            }}
          />
        )}
      </AnimatePresence>

      <StaggerItem className="flex justify-end mb-8">
        {isTeacher && (
          <button onClick={() => setModalOpen(true)} className="px-5 py-2.5 rounded-xl bg-cyan text-void font-heading font-semibold text-sm hover:bg-cyan/90 transition-all flex items-center gap-2">
            Schedule Lecture
          </button>
        )}
      </StaggerItem>

      {/* Upcoming / Live */}
      <div className="mb-12">
        <h3 className="font-heading text-lg font-bold text-white mb-6">Upcoming & Live</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {upcomingLectures.length === 0 ? (
             <GlassCard hover={false} className="col-span-full py-12">
               <EmptyState title="No upcoming lectures" subtitle="Lectures will appear here once scheduled." />
             </GlassCard>
           ) : (
             upcomingLectures.map(l => (
               <StaggerItem key={l.id}>
                 <GlassCard padding="1.5rem" className={l.status === 'live' ? 'glow-cyan border-l-2 border-l-cyan' : ''}>
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h4 className="font-heading font-bold text-white truncate">{l.title}</h4>
                       <p className="text-[12px] text-white/30">{l.batch_name}</p>
                     </div>
                     <Badge variant={l.status as any}>{l.status}</Badge>
                   </div>

                   <p className="text-sm font-mono text-white/60 mb-6">
                     {new Date(l.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                   </p>

                   {isTeacher ? (
                     <button
                       disabled={joining}
                       onClick={() => l.status === 'live' ? setActiveSession(l) : handleGoLive(l)}
                       className="w-full py-2.5 rounded-xl bg-cyan text-void font-heading font-bold text-sm hover:bg-cyan/90 transition-all flex items-center justify-center gap-2"
                     >
                       {joining ? <Spinner size="sm" /> : l.status === 'live' ? 'Join Session' : 'Go Live'}
                     </button>
                   ) : (
                     <button
                       disabled={l.status !== 'live'}
                       onClick={() => setActiveSession(l)}
                       className={`w-full py-2.5 rounded-xl font-heading font-bold text-sm transition-all ${l.status === 'live' ? 'bg-cyan text-void hover:bg-cyan/90' : 'bg-white/5 text-white/20 pointer-events-none'}`}
                     >
                       {l.status === 'live' ? 'Join Session' : 'Scheduled'}
                     </button>
                   )}
                 </GlassCard>
               </StaggerItem>
             ))
           )}
        </div>
      </div>

      {/* Archive */}
      <div>
        <h3 className="font-heading text-lg font-bold text-white mb-6">Past Lectures</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {pastLectures.map(l => (
             <StaggerItem key={l.id}>
               <GlassCard padding="0" className="overflow-hidden group">
                  <div className="aspect-video bg-white/5 flex items-center justify-center relative">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20 group-hover:text-cyan transition-colors"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                    {l.recording_url && (
                        <video src={l.recording_url} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-heading text-sm font-bold text-white truncate">{l.title}</h4>
                    <p className="text-[11px] text-white/30 truncate mb-3">{l.batch_name}</p>
                    <div className="flex justify-between items-center text-[10px] text-white/20">
                       <span>{new Date(l.scheduled_at).toLocaleDateString()}</span>
                       {l.recording_url ? (
                         <button onClick={() => window.open(l.recording_url!, '_blank')} className="text-cyan hover:underline">Watch Recording →</button>
                       ) : <span className="italic">Processing...</span>}
                    </div>
                  </div>
               </GlassCard>
             </StaggerItem>
           ))}
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Schedule Lecture">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 mb-2">Title</label>
            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan/50" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Batch</label>
            <select value={formBatch} onChange={e => setFormBatch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan/50">
               <option value="">Select Batch</option>
               {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Date & Time</label>
            <input type="datetime-local" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan/50" />
          </div>
          <button onClick={handleCreate} disabled={scheduling} className="w-full py-3 bg-cyan text-void rounded-xl font-bold font-heading hover:bg-cyan/90 transition-all">
            {scheduling ? <Spinner size="sm" /> : 'Schedule'}
          </button>
        </div>
      </Modal>
    </PageTransition>
  );
}
