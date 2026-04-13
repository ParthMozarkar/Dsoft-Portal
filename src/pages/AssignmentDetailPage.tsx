import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { FileDropZone } from '../components/ui/FileDropZone';
import { PageTransition, StaggerItem } from '../components/layout/PageTransition';
import type { Assignment, Submission } from '../types';

/* ── Types ───────────────────────────────────────── */
interface BatchInfo { id: string; name: string; }

interface SubmissionRow extends Submission {
  student_name?: string;
}

/* ══════════════════════════════════════════════════════
   ASSIGNMENT DETAIL PAGE
   ══════════════════════════════════════════════════════ */
export function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();

  if (profile?.role === 'student') {
    return <StudentView assignmentId={id!} profileId={profile.id} />;
  }
  return <TeacherView assignmentId={id!} />;
}

/* ══════════════════════════════════════════════════════
   STUDENT VIEW
   ══════════════════════════════════════════════════════ */
function StudentView({ assignmentId, profileId }: { assignmentId: string; profileId: string }) {
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  // Submit form
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data: a } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
      setAssignment(a);

      if (a) {
        const { data: b } = await supabase.from('batches').select('id, name').eq('id', a.batch_id).single();
        setBatch(b);
      }

      const { data: s } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', profileId)
        .maybeSingle();
      setSubmission(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, profileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!file || !assignment) return;
    setSubmitting(true);

    try {
      const path = `${assignmentId}/${profileId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('submissions').upload(path, file);
      if (uploadErr) { toast('Upload failed: ' + uploadErr.message, 'error'); return; }

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);

      const row = {
        assignment_id: assignmentId,
        student_id: profileId,
        file_url: urlData.publicUrl,
        student_note: note || null,
        status: 'pending' as const,
        submitted_at: new Date().toISOString(),
      };

      if (submission) {
        // Upsert (resubmit)
        const { error } = await supabase
          .from('submissions')
          .update({ ...row, marks: null, remarks: null, reviewed_at: null })
          .eq('id', submission.id);
        if (error) { toast('Resubmit failed: ' + error.message, 'error'); return; }
      } else {
        const { error } = await supabase.from('submissions').insert(row);
        if (error) { toast('Submit failed: ' + error.message, 'error'); return; }
      }

      toast('Submission uploaded!', 'success');
      setFile(null);
      setNote('');
      fetchData();
    } catch (err) {
      toast('Error submitting', 'error');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (fileUrl: string, bucket: string) => {
    const pathMatch = fileUrl.split(`/${bucket}/`)[1];
    if (pathMatch) {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(decodeURIComponent(pathMatch), 60);
      if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); return; }
    }
    window.open(fileUrl, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (!assignment) return <EmptyState title="Assignment not found" />;

  const canSubmit = !submission || submission.status === 'resubmit';
  const isResubmit = submission?.status === 'resubmit';

  const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/50 focus:bg-white/[0.06] transition-all duration-200';

  return (
    <PageTransition>
      {/* Back link */}
      <StaggerItem>
        <Link to="/assignments" className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white mb-6 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back to Assignments
        </Link>
      </StaggerItem>

      {/* Assignment info */}
      <StaggerItem>
        <GlassCard padding="1.5rem" hover={false} className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-white mb-1">{assignment.title}</h2>
              <p className="text-[12px] text-white/30">{batch?.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[11px] text-white/30 uppercase tracking-wider">Due</p>
              <p className="text-sm font-mono text-white/60">
                {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
          {assignment.description && (
            <p className="text-sm text-white/50 leading-relaxed mb-4">{assignment.description}</p>
          )}
          {assignment.starter_file_url && (
            <button
              onClick={() => handleDownload(assignment.starter_file_url!, 'assignment-starters')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-cyan text-[13px] hover:bg-white/[0.08] transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Download Starter File
            </button>
          )}
        </GlassCard>
      </StaggerItem>

      {/* Submission section */}
      <StaggerItem>
        <GlassCard padding="1.5rem" hover={false}>
          <h3 className="font-heading text-base font-semibold text-white mb-4">Your Submission</h3>

          {canSubmit ? (
            <>
              {/* Resubmit remarks */}
              {isResubmit && submission?.remarks && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-amber/10 border border-amber/20">
                  <p className="text-[12px] text-amber uppercase tracking-wider font-medium mb-1">Teacher Feedback</p>
                  <p className="text-sm text-white/70">{submission.remarks}</p>
                </div>
              )}

              <div className="space-y-4">
                <FileDropZone onFile={setFile} currentFile={file} disabled={submitting} label="Drop your submission file here" />
                <div>
                  <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Note (optional)</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} resize-none h-20`} placeholder="Any comments for your teacher..." />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !file}
                  className="w-full py-3 rounded-xl font-heading font-semibold text-sm bg-cyan text-void hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <><Spinner size="sm" />Submitting…</> : isResubmit ? 'Resubmit' : 'Submit Assignment'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                {submission && (
                  <>
                    {submission.status === 'reviewed' ? <Badge variant="success">Reviewed</Badge> : <Badge variant="pending">Submitted</Badge>}
                    <span className="text-[12px] text-white/30">
                      {new Date(submission.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>

              {submission?.file_url && (
                <button
                  onClick={() => handleDownload(submission.file_url, 'submissions')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-cyan text-[13px] hover:bg-white/[0.08] transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                  View Submission
                </button>
              )}

              {/* Marks display */}
              {submission?.status === 'reviewed' && submission.marks !== null && (
                <div className="flex items-center gap-6 mt-4">
                  <div className="text-center">
                    <p className="text-4xl font-heading font-bold text-cyan">{submission.marks}</p>
                    <p className="text-[11px] text-white/30 uppercase tracking-wider">Marks</p>
                  </div>
                  {submission.remarks && (
                    <div className="flex-1">
                      <p className="text-[12px] text-white/40 uppercase tracking-wider mb-1">Remarks</p>
                      <p className="text-sm text-white/70">{submission.remarks}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </StaggerItem>
    </PageTransition>
  );
}

/* ══════════════════════════════════════════════════════
   TEACHER VIEW — Submissions List
   ══════════════════════════════════════════════════════ */
function TeacherView({ assignmentId }: { assignmentId: string }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: a } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
        setAssignment(a);

        if (a) {
          const { data: b } = await supabase.from('batches').select('id, name').eq('id', a.batch_id).single();
          setBatch(b);
        }

        const { data: subs } = await supabase
          .from('submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });

        // Fetch student names
        const studentIds = [...new Set(subs?.map((s) => s.student_id) ?? [])];
        let profileMap = new Map<string, string>();
        if (studentIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', studentIds);
          profileMap = new Map(profiles?.map((p) => [p.id, p.name]) ?? []);
        }

        setSubmissions(
          (subs ?? []).map((s) => ({ ...s, student_name: profileMap.get(s.student_id) ?? 'Unknown' }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [assignmentId]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (!assignment) return <EmptyState title="Assignment not found" />;

  return (
    <PageTransition>
      <StaggerItem>
        <Link to="/assignments" className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white mb-6 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back to Assignments
        </Link>
      </StaggerItem>

      {/* Assignment info */}
      <StaggerItem>
        <GlassCard padding="1.5rem" hover={false} className="mb-6">
          <h2 className="font-heading text-xl font-bold text-white mb-1">{assignment.title}</h2>
          <p className="text-[12px] text-white/30 mb-2">{batch?.name}</p>
          {assignment.description && <p className="text-sm text-white/50">{assignment.description}</p>}
        </GlassCard>
      </StaggerItem>

      {/* Submissions table */}
      <StaggerItem>
        <GlassCard padding="0" hover={false}>
          <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
            <h3 className="font-heading text-base font-semibold text-white">
              Submissions ({submissions.length})
            </h3>
          </div>

          {submissions.length === 0 ? (
            <EmptyState title="No submissions yet" subtitle="Students haven't submitted yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left px-5 py-3 text-[11px] text-white/30 uppercase tracking-wider font-medium">Student</th>
                    <th className="text-left px-5 py-3 text-[11px] text-white/30 uppercase tracking-wider font-medium">Submitted</th>
                    <th className="text-left px-5 py-3 text-[11px] text-white/30 uppercase tracking-wider font-medium">Status</th>
                    <th className="text-left px-5 py-3 text-[11px] text-white/30 uppercase tracking-wider font-medium">Marks</th>
                    <th className="text-right px-5 py-3 text-[11px] text-white/30 uppercase tracking-wider font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3 text-sm text-white">{s.student_name}</td>
                      <td className="px-5 py-3 text-[12px] text-white/40">
                        {new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={s.status === 'reviewed' ? 'success' : s.status === 'resubmit' ? 'urgent' : 'pending'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-sm text-white/60 font-mono">{s.marks ?? '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/assignments/${assignmentId}/review/${s.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-cyan hover:bg-cyan/10 transition-all"
                        >
                          Review →
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </StaggerItem>
    </PageTransition>
  );
}
