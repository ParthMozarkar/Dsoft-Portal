import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageTransition, StaggerItem } from '../components/layout/PageTransition';

/* ── Types ───────────────────────────────────────── */
interface BatchWithMeta {
  id: string;
  name: string;
  subject: string;
  teacher_id: string;
  enrollment_code: string;
  created_at: string;
  teacher_name?: string;
  enrolled_count?: number;
  notes_count?: number;
  assignments_count?: number;
}

interface StudentEnrollment {
  id: string;
  student_id: string;
  name: string;
  email: string;
  enrolled_at: string;
}

/* ══════════════════════════════════════════════════════
   BATCH MANAGEMENT PAGE (ADMIN ONLY)
   ══════════════════════════════════════════════════════ */
export function BatchManagementPage() {
  const { toast } = useToast();

  const [batches, setBatches] = useState<BatchWithMeta[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchWithMeta | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formCode, setFormCode] = useState('');
  const [saving, setSaving] = useState(false);

  // Student list
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  /* ── Fetch ─────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      const [{ data: bData }, { data: tData }] = await Promise.all([
        supabase.from('batches').select(`
          *,
          profiles!teacher_id(name)
        `).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name').eq('role', 'teacher')
      ]);

      setTeachers(tData ?? []);

      if (bData) {
        // Enriched counts
        const [{ data: nCounts }, { data: aCounts }, { data: eCounts }] = await Promise.all([
          supabase.from('notes').select('batch_id'),
          supabase.from('assignments').select('batch_id'),
          supabase.from('batch_enrollments').select('batch_id')
        ]);

        const getCount = (arr: any[] | null, id: string) => arr?.filter(x => x.batch_id === id).length ?? 0;

        const enriched: BatchWithMeta[] = bData.map((b: any) => ({
          ...b,
          teacher_name: b.profiles?.[0]?.name ?? b.profiles?.name ?? 'Unassigned',
          enrolled_count: getCount(eCounts, b.id),
          notes_count: getCount(nCounts, b.id),
          assignments_count: getCount(aCounts, b.id)
        }));
        setBatches(enriched);
      }
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchStudents = async (batchId: string) => {
    setStudentsLoading(true);
    try {
      const { data } = await supabase
        .from('batch_enrollments')
        .select(`
          id,
          student_id,
          enrolled_at,
          profiles!student_id(name, user_id)
        `)
        .eq('batch_id', batchId);

      // Auth email requires separate call or profile mapping if emails are stored in profile
      setStudents((data ?? []).map((d: any) => ({
        id: d.id,
        student_id: d.student_id,
        name: d.profiles?.[0]?.name ?? d.profiles?.name ?? 'Unknown',
        email: 'Contact Admin',
        enrolled_at: d.enrolled_at
      })));
    } catch (err) { console.error(err); }
    finally { setStudentsLoading(false); }
  };

  /* ── Helpers ───────────────────────────────────── */
  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setFormCode(code);
  };

  const handleCreateOrUpdate = async () => {
    if (!formName || !formCode) return;
    setSaving(true);
    try {
      const payload = {
        name: formName,
        subject: formSubject,
        teacher_id: formTeacher || null,
        enrollment_code: formCode
      };

      if (editingBatch) {
        await supabase.from('batches').update(payload).eq('id', editingBatch.id);
        toast('Batch updated', 'success');
      } else {
        await supabase.from('batches').insert(payload);
        toast('Batch created', 'success');
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const resetForm = () => {
    setEditingBatch(null); setFormName(''); setFormSubject(''); setFormTeacher(''); setFormCode('');
  };

  const openEdit = (b: BatchWithMeta) => {
    setEditingBatch(b); setFormName(b.name); setFormSubject(b.subject);
    setFormTeacher(b.teacher_id || ''); setFormCode(b.enrollment_code);
    setModalOpen(true);
  };

  const handleDeleteSub = async (id: string) => {
    await supabase.from('batch_enrollments').delete().eq('id', id);
    if (expandedBatch) fetchStudents(expandedBatch);
    fetchData(); // Updated count
  };

  const handleDeleteBatch = async () => {
    if (!deleteTarget) return;
    await supabase.from('batches').delete().eq('id', deleteTarget);
    toast('Batch deleted', 'info');
    setDeleteTarget(null);
    fetchData();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast('Code copied', 'info');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/50 focus:bg-white/[0.06] transition-all duration-200';

  return (
    <PageTransition>
      <StaggerItem className="flex justify-end mb-8">
        <button
          onClick={() => { resetForm(); generateCode(); setModalOpen(true); }}
          className="px-5 py-2.5 rounded-xl bg-cyan text-void font-heading font-semibold text-sm hover:bg-cyan/90 transition-all flex items-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Create Batch
        </button>
      </StaggerItem>

      <div className="grid grid-cols-1 gap-6">
        {batches.length === 0 ? (
          <EmptyState title="No batches found" subtitle="Create one to start organizing students." />
        ) : (
          batches.map(b => (
            <StaggerItem key={b.id}>
              <GlassCard padding="1.5rem" hover={false}>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-heading text-lg font-bold text-white">{b.name}</h3>
                      <Badge variant="info">{b.subject}</Badge>
                    </div>
                    <p className="text-sm text-white/30">Teacher: <span className="text-white/60 font-medium">{b.teacher_name}</span></p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-2 rounded-xl border border-white/[0.06] text-white/30 hover:text-white transition-all"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b.id)}
                      className="p-2 rounded-xl border border-danger/20 text-danger/40 hover:text-danger transition-all"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Students</p>
                    <p className="text-xl font-heading font-bold text-white">{b.enrolled_count}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Notes</p>
                    <p className="text-xl font-heading font-bold text-purple">{b.notes_count}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Assignments</p>
                    <p className="text-xl font-heading font-bold text-amber">{b.assignments_count}</p>
                  </div>
                </div>

                {/* Code Share */}
                <div className="flex items-center gap-4">
                   <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                     <span className="text-xs font-mono text-cyan/80 tracking-widest">{b.enrollment_code}</span>
                     <button
                       onClick={() => copyCode(b.enrollment_code)}
                       className="text-white/30 hover:text-cyan transition-colors"
                     >
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                     </button>
                   </div>

                   <button
                    onClick={() => {
                        if (expandedBatch === b.id) setExpandedBatch(null);
                        else { setExpandedBatch(b.id); fetchStudents(b.id); }
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                        expandedBatch === b.id ? 'bg-white text-void border-white' : 'bg-transparent text-white/60 border-white/[0.08] hover:text-white'
                    }`}
                   >
                     {expandedBatch === b.id ? 'Close List' : 'View Students'}
                   </button>
                </div>

                {/* Inline Students List */}
                <AnimatePresence>
                  {expandedBatch === b.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-6"
                    >
                      <div className="pt-4 border-t border-white/[0.06]">
                        {studentsLoading ? <Spinner size="sm" /> :
                         students.length === 0 ? <p className="text-xs text-white/20 py-4 text-center italic">No students enrolled yet</p> : (
                           <div className="space-y-2">
                             {students.map(s => (
                               <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                                 <div>
                                    <p className="text-xs font-medium text-white">{s.name}</p>
                                    <p className="text-[10px] text-white/30">{new Date(s.enrolled_at).toLocaleDateString()}</p>
                                 </div>
                                 <button
                                   onClick={() => handleDeleteSub(s.id)}
                                   className="text-white/10 hover:text-danger transition-colors p-1"
                                 >
                                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                 </button>
                               </div>
                             ))}
                           </div>
                         )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </StaggerItem>
          ))
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingBatch ? 'Edit Batch' : 'Create Batch'} maxWidth="480px">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Batch Name</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} placeholder="e.g. Master React 2026" />
          </div>
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Subject</label>
            <input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} className={inputClass} placeholder="e.g. Web Development" />
          </div>
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Assign Teacher</label>
            <select value={formTeacher} onChange={(e) => setFormTeacher(e.target.value)} className={inputClass}>
              <option value="">Select Teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Enrollment Code</label>
            <div className="flex gap-2">
              <input value={formCode} readOnly className={`${inputClass} font-mono flex-1 text-cyan/80`} />
              <button
                onClick={generateCode}
                className="px-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white hover:bg-white/[0.08]"
              >
                Reset
              </button>
            </div>
          </div>

          <button
            onClick={handleCreateOrUpdate}
            disabled={saving || !formName || !formCode}
            className="w-full py-3 rounded-xl bg-cyan text-void font-heading font-semibold text-sm hover:bg-cyan/90 transition-all"
          >
            {editingBatch ? 'Update Batch' : 'Create Batch'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Batch"
        message="This action is irreversible. All associated data (notes, assignments) will be removed."
        onConfirm={handleDeleteBatch}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageTransition>
  );
}
