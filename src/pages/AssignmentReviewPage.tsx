import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { Spinner } from '../components/ui/Spinner';
import { PageTransition, StaggerItem } from '../components/layout/PageTransition';
import type { Submission } from '../types';

/* ══════════════════════════════════════════════════════
   ASSIGNMENT REVIEW PAGE (Teacher Only)
   ══════════════════════════════════════════════════════ */
export function AssignmentReviewPage() {
  const { id: assignmentId, submissionId } = useParams<{ id: string; submissionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [studentName, setStudentName] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // Review form
  const [marks, setMarks] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'reviewed' | 'resubmit'>('reviewed');
  const [saving, setSaving] = useState(false);

  // Signed URL for preview
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: s } = await supabase.from('submissions').select('*').eq('id', submissionId!).single();
        setSubmission(s);

        if (s) {
          if (s.marks !== null) setMarks(s.marks);
          if (s.remarks) setRemarks(s.remarks);
          if (s.status === 'resubmit') setStatus('resubmit');

          // Student name
          const { data: p } = await supabase.from('profiles').select('name').eq('id', s.student_id).single();
          setStudentName(p?.name ?? 'Unknown');

          // Assignment title
          const { data: a } = await supabase.from('assignments').select('title').eq('id', s.assignment_id).single();
          setAssignmentTitle(a?.title ?? 'Unknown');

          // Get signed URL
          const pathMatch = s.file_url.split('/submissions/')[1];
          if (pathMatch) {
            const { data: urlData } = await supabase.storage
              .from('submissions')
              .createSignedUrl(decodeURIComponent(pathMatch), 300);
            if (urlData?.signedUrl) setFileUrl(urlData.signedUrl);
          }
          if (!fileUrl) setFileUrl(s.file_url);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [submissionId]);

  const handleSave = async () => {
    if (!submission) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          marks,
          remarks: remarks || null,
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (error) {
        toast('Failed to save review: ' + error.message, 'error');
        return;
      }

      toast('Review saved successfully', 'success');
      navigate(`/assignments/${assignmentId}`, { replace: true });
    } catch (err) {
      toast('Error saving review', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (!submission) return <div className="text-center text-white/40">Submission not found</div>;

  const isPdf = fileUrl.toLowerCase().includes('.pdf');
  const ringPercent = Math.min(marks, 100);
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (ringPercent / 100) * circumference;

  const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/50 focus:bg-white/[0.06] transition-all duration-200';

  return (
    <PageTransition>
      <StaggerItem>
        <Link
          to={`/assignments/${assignmentId}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white mb-6 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back to {assignmentTitle}
        </Link>
      </StaggerItem>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: File Preview ─────────────────── */}
        <StaggerItem className="lg:col-span-3">
          <GlassCard padding="0" hover={false} className="overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="font-heading text-base font-semibold text-white">Student Submission</h3>
            </div>

            {isPdf && fileUrl ? (
              <iframe
                src={fileUrl}
                className="w-full h-[600px] border-0 bg-white/[0.02]"
                title="Submission Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan/10 text-cyan text-sm hover:bg-cyan/20 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download File
                </a>
                <p className="text-[12px] text-white/20 mt-3">File preview not available for this format</p>
              </div>
            )}

            {/* Student note */}
            {submission.student_note && (
              <div className="px-5 py-4 border-t border-white/[0.06]">
                <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Student's Note</p>
                <p className="text-sm text-white/60">{submission.student_note}</p>
              </div>
            )}
          </GlassCard>
        </StaggerItem>

        {/* ── Right: Review Form ─────────────────── */}
        <StaggerItem className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <GlassCard padding="1.5rem" hover={false}>
              {/* Student info */}
              <div className="mb-5 pb-4 border-b border-white/[0.06]">
                <p className="font-heading text-lg font-semibold text-white mb-1">{studentName}</p>
                <p className="text-[12px] text-white/30">
                  Submitted {new Date(submission.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>

              {/* Marks with animated ring */}
              <div className="flex items-center gap-5 mb-6">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                    {/* Track */}
                    <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    {/* Fill */}
                    <circle
                      cx="48"
                      cy="48"
                      r="44"
                      fill="none"
                      stroke="#00E5FF"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-heading font-bold text-white">{marks}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Marks (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={marks}
                    onChange={(e) => setMarks(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="mb-5">
                <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className={`${inputClass} resize-none h-28`}
                  placeholder="Feedback for the student..."
                />
              </div>

              {/* Status selector */}
              <div className="mb-6">
                <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus('reviewed')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      status === 'reviewed'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    ✓ Reviewed
                  </button>
                  <button
                    onClick={() => setStatus('resubmit')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      status === 'resubmit'
                        ? 'bg-amber/20 text-amber border border-amber/30'
                        : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    ↩ Resubmit
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl font-heading font-semibold text-sm bg-cyan text-void hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {saving ? <><Spinner size="sm" />Saving…</> : 'Submit Review'}
              </button>
            </GlassCard>
          </div>
        </StaggerItem>
      </div>
    </PageTransition>
  );
}
