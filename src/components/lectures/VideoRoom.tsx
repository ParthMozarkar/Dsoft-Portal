import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import DailyIframe from '@daily-co/daily-js';
import {
  DailyProvider,
  DailyVideo,
  useDaily,
  useParticipantIds,
  useLocalParticipant,
  useParticipant,
} from '@daily-co/daily-react';
import { useToast } from '../ui/Toast';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';

/* ── Tile Component ─────────────────────────────── */
function VideoTile({ id, isLocal = false, isLarge = false }: { id: string; isLocal?: boolean; isLarge?: boolean }) {
  const p = isLocal ? useLocalParticipant() : useParticipant(id);
  if (!p || (!isLocal && !id)) return null;

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-void border border-white/5 ${isLarge ? 'w-full h-full' : 'w-48 h-28 flex-shrink-0'}`}>
      <DailyVideo sessionId={id} type="video" className="w-full h-full object-cover" />

      {/* Overlays */}
      <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[10px] text-white font-medium">
        {p.user_name || (isLocal ? 'You' : 'Guest')}
      </div>

      {!p.video && (
         <div className="absolute inset-0 flex items-center justify-center bg-void/80">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /><line x1="1" y1="5" x2="23" y2="19" /></svg>
            </div>
         </div>
      )}
    </div>
  );
}

/* ── Room Controller ────────────────────────────── */
function RoomUI({ onLeave, isTeacher }: { onLeave: () => void; isTeacher: boolean }) {
  const call = useDaily();
  const { toast } = useToast();
  const localParticipant = useLocalParticipant();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // Sync initial state and auto-record for teacher
  useEffect(() => {
    if (!call) return;

    const handleJoined = () => {
      call.setLocalAudio(true);
      call.setLocalVideo(true);
      if (isTeacher) {
        call.startRecording();
        toast('Recording started automatically', 'info');
      }
    };

    call.on('joined-meeting', handleJoined);
    return () => { call.off('joined-meeting', handleJoined); };
  }, [call, isTeacher, toast]);

  const toggleMic = () => {
    call?.setLocalAudio(!micOn);
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    call?.setLocalVideo(!camOn);
    setCamOn(!camOn);
  };

  const handleEnd = async () => {
    if (call) {
      if (isTeacher) {
        call.stopRecording();
      }
      await call.leave();
      onLeave();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-void relative">
       {/* Background Glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-cyan/5 rounded-full blur-[160px] pointer-events-none" />

       {/* Main Stage */}
       <div className="flex-1 p-6 flex items-center justify-center min-h-0">
          <div className="w-full max-w-5xl aspect-video relative">
             {/* Large Feed (Teacher or whoever is speaking/screensharing) */}
             {remoteParticipantIds.length > 0 ? (
               <VideoTile id={remoteParticipantIds[0]} isLarge />
             ) : (
               <VideoTile id={localParticipant?.session_id ?? ''} isLocal isLarge />
             )}

             {isTeacher && <div className="absolute top-4 right-4"><Badge variant="success">LIVE</Badge></div>}
          </div>
       </div>

       {/* Horizontal Participants strip */}
       <div className="h-36 px-6 pb-6 flex gap-4 overflow-x-auto no-scrollbar justify-center">
          {localParticipant && <VideoTile id={localParticipant.session_id} isLocal />}
          {remoteParticipantIds.slice(1).map((id: string) => <VideoTile key={id} id={id} />)}
       </div>

       {/* Floating Control Bar */}
       <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
          <GlassCard padding="0.75rem" className="flex items-center gap-3">
             <button onClick={toggleMic} className={`p-3 rounded-xl transition-all ${micOn ? 'bg-cyan text-void shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'bg-white/5 text-white/40'}`}>
                {micOn ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                       : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /><line x1="1" y1="1" x2="23" y2="23" /></svg>}
             </button>

             <button onClick={toggleCam} className={`p-3 rounded-xl transition-all ${camOn ? 'bg-cyan text-void shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'bg-white/5 text-white/40'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
             </button>

             <div className="w-[1px] h-8 bg-white/10 mx-1" />

             <button
               onClick={handleEnd}
               className="px-5 py-2.5 rounded-xl bg-danger text-white text-sm font-bold font-heading hover:bg-danger/80 transition-all flex items-center gap-2"
             >
                {isTeacher ? 'End Lecture' : 'Leave'}
             </button>
          </GlassCard>
       </div>
    </div>
  );
}

/* ── Main Export ────────────────────────────────── */
export function VideoRoom({ url, onLeave, isTeacher, userName }: { url: string; onLeave: () => void; isTeacher: boolean; userName: string }) {
  const [call, setCall] = useState<any>(null);
  const callRef = useRef<any>(null);

  useEffect(() => {
    if (!url || callRef.current) return;
    
    let c = DailyIframe.getCallInstance();
    if (!c) {
      c = DailyIframe.createCallObject();
    }
    
    callRef.current = c;
    setCall(c);

    const state = c.meetingState();
    if (state === ('new' as any) || state === 'left-meeting') {
      c.join({ url, userName }).catch((e: any) => {
          if (e.message?.includes('already joined') || e.message?.includes('destroyed')) return;
          console.error('Join error:', e);
      });
    }

    return () => {
      // In development, the object will persist to avoid Strict Mode crashes.
      // It will be fully released when you refresh or navigate away.
    };
  }, [url, userName]);

  if (!call) return (
     <div className="fixed inset-0 z-[200] bg-void flex flex-col items-center justify-center gap-4">
        <Spinner size="lg" />
        <p className="font-heading text-white/40 animate-pulse">Initializing ardsoft secure connection...</p>
     </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-void select-none"
    >
      <DailyProvider callObject={call}>
         <RoomUI onLeave={onLeave} isTeacher={isTeacher} />
      </DailyProvider>
    </motion.div>
  );
}
