import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Skeleton } from '../components/ui/Skeleton';
import { PageTransition, StaggerItem } from '../components/layout/PageTransition';
import type { Assignment, Note, Notice, Lecture, Submission } from '../types';

/* ══════════════════════════════════════════════════════
   STUDENT DASHBOARD
   ══════════════════════════════════════════════════════ */

interface StudentStats {
  upcomingDeadlines: number;
  notesAvailable: number;
  submittedCount: number;
}

interface UpcomingAssignment extends Assignment {
  batch_name?: string;
  submission_status?: string | null;
}

function StudentDashboard({ profileId }: { profileId: string }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentStats>({ upcomingDeadlines: 0, notesAvailable: 0, submittedCount: 0 });
  const [assignments, setAssignments] = useState<UpcomingAssignment[]>([]);
  const [notes, setNotes] = useState<(Note & { batch_name?: string })[]>([]);
  const [nextLecture, setNextLecture] = useState<(Lecture & { batch_name?: string }) | null>(null);
  const [unreadNotices, setUnreadNotices] = useState<(Notice & { batch_name?: string })[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);


  const fetchData = useCallback(async () => {
    try {
      const { data: enrollments } = await supabase
        .from('batch_enrollments')
        .select('batch_id')
        .eq('student_id', profileId);

      const batchIds = enrollments?.map((e) => e.batch_id) ?? [];
      if (batchIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: batches } = await supabase
        .from('batches')
        .select('id, name')
        .in('id', batchIds);
      const batchMap = new Map(batches?.map((b) => [b.id, b.name]) ?? []);

      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('*')
        .in('batch_id', batchIds)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(10);

      const { data: submissionData } = await supabase
        .from('submissions')
        .select('assignment_id, status')
        .eq('student_id', profileId);

      const submissionMap = new Map(
        submissionData?.map((s) => [s.assignment_id, s.status]) ?? []
      );

      const enrichedAssignments: UpcomingAssignment[] = (assignmentData ?? []).map((a) => ({
        ...a,
        batch_name: batchMap.get(a.batch_id) ?? 'Unknown',
        submission_status: submissionMap.get(a.id) ?? null,
      }));

      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .in('batch_id', batchIds)
        .order('created_at', { ascending: false })
        .limit(5);

      const enrichedNotes = (notesData ?? []).map((n) => ({
        ...n,
        batch_name: batchMap.get(n.batch_id) ?? 'Unknown',
      }));

      const { data: noticesData } = await supabase
        .from('notices')
        .select('*')
        .in('batch_id', batchIds)
        .order('created_at', { ascending: false });

      const { data: readsData } = await supabase
        .from('notice_reads')
        .select('notice_id')
        .eq('user_id', user?.id ?? '');

      const readSet = new Set(readsData?.map((r) => r.notice_id) ?? []);
      const unread = (noticesData ?? [])
        .filter((n) => !readSet.has(n.id))
        .map((n) => ({ ...n, batch_name: batchMap.get(n.batch_id) ?? 'Unknown' }));

      const { data: lectureData } = await supabase
        .from('lectures')
        .select('*')
        .in('batch_id', batchIds)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true })
        .limit(1);

      const nextLec = lectureData?.[0]
        ? { ...lectureData[0], batch_name: batchMap.get(lectureData[0].batch_id) ?? 'Unknown' }
        : null;

      setStats({
        upcomingDeadlines: enrichedAssignments.length,
        notesAvailable: enrichedNotes.length,
        submittedCount: submissionData?.length ?? 0,
      });
      setAssignments(enrichedAssignments);
      setNotes(enrichedNotes);
      setUnreadNotices(unread);
      setNextLecture(nextLec);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markNoticesRead = async () => {
    if (!user || unreadNotices.length === 0) return;
    const inserts = unreadNotices.map((n) => ({ notice_id: n.id, user_id: user.id }));
    await supabase.from('notice_reads').insert(inserts);
    setUnreadNotices([]);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton height="100px" />
          <Skeleton height="100px" />
          <Skeleton height="100px" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton height="300px" className="lg:col-span-3" />
          <Skeleton height="300px" className="lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StaggerItem>
          <StatCard
            label="Upcoming Deadlines"
            value={stats.upcomingDeadlines}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            }
            glowClass="glow-amber"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Notes Available"
            value={stats.notesAvailable}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
            }
            glowClass="glow-cyan"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Assignments Submitted"
            value={stats.submittedCount}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
            }
            glowClass="glow-cyan"
          />
        </StaggerItem>
      </div>

      {/* Row 2 — Assignments + Lecture */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        {/* Left: Upcoming Assignments */}
        <StaggerItem className="lg:col-span-3">
          <GlassCard padding="0" hover={false}>
            <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
              <h3 className="font-heading text-base font-semibold text-white">Upcoming Assignments</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {assignments.length === 0 ? (
                <EmptyState title="No upcoming assignments" subtitle="You're all caught up!" />
              ) : (
                assignments.map((a) => (
                  <Link
                    key={a.id}
                    to={`/assignments/${a.id}`}
                    className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate group-hover:text-cyan transition-colors">
                        {a.title}
                      </p>
                      <p className="text-[11px] text-white/30 mt-0.5">{a.batch_name}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <DueDateLabel date={a.due_date} />
                      {a.submission_status ? (
                        <Badge variant={a.submission_status === 'reviewed' ? 'success' : 'pending'}>
                          {a.submission_status}
                        </Badge>
                      ) : (
                        <Badge variant="info">new</Badge>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </GlassCard>
        </StaggerItem>

        {/* Right: Next Lecture */}
        <StaggerItem className="lg:col-span-2">
          <GlassCard padding="1.5rem" hover={false} className="h-full">
            <h3 className="font-heading text-base font-semibold text-white mb-4">Next Lecture</h3>
            {nextLecture ? (
              <NextLectureCard lecture={nextLecture} />
            ) : (
              <EmptyState title="No upcoming lectures" subtitle="None scheduled yet" />
            )}
          </GlassCard>
        </StaggerItem>
      </div>

      {/* Row 3 — Recent Notes (horizontal scroll) */}
      <StaggerItem>
        <h3 className="font-heading text-base font-semibold text-white mb-3">Recent Notes</h3>
        {notes.length === 0 ? (
          <GlassCard hover={false}>
            <EmptyState title="No notes yet" subtitle="Notes will appear here when your teacher uploads them" />
          </GlassCard>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
            {notes.map((n) => (
              <motion.div
                key={n.id}
                className="flex-shrink-0 w-56"
                whileHover={{ y: -2 }}
              >
                <GlassCard padding="1.25rem">
                  <p className="text-sm font-medium text-white truncate mb-1">{n.title}</p>
                  <div className="flex items-center gap-2 mb-3">
                    {n.subject && <Badge variant="info">{n.subject}</Badge>}
                  </div>
                  <p className="text-[11px] text-white/30">{n.batch_name}</p>
                  <a
                    href={n.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-cyan hover:text-cyan/80 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Download
                  </a>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </StaggerItem>

      {/* ── Floating Notice Orb ──────────────────── */}
      {unreadNotices.length > 0 && (
        <>
          <motion.button
            onClick={() => {
              setDrawerOpen(true);
              markNoticesRead();
            }}
            className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-cyan/20 border border-cyan/30 flex items-center justify-center z-40 cursor-pointer"
            animate={{
              boxShadow: [
                '0 0 20px rgba(0,229,255,0.2)',
                '0 0 40px rgba(0,229,255,0.4)',
                '0 0 20px rgba(0,229,255,0.2)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            whileHover={{ scale: 1.1 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {unreadNotices.length}
            </span>
          </motion.button>

          {/* Notice Drawer */}
          <AnimatePresence>
            {drawerOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-40"
                  onClick={() => setDrawerOpen(false)}
                />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="fixed right-0 top-0 h-screen w-full max-w-sm bg-[#0c0c0c] border-l border-white/[0.06] z-50 overflow-y-auto"
                >
                  <div className="px-5 py-5 border-b border-white/[0.06] flex items-center justify-between">
                    <h3 className="font-heading text-lg font-semibold text-white">Notices</h3>
                    <button
                      onClick={() => setDrawerOpen(false)}
                      className="p-1 rounded text-white/40 hover:text-white transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                  {unreadNotices.map((n) => (
                    <div key={n.id} className="px-5 py-4 border-b border-white/[0.04]">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-medium text-white">{n.title}</h4>
                        <Badge variant={n.urgency}>{n.urgency}</Badge>
                      </div>
                      <p className="text-[13px] text-white/50 line-clamp-3">{n.body}</p>
                      <p className="text-[11px] text-white/20 mt-2">{n.batch_name}</p>
                    </div>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </PageTransition>
  );
}

/* ══════════════════════════════════════════════════════
   TEACHER DASHBOARD
   ══════════════════════════════════════════════════════ */

interface TeacherBatch {
  id: string;
  name: string;
  subject: string;
  student_count: number;
  upcoming_assignments: number;
}

interface PendingReview {
  id: string;
  student_name: string;
  assignment_title: string;
  assignment_id: string;
  submitted_at: string;
}

interface ActivityItem {
  id: string;
  student_name: string;
  assignment_title: string;
  time: string;
}

function TeacherDashboard({ profileId }: { profileId: string }) {
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeBatches, setActiveBatches] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [lecturesThisWeek, setLecturesThisWeek] = useState(0);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [batchCards, setBatchCards] = useState<TeacherBatch[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // 1. Teacher's batches
      const { data: batches } = await supabase
        .from('batches')
        .select('id, name, subject')
        .eq('teacher_id', profileId);

      const batchIds = batches?.map((b) => b.id) ?? [];
      setActiveBatches(batchIds.length);

      if (batchIds.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Student counts
      const { data: enrollments } = await supabase
        .from('batch_enrollments')
        .select('batch_id, student_id')
        .in('batch_id', batchIds);

      const countByBatch = new Map<string, number>();
      let total = 0;
      enrollments?.forEach((e) => {
        countByBatch.set(e.batch_id, (countByBatch.get(e.batch_id) ?? 0) + 1);
        total++;
      });
      setTotalStudents(total);

      // 3. Upcoming assignment counts per batch
      const { data: allAssignments } = await supabase
        .from('assignments')
        .select('id, batch_id, title')
        .in('batch_id', batchIds)
        .gte('due_date', new Date().toISOString());

      const assignCountByBatch = new Map<string, number>();
      allAssignments?.forEach((a) => {
        assignCountByBatch.set(a.batch_id, (assignCountByBatch.get(a.batch_id) ?? 0) + 1);
      });

      // Build batch cards
      const cards: TeacherBatch[] = (batches ?? []).map((b) => ({
        ...b,
        student_count: countByBatch.get(b.id) ?? 0,
        upcoming_assignments: assignCountByBatch.get(b.id) ?? 0,
      }));
      setBatchCards(cards);

      // 4. All assignment IDs for this teacher's batches
      const { data: allBatchAssignments } = await supabase
        .from('assignments')
        .select('id, title, batch_id')
        .in('batch_id', batchIds);

      const assignmentIds = allBatchAssignments?.map((a) => a.id) ?? [];
      const assignmentMap = new Map(allBatchAssignments?.map((a) => [a.id, a]) ?? []);

      // 5. Pending submissions
      if (assignmentIds.length > 0) {
        const { data: pendingSubs } = await supabase
          .from('submissions')
          .select('id, assignment_id, student_id, submitted_at')
          .in('assignment_id', assignmentIds)
          .eq('status', 'pending')
          .order('submitted_at', { ascending: true })
          .limit(20);

        // Get student names
        const studentIds = [...new Set(pendingSubs?.map((s) => s.student_id) ?? [])];
        const { data: profiles } = studentIds.length > 0
          ? await supabase.from('profiles').select('id, name').in('id', studentIds)
          : { data: [] };
        const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) ?? []);

        const reviews: PendingReview[] = (pendingSubs ?? []).map((s) => ({
          id: s.id,
          student_name: profileMap.get(s.student_id) ?? 'Unknown',
          assignment_title: assignmentMap.get(s.assignment_id)?.title ?? 'Unknown',
          assignment_id: s.assignment_id,
          submitted_at: s.submitted_at,
        }));
        setPendingReviews(reviews);
        setPendingReviewsCount(reviews.length);
      }

      // 6. Lectures this week
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const { data: lectures, count: lectureCount } = await supabase
        .from('lectures')
        .select('*', { count: 'exact', head: true })
        .in('batch_id', batchIds)
        .gte('scheduled_at', new Date().toISOString())
        .lte('scheduled_at', weekEnd.toISOString());

      setLecturesThisWeek(lectureCount ?? lectures?.length ?? 0);
    } catch (err) {
      console.error('Teacher dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for new submissions
  useEffect(() => {
    const channel = supabase
      .channel('teacher-submissions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        async (payload) => {
          const sub = payload.new as Submission;
          // Fetch student name & assignment title
          const [{ data: profile }, { data: assignment }] = await Promise.all([
            supabase.from('profiles').select('name').eq('id', sub.student_id).single(),
            supabase.from('assignments').select('title').eq('id', sub.assignment_id).single(),
          ]);

          const newItem: ActivityItem = {
            id: sub.id,
            student_name: profile?.name ?? 'Unknown',
            assignment_title: assignment?.title ?? 'Unknown',
            time: new Date().toLocaleTimeString(),
          };

          setActivityFeed((prev) => [newItem, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <PageTransition>
      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StaggerItem>
          <StatCard
            label="Total Students"
            value={totalStudents}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
            glowClass="glow-cyan"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Active Batches"
            value={activeBatches}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>}
            glowClass="glow-purple"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Pending Reviews"
            value={pendingReviewsCount}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
            glowClass={pendingReviewsCount > 0 ? 'glow-amber' : ''}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Lectures This Week"
            value={lecturesThisWeek}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" /></svg>}
            glowClass="glow-cyan"
          />
        </StaggerItem>
      </div>

      {/* Row 2 — Pending Reviews */}
      <StaggerItem className="mb-8">
        <GlassCard padding="0" hover={false}>
          <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
            <h3 className="font-heading text-base font-semibold text-white">Pending Reviews</h3>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {pendingReviews.length === 0 ? (
              <EmptyState title="All reviewed" subtitle="No pending submissions" />
            ) : (
              pendingReviews.map((r) => (
                <Link
                  key={r.id}
                  to={`/assignments/${r.assignment_id}/review`}
                  className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <div>
                    <p className="text-sm text-white font-medium">{r.student_name}</p>
                    <p className="text-[11px] text-white/30">{r.assignment_title}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-white/20">{timeAgo(r.submitted_at)}</span>
                    <span className="text-[12px] text-cyan">Review →</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Row 3 — Realtime Activity Feed */}
      <StaggerItem className="mb-8">
        <GlassCard padding="0" hover={false}>
          <div className="px-5 pt-5 pb-3 border-b border-white/[0.06] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-heading text-base font-semibold text-white">Live Activity</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {activityFeed.length === 0 ? (
              <EmptyState title="No recent activity" subtitle="Submissions will appear here in realtime" />
            ) : (
              <AnimatePresence>
                {activityFeed.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-5 py-3 border-b border-white/[0.04]"
                  >
                    <p className="text-sm text-white/70">
                      <span className="text-white font-medium">{item.student_name}</span>
                      {' submitted '}
                      <span className="text-cyan">{item.assignment_title}</span>
                    </p>
                    <p className="text-[11px] text-white/20 mt-0.5">{item.time}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Row 4 — Batch Overview */}
      <StaggerItem>
        <h3 className="font-heading text-base font-semibold text-white mb-3">Your Batches</h3>
        {batchCards.length === 0 ? (
          <GlassCard hover={false}>
            <EmptyState title="No batches yet" subtitle="Create a batch to get started" />
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchCards.map((b) => (
              <GlassCard key={b.id} padding="1.25rem">
                <h4 className="text-sm font-heading font-semibold text-white mb-1">{b.name}</h4>
                <Badge variant="info">{b.subject}</Badge>
                <div className="flex gap-6 mt-4 text-[12px]">
                  <div>
                    <p className="text-white/30">Students</p>
                    <p className="text-white font-semibold text-lg">{b.student_count}</p>
                  </div>
                  <div>
                    <p className="text-white/30">Upcoming</p>
                    <p className="text-white font-semibold text-lg">{b.upcoming_assignments}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </StaggerItem>
    </PageTransition>
  );
}

/* ══════════════════════════════════════════════════════
   ADMIN DASHBOARD (same as teacher + management)
   ══════════════════════════════════════════════════════ */

function AdminDashboard({ profileId }: { profileId: string }) {
  // Admin sees everything the teacher does + all batches
  return <TeacherDashboard profileId={profileId} />;
}

/* ══════════════════════════════════════════════════════
   SHARED COMPONENTS
   ══════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  icon,
  glowClass = '',
}: {
  label: string;
  value: number;
  icon: ReactNode;
  glowClass?: string;
}) {
  return (
    <GlassCard padding="1.25rem" className={glowClass}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-white/40 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-heading font-bold text-white">{value}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.04]">{icon}</div>
      </div>
    </GlassCard>
  );
}

function DueDateLabel({ date }: { date: string }) {
  const due = new Date(date);
  const now = new Date();
  const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  let color = 'text-white/50';
  if (hoursLeft < 24) color = 'text-danger';
  else if (hoursLeft < 72) color = 'text-amber';

  return (
    <span className={`text-[12px] font-mono ${color}`}>
      {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
    </span>
  );
}

function NextLectureCard({ lecture }: { lecture: Lecture & { batch_name?: string } }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(lecture.scheduled_at).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Starting now');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lecture.scheduled_at]);

  const isLive = lecture.status === 'live';

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {isLive && <Badge variant="live">LIVE</Badge>}
        <Badge variant="info">{lecture.batch_name}</Badge>
      </div>
      <h4 className="text-lg font-heading font-semibold text-white mb-2">{lecture.title}</h4>
      <p className="text-sm text-white/30 mb-4">
        {new Date(lecture.scheduled_at).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </p>

      {/* Countdown */}
      <div className="mb-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">
          {isLive ? 'In progress' : 'Starts in'}
        </p>
        <p className="text-xl font-heading font-bold text-cyan">{isLive ? '●  Live now' : countdown}</p>
      </div>

      <button
        disabled={!isLive}
        className={`w-full py-2.5 rounded-xl font-heading font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2
          ${isLive
            ? 'bg-cyan text-void hover:bg-cyan/90 cursor-pointer'
            : 'bg-white/[0.04] text-white/30 cursor-not-allowed'
          }`}
        onClick={() => {
          if (lecture.daily_room_url) window.open(lecture.daily_room_url, '_blank');
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" /></svg>
        {isLive ? 'Join Lecture' : 'Waiting…'}
      </button>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/* ══════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════ */

export function DashboardPage() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  switch (profile.role) {
    case 'student':
      return <StudentDashboard profileId={profile.id} />;
    case 'teacher':
      return <TeacherDashboard profileId={profile.id} />;
    case 'admin':
      return <AdminDashboard profileId={profile.id} />;
    default:
      return <StudentDashboard profileId={profile.id} />;
  }
}
