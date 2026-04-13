import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { FileDropZone } from '../components/ui/FileDropZone';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Skeleton } from '../components/ui/Skeleton';
import { PageTransition, StaggerItem } from '../components/layout/PageTransition';
import { useMagneticCursor } from '../hooks/useMagneticCursor';
import type { Note } from '../types';

/* ── Types ───────────────────────────────────────── */
interface EnrichedNote extends Note {
  batch_name: string;
}

interface BatchOption {
  id: string;
  name: string;
}

/* ── Helpers ── */
const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/50 focus:bg-white/[0.06] transition-all duration-200';

/* ── File type icon helper ───────────────────────── */
function FileIcon({ url }: { url: string }) {
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = ext === 'pdf';
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPdf ? 'bg-danger/10' : 'bg-cyan/10'}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isPdf ? '#EF4444' : '#00E5FF'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        {isPdf ? (
          <text x="7" y="18" fontSize="6" fill="#EF4444" stroke="none" fontWeight="bold">PDF</text>
        ) : (
          <>
            <path d="M16 13H8" /><path d="M16 17H8" />
          </>
        )}
      </svg>
    </div>
  );
}

/* ── Time ago ────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ══════════════════════════════════════════════════════
   NOTES PAGE
   ══════════════════════════════════════════════════════ */
