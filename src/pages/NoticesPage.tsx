import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { FileDropZone } from '../components/ui/FileDropZone';
import { PageTransition, StaggerItem } from '../components/layout/PageTransition';
import type { Notice } from '../types';

/* ── Types ───────────────────────────────────────── */
interface EnrichedNotice extends Notice {
  batch_name: string;
  created_by_name: string;
  is_read?: boolean;
}

type Urgency = 'info' | 'important' | 'urgent';

/* ── Notice Card Component ────────────────────────── */
function NoticeCard({
  notice,
  isTeacher,
  onTogglePin,
  onDelete,
}: {
  notice: EnrichedNotice;
  isTeacher: boolean;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const accentColors: Record<Urgency, string> = {
    info: 'bg-cyan',
    important: 'bg-amber',
    urgent: 'bg-danger',
  };

  const isUrgent = notice.urgency === 'urgent';

  const handleDownload = async () => {
    if (!notice.attachment_url) return;
    const path = notice.attachment_url.split('/lecture-attachments/')[1];
    if (path) {
      const { data } = await supabase.storage.from('lecture-attachments').createSignedUrl(decodeURIComponent(path), 60);
      if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); return; }
    }
    window.open(notice.attachment_url, '_blank');
  };

  return (
    <GlassCard
      padding="0"
      hover={false}
      className={`relative overflow-hidden group transition-all duration-300 ${
        isUrgent ? 'border-danger/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : ''
      }`}
    >
      {/* Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColors[notice.urgency as Urgency] || 'bg-cyan'}`} />

      {/* Content */}
      <div className="pl-4 pr-5 py-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {!notice.is_read && (
              <div className="w-2 h-2 rounded-full bg-cyan ring-4 ring-cyan/20 flex-shrink-0" />
            )}
            <h3 className="font-heading text-lg font-bold text-white truncate">{notice.title}</h3>
            <Badge variant={notice.urgency as any}>{notice.urgency}</Badge>
            {notice.pinned && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#A855F7" className="text-purple flex-shrink-0"><path d="M21 10h-8V2l-7 12h8v8l7-12z" /></svg>
            )}
          </div>

          {isTeacher && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onTogglePin(notice.id, !notice.pinned)}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${notice.pinned ? 'text-purple' : 'text-white/20'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>
              </button>
              <button
                onClick={() => onDelete(notice.id)}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-white/20 hover:text-danger transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </button>
            </div>
          )}
        </div>

        {/* Body with Height Animation */}
        <div className="relative">
          <motion.p
            initial={false}
            animate={{ height: expanded ? 'auto' : '4.5rem' }}
            className={`text-sm text-white/50 leading-relaxed overflow-hidden ${!expanded ? 'line-clamp-3' : ''}`}
          >
            {notice.body}
          </motion.p>
          {notice.body.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[12px] text-cyan hover:underline mt-2 font-medium"
            >
              {expanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] text-white/30">
             <div className="flex items-center gap-1.5">
               <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-bold text-white/50">
                 {notice.created_by_name?.charAt(0)}
               </div>
               {notice.created_by_name}
             </div>
             <span>•</span>
             <span>{notice.batch_name}</span>
             <span>•</span>
             <span>{new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>

          {notice.attachment_url && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-cyan hover:bg-white/[0.08] transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Attachment
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

/* ══════════════════════════════════════════════════════
   NOTICES PAGE
   ══════════════════════════════════════════════════════ */
export function NoticesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin';

  const [notices, setNotices] = useState<EnrichedNotice[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'pinned' | 'unread'>('all');
  const [filterBatch, setFilterBatch] = useState<string>('all');

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formUrgency, setFormUrgency] = useState<Urgency>('info');
  const [formBatch, setFormBatch] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  /* ── Data Fetching ────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!profile) return;
    try {
      let batchIds: string[] = [];
      if (profile.role === 'student') {
        const { data: e } = await supabase.from('batch_enrollments').select('batch_id').eq('student_id', profile.id);
        batchIds = e?.map(x => x.batch_id) ?? [];
      } else if (profile.role === 'teacher') {
        const { data: b } = await supabase.from('batches').select('id').eq('teacher_id', profile.id);
        batchIds = b?.map(x => x.id) ?? [];
      } else {
        const { data: b } = await supabase.from('batches').select('id');
        batchIds = b?.map(x => x.id) ?? [];
      }

      if (batchIds.length === 0) { setLoading(false); return; }

      const [{ data: bData }, { data: nData }, { data: rData }] = await Promise.all([
        supabase.from('batches').select('id, name').in('id', batchIds),
        supabase.from('notices').select('*').in('batch_id', batchIds).order('created_at', { ascending: false }),
        supabase.from('notice_reads').select('notice_id').eq('user_id', profile.user_id)
      ]);

      const batchMap = new Map(bData?.map(b => [b.id, b.name]) ?? []);
      setBatches(bData ?? []);

      const readSet = new Set(rData?.map(r => r.notice_id) ?? []);

      // Fetch creator names
      const creatorIds = [...new Set(nData?.map(n => n.created_by) ?? [])];
      let profileMap = new Map<string, string>();
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', creatorIds);
        profileMap = new Map(profiles?.map(p => [p.id, p.name]) ?? []);
      }

      const enriched: EnrichedNotice[] = (nData ?? []).map(n => ({
        ...n,
        batch_name: batchMap.get(n.batch_id) ?? 'Unknown',
        created_by_name: profileMap.get(n.created_by) ?? 'Unknown',
        is_read: readSet.has(n.id)
      }));

      setNotices(enriched);

      // Auto-mark as read on open
      const unreadIds = enriched.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        const inserts = unreadIds.map(id => ({ user_id: profile.user_id, notice_id: id }));
        await supabase.from('notice_reads').upsert(inserts, { onConflict: 'user_id,notice_id' });
      }

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Filter Logic ────────────────────────────── */
  const filteredNotices = notices
    .filter(n => {
      const matchesBatch = filterBatch === 'all' || n.batch_id === filterBatch;
      const matchesType =
        filterType === 'all' ? true :
        filterType === 'pinned' ? n.pinned :
        filterType === 'unread' ? !n.is_read : true;
      return matchesBatch && matchesType;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  /* ── Post Logic ──────────────────────────────── */
  const handlePost = async () => {
    if (!formTitle || !formBody || !formBatch || !profile) return;
    setPosting(true);
    try {
      let attachmentUrl = null;
      if (formFile) {
        const path = `${formBatch}/${crypto.randomUUID()}-${formFile.name}`;
        await supabase.storage.from('lecture-attachments').upload(path, formFile);
        const { data } = supabase.storage.from('lecture-attachments').getPublicUrl(path);
        attachmentUrl = data.publicUrl;
      }

      const { error } = await supabase.from('notices').insert({
        title: formTitle,
        body: formBody,
        urgency: formUrgency,
        batch_id: formBatch,
        created_by: profile.id,
        attachment_url: attachmentUrl,
        pinned: false
      });

      if (error) throw error;
      toast('Notice posted', 'success');
      setModalOpen(false);
      setFormTitle(''); setFormBody(''); setFormBatch(''); setFormFile(null);
      fetchData();
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setPosting(false); }
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    const { error } = await supabase.from('notices').update({ pinned: pinned }).eq('id', id);
    if (!error) fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (!error) { toast('Notice removed', 'info'); fetchData(); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/50 focus:bg-white/[0.06] transition-all duration-200';

  return (
    <PageTransition>
      {/* Filters Bar */}
      <StaggerItem>
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
            {(['all', 'pinned', 'unread'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filterType === t ? 'bg-white/[0.08] text-white shadow-lg' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <select
             value={filterBatch}
             onChange={(e) => setFilterBatch(e.target.value)}
             className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-cyan/50"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {isTeacherOrAdmin && (
            <button
              onClick={() => setModalOpen(true)}
              className="ml-auto px-5 py-2.5 rounded-xl bg-cyan text-void font-heading font-semibold text-sm hover:bg-cyan/90 transition-all flex items-center gap-2"
            >
              Post Notice
            </button>
          )}
        </div>
      </StaggerItem>

      {/* Board */}
      <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
        {filteredNotices.length === 0 ? (
          <StaggerItem>
            <GlassCard hover={false}>
              <EmptyState title="All quiet. No notices yet." subtitle="Check back later or change filters." />
            </GlassCard>
          </StaggerItem>
        ) : (
          filteredNotices.map((n) => (
            <StaggerItem key={n.id}>
              <NoticeCard
                notice={n}
                isTeacher={isTeacherOrAdmin}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
              />
            </StaggerItem>
          ))
        )}
      </div>

      {/* Post Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Post Notice" maxWidth="520px">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Title</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className={inputClass} placeholder="Notice title" />
          </div>
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Body</label>
            <textarea value={formBody} onChange={(e) => setFormBody(e.target.value)} className={`${inputClass} resize-none h-32`} placeholder="Write your announcement..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Urgency</label>
              <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                {(['info', 'important', 'urgent'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setFormUrgency(u)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      formUrgency === u
                        ? u === 'info' ? 'bg-cyan text-void' : u === 'important' ? 'bg-amber text-void' : 'bg-danger text-white'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Batch</label>
              <select value={formBatch} onChange={(e) => setFormBatch(e.target.value)} className={inputClass}>
                <option value="">Select</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Attachment (Optional)</label>
            <FileDropZone onFile={setFormFile} currentFile={formFile} disabled={posting} />
          </div>

          <button
            onClick={handlePost}
            disabled={posting || !formTitle || !formBody || !formBatch}
            className="w-full py-3 rounded-xl font-heading font-semibold text-sm bg-cyan text-void hover:bg-cyan/90 disabled:opacity-40 transition-all"
          >
            {posting ? <Spinner size="sm" /> : 'Post Announcement'}
          </button>
        </div>
      </Modal>
    </PageTransition>
  );
}
