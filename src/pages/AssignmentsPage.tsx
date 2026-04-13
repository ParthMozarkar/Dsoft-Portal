import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { FileDropZone } from '../components/ui/FileDropZone';
import { PageTransition, StaggerItem } from '../components/layout/PageTransition';
import { useMagneticCursor } from '../hooks/useMagneticCursor';
import type { Assignment } from '../types';

/* ── Types ───────────────────────────────────────── */
interface EnrichedAssignment extends Assignment {
  batch_name: string;
  submission_count?: number;
  enrolled_count?: number;
  student_status?: string | null;
}

interface BatchOption {
  id: string;
  name: string;
}

/* ── Helpers ─────────────────────────────────────── */
function dueDateColor(date: string): string {
  const h = (new Date(date).getTime() - Date.now()) / 3.6e6;
  if (h < 0) return 'text-white/30 line-through';
  if (h < 24) return 'text-danger';
  if (h < 72) return 'text-amber';
  return 'text-white/50';
}

function formatDue(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusBadge(status: string | null | undefined): React.ReactNode {
  if (!status) return <Badge variant="info">Not Submitted</Badge>;
  switch (status) {
    case 'pending':
      return <Badge variant="pending">Submitted</Badge>;
    case 'reviewed':
      return <Badge variant="success">Reviewed</Badge>;
    case 'resubmit':
      return <Badge variant="urgent">Resubmit</Badge>;
    default:
      return <Badge variant="info">{status}</Badge>;
  }
}

/* ══════════════════════════════════════════════════════
   ASSIGNMENTS LIST PAGE
   ══════════════════════════════════════════════════════ */
export function AssignmentsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin';

  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Create form
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const { x: magX, y: magY } = useMagneticCursor(btnRef);

  /* ── Fetch ─────────────────────────────────────── */
  const fetchAssignments = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    try {
      let batchIds: string[] = [];

      if (profile.role === 'student') {
        const { data: e } = await supabase.from('batch_enrollments').select('batch_id').eq('student_id', profile.id);
        batchIds = e?.map((x) => x.batch_id) ?? [];
      } else if (profile.role === 'teacher') {
        const { data: b } = await supabase.from('batches').select('id').eq('teacher_id', profile.id);
        batchIds = b?.map((x) => x.id) ?? [];
      } else {
        const { data: b } = await supabase.from('batches').select('id');
        batchIds = b?.map((x) => x.id) ?? [];
      }

      if (batchIds.length === 0) { setLoading(false); return; }

      const { data: batchData } = await supabase.from('batches').select('id, name').in('id', batchIds);
      const batchMap = new Map(batchData?.map((b) => [b.id, b.name]) ?? []);
      setBatches(batchData?.map((b) => ({ id: b.id, name: b.name })) ?? []);

      const { data: assignData } = await supabase
        .from('assignments')
        .select('*')
        .in('batch_id', batchIds)
        .order('due_date', { ascending: false });

      let enriched: EnrichedAssignment[] = (assignData ?? []).map((a) => ({
        ...a,
        batch_name: batchMap.get(a.batch_id) ?? 'Unknown',
      }));

      if (profile.role === 'student') {
        const assignIds = enriched.map((a) => a.id);
        if (assignIds.length > 0) {
          const { data: subs } = await supabase
            .from('submissions')
            .select('assignment_id, status')
            .eq('student_id', profile.id)
            .in('assignment_id', assignIds);
          const statusMap = new Map(subs?.map((s) => [s.assignment_id, s.status]) ?? []);
          enriched = enriched.map((a) => ({ ...a, student_status: statusMap.get(a.id) ?? null }));
        }
      } else {
        const assignIds = enriched.map((a) => a.id);
        if (assignIds.length > 0) {
          const { data: subs } = await supabase
            .from('submissions')
            .select('assignment_id')
            .in('assignment_id', assignIds);
          const countMap = new Map<string, number>();
          subs?.forEach((s) => countMap.set(s.assignment_id, (countMap.get(s.assignment_id) ?? 0) + 1));

          const { data: enrollments } = await supabase
            .from('batch_enrollments')
            .select('batch_id')
            .in('batch_id', batchIds);
          const enrollMap = new Map<string, number>();
          enrollments?.forEach((e) => enrollMap.set(e.batch_id, (enrollMap.get(e.batch_id) ?? 0) + 1));

          enriched = enriched.map((a) => ({
            ...a,
            submission_count: countMap.get(a.id) ?? 0,
            enrolled_count: enrollMap.get(a.batch_id) ?? 0,
          }));
        }
      }

      setAssignments(enriched);
    } catch (err) {
      console.error('Assignments fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  /* ── Create handler ────────────────────────────── */
  const handleCreate = async () => {
    if (!formTitle || !formBatch || !formDue || !profile) return;
    setCreating(true);

    try {
      let starterFileUrl: string | null = null;
      if (formFile) {
        const path = `${formBatch}/${crypto.randomUUID()}-${formFile.name}`;
        const { error } = await supabase.storage.from('assignment-starters').upload(path, formFile);
        if (error) { toast('Starter file upload failed', 'error'); return; }
        const { data } = supabase.storage.from('assignment-starters').getPublicUrl(path);
        starterFileUrl = data.publicUrl;
      }

      const { error } = await supabase.from('assignments').insert({
        batch_id: formBatch,
        created_by: profile.id,
        title: formTitle,
        description: formDesc || null,
        due_date: new Date(formDue).toISOString(),
        starter_file_url: starterFileUrl,
      });

      if (error) { toast('Create failed: ' + error.message, 'error'); return; }

      toast('Assignment created', 'success');
      setModalOpen(false);
      setFormTitle(''); setFormDesc(''); setFormBatch(''); setFormDue(''); setFormFile(null);
      fetchAssignments();
    } catch (err) {
      toast('Error creating assignment', 'error');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  /* ── Render ──────────────────── */
  const SkeletonGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <GlassCard key={i} padding="1.5rem" hover={false}>
          <div className="flex justify-between items-start mb-4">
            <Skeleton width="60%" height={24} />
            <Skeleton width={80} height={20} />
          </div>
          <Skeleton width="100%" height={16} className="mb-4" />
          <div className="flex items-center gap-4 mt-6">
            <Skeleton width={40} height={40} circle />
            <div className="flex-1 space-y-2">
              <Skeleton width="40%" height={10} />
              <Skeleton width="20%" height={10} />
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );

  const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/50 focus:bg-white/[0.06] transition-all duration-200';

  return (
    <PageTransition>
      <StaggerItem className="flex justify-end mb-8">
        {isTeacherOrAdmin && (
          <motion.button
            ref={btnRef}
            style={{ x: magX, y: magY }}
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-cyan text-void font-heading font-semibold text-sm hover:bg-cyan/90 transition-all flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Create Assignment
          </motion.button>
        )}
      </StaggerItem>

      {loading ? (
        <StaggerItem><SkeletonGrid /></StaggerItem>
      ) : assignments.length === 0 ? (
        <StaggerItem>
          <GlassCard hover={false}>
            <EmptyState
              title="No assignments yet"
              subtitle={isTeacherOrAdmin ? 'Create your first assignment' : 'Assignments will appear here'}
            />
          </GlassCard>
        </StaggerItem>
      ) : (
        <div className="space-y-3">
          {assignments.map((a, i) => {
            const isOverdue = new Date(a.due_date) < new Date();
            const isStudentOverdue = profile?.role === 'student' && isOverdue && !a.student_status;
            return (
              <StaggerItem key={a.id}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link to={`/assignments/${a.id}`}>
                    <GlassCard
                      padding="1.25rem"
                      className={`flex items-center gap-4 ${isStudentOverdue ? 'border-l-2 !border-l-danger glow-danger' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.8">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-heading font-semibold text-white truncate">{a.title}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">{a.batch_name}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className={`text-[12px] font-mono ${dueDateColor(a.due_date)}`}>{formatDue(a.due_date)}</span>
                        {profile?.role === 'student' ? statusBadge(a.student_status) : <span className="text-[12px] text-white/40">{a.submission_count ?? 0}/{a.enrolled_count ?? 0}</span>}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              </StaggerItem>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Assignment" maxWidth="520px">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Title</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className={inputClass} placeholder="Assignment title" />
          </div>
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Description</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className={`${inputClass} resize-none h-24`} placeholder="Optional description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Batch</label>
              <select value={formBatch} onChange={(e) => setFormBatch(e.target.value)} className={inputClass}>
                <option value="">Select batch</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Due Date</label>
              <input type="datetime-local" value={formDue} onChange={(e) => setFormDue(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Starter File (optional)</label>
            <FileDropZone onFile={setFormFile} currentFile={formFile} disabled={creating} />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !formTitle || !formBatch || !formDue}
            className="w-full py-3 rounded-xl font-heading font-semibold text-sm bg-cyan text-void hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {creating ? <><Spinner size="sm" />Creating…</> : 'Create Assignment'}
          </button>
        </div>
      </Modal>
    </PageTransition>
  );
}