export function NotesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin';

  /* ── State ─────────────────────────────────────── */
  const [notes, setNotes] = useState<EnrichedNote[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  // Upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadBatch, setUploadBatch] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<EnrichedNote | null>(null);

  // Magnetic cursor for upload button
  const btnRef = useRef<HTMLButtonElement>(null);
  const { x: magX, y: magY } = useMagneticCursor(btnRef);

  /* ── Fetch data ────────────────────────────────── */
  const fetchNotes = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    try {
      let batchIds: string[] = [];

      if (profile.role === 'student') {
        const { data: enrollments } = await supabase
          .from('batch_enrollments')
          .select('batch_id')
          .eq('student_id', profile.id);
        batchIds = enrollments?.map((e) => e.batch_id) ?? [];
      } else if (profile.role === 'teacher') {
        const { data: teacherBatches } = await supabase
          .from('batches')
          .select('id')
          .eq('teacher_id', profile.id);
        batchIds = teacherBatches?.map((b) => b.id) ?? [];
      } else {
        const { data: allBatches } = await supabase.from('batches').select('id');
        batchIds = allBatches?.map((b) => b.id) ?? [];
      }

      if (batchIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: batchData } = await supabase
        .from('batches')
        .select('id, name')
        .in('id', batchIds);
      const batchMap = new Map(batchData?.map((b) => [b.id, b.name]) ?? []);
      const batchDataOptions = batchData?.map((b) => ({ id: b.id, name: b.name })) ?? [];
      setBatches(batchDataOptions);
      
      // Auto-select batch if only one exists
      if (batchDataOptions.length === 1) {
        setUploadBatch(batchDataOptions[0].id);
      }

      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .in('batch_id', batchIds)
        .order('created_at', { ascending: false });

      const enriched: EnrichedNote[] = (notesData ?? []).map((n) => ({
        ...n,
        batch_name: batchMap.get(n.batch_id) ?? 'Unknown',
      }));

      setNotes(enriched);
    } catch (err) {
      console.error('Notes fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  /* ── Derived data ──────────────────────────────── */
  const subjects = [...new Set(notes.map((n) => n.subject).filter(Boolean))] as string[];

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !search || n.title.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = !activeSubject || n.subject === activeSubject;
    return matchesSearch && matchesSubject;
  });

  /* ── Upload handler ────────────────────────────── */
  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle || !uploadBatch || !profile) return;
    
    if (uploadFile.size > 50 * 1024 * 1024) {
      toast('File too large (max 50MB)', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload to storage
      const fileName = `${uploadBatch}/${crypto.randomUUID()}-${uploadFile.name}`;

      setUploadProgress(30);

      const { error: storageError } = await supabase.storage
        .from('notes-files')
        .upload(fileName, uploadFile);

      if (storageError) {
        toast('Upload failed: ' + storageError.message, 'error');
        return;
      }

      setUploadProgress(60);

      // 2. Get URL
      const { data: urlData } = supabase.storage
        .from('notes-files')
        .getPublicUrl(fileName);

      setUploadProgress(80);

      // 3. Insert into notes table
      const { error: insertError } = await supabase.from('notes').insert({
        batch_id: uploadBatch,
        uploaded_by: profile.id,
        title: uploadTitle,
        subject: uploadSubject || null,
        file_url: urlData.publicUrl,
      });

      if (insertError) {
        toast('Failed to save note: ' + insertError.message, 'error');
        return;
      }

      setUploadProgress(100);
      toast('Note uploaded successfully', 'success');

      // Reset form
      setModalOpen(false);
      setUploadTitle('');
      setUploadSubject('');
      setUploadBatch('');
      setUploadFile(null);
      fetchNotes();
    } catch (err) {
      toast('Upload error', 'error');
      console.error(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /* ── Delete handler ────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      // Extract storage path from URL
      const url = deleteTarget.file_url;
      const pathMatch = url.split('/notes-files/')[1];
      if (pathMatch) {
        await supabase.storage.from('notes-files').remove([decodeURIComponent(pathMatch)]);
      }

      const { error } = await supabase.from('notes').delete().eq('id', deleteTarget.id);
      if (error) {
        toast('Delete failed: ' + error.message, 'error');
      } else {
        toast('Note deleted', 'info');
        fetchNotes();
      }
    } catch (err) {
      toast('Delete error', 'error');
      console.error(err);
    } finally {
      setDeleteTarget(null);
    }
  };

  /* ── Download handler ──────────────────────────── */
  const handleDownload = async (note: EnrichedNote) => {
    try {
      toast('Starting download...', 'info');
      
      const pathMatch = note.file_url.split('/notes-files/')[1];
      if (!pathMatch) {
         throw new Error('Could not find file path');
      }

      const { data, error } = await supabase.storage
        .from('notes-files')
        .download(decodeURIComponent(pathMatch.split('?')[0]));

      if (error) throw error;
      if (!data) throw new Error('No data received');
      
      // Extract extension
      const ext = note.file_url.split('.').pop()?.split('?')[0] || 'pdf';
      const fileName = note.title.toLowerCase().endsWith(`.${ext}`) 
        ? note.title 
        : `${note.title}.${ext}`;
        
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      toast('Opening in new tab instead', 'warning');
      window.open(note.file_url, '_blank');
    }
  };

  /* ── Render ────────────────────────────────────── */
  const SkeletonGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <GlassCard key={i} padding="1.25rem" hover={false}>
          <div className="flex gap-4 mb-4">
            <Skeleton width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton width="80%" />
              <Skeleton width="40%" height={10} />
            </div>
          </div>
          <Skeleton width="25%" height={20} className="mb-4" />
          <div className="flex justify-between items-center border-t border-white/[0.04] pt-4">
            <Skeleton width="30%" height={10} />
            <Skeleton width="20%" height={10} />
          </div>
        </GlassCard>
      ))}
    </div>
  );

  return (
    <PageTransition>
      {/* ── Filters bar ──────────────────────────── */}
      <StaggerItem>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className={`${inputClass} pl-9`}
              disabled={loading}
            />
          </div>

          {/* Subject filter chips */}
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSubject(activeSubject === s ? null : s)}
              className={`
                px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 border
                ${activeSubject === s
                  ? 'bg-cyan text-void border-cyan'
                  : 'bg-transparent text-white/50 border-white/[0.08] hover:border-white/20 hover:text-white'}
              `}
            >
              {s}
            </button>
          ))}

          {/* Upload button — teacher/admin only */}
          {isTeacherOrAdmin && (
            <motion.button
              ref={btnRef}
              style={{ x: magX, y: magY }}
              onClick={() => setModalOpen(true)}
              className="ml-auto px-5 py-2.5 rounded-xl bg-cyan text-void font-heading font-semibold text-sm hover:bg-cyan/90 transition-all flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Upload Note
            </motion.button>
          )}
        </div>
      </StaggerItem>

      {/* ── Notes Grid ───────────────────────────── */}
      {loading ? (
        <StaggerItem><SkeletonGrid /></StaggerItem>
      ) : filteredNotes.length === 0 ? (
        <StaggerItem>
          <GlassCard hover={false}>
            <EmptyState
              title="No notes yet"
              subtitle={isTeacherOrAdmin ? 'Upload your first note to get started' : 'Notes will appear here when your teacher uploads them'}
              action={
                isTeacherOrAdmin ? (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-cyan/10 text-cyan text-sm font-medium hover:bg-cyan/20 transition-all"
                  >
                    Upload Note
                  </button>
                ) : undefined
              }
            />
          </GlassCard>
        </StaggerItem>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note, i) => (
            <StaggerItem key={note.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="h-full"
              >
                <GlassCard padding="1.25rem" className="h-full flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <FileIcon url={note.file_url} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-heading font-semibold text-white truncate">
                        {note.title}
                      </p>
                      <p className="text-[11px] text-white/30 mt-0.5">{note.batch_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    {note.subject && <Badge variant="info">{note.subject}</Badge>}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/[0.04]">
                    <span 
                      className="text-[11px] text-white/20 cursor-default" 
                      title={new Date(note.created_at).toLocaleString()}
                    >
                      {timeAgo(note.created_at)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(note)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-cyan hover:bg-cyan/10 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Download
                      </button>
                      {isTeacherOrAdmin && (
                        <button
                          onClick={() => setDeleteTarget(note)}
                          className="p-1.5 rounded-lg text-white/20 hover:text-danger hover:bg-danger/10 transition-all"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </StaggerItem>
          ))}
        </div>
      )}

      {/* ── Upload Modal ─────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload Note">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Title</label>
            <input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className={inputClass} placeholder="e.g. React Hooks Chapter 5" />
          </div>
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Subject</label>
            <input value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} className={inputClass} placeholder="e.g. React, Python, DSA" />
          </div>
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">Batch</label>
            <select value={uploadBatch} onChange={(e) => setUploadBatch(e.target.value)} className={inputClass}>
              <option value="">Select batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-white/50 uppercase tracking-wider mb-2 font-medium">File</label>
            <FileDropZone 
              onFile={(file) => {
                setUploadFile(file);
                if (!uploadTitle) {
                  // Set title from filename, removing extension and replacing hyphens/underscores with spaces
                  const name = file.name.split('.').slice(0, -1).join('.')
                    .replace(/[_-]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                  setUploadTitle(name);
                }
              }} 
              currentFile={uploadFile} 
              disabled={uploading} 
            />
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-cyan rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !uploadTitle || !uploadBatch || !uploadFile}
            className="w-full py-3 rounded-xl font-heading font-semibold text-sm bg-cyan text-void hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Spinner size="sm" />
                Uploading…
              </>
            ) : (
              'Upload Note'
            )}
          </button>
        </div>
      </Modal>

      {/* ── Delete Confirm ───────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Note"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will also remove the file from storage.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageTransition>
  );
}
