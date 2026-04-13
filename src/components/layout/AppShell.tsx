import React from 'react';
import { NavLink, useNavigate, Outlet, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

/* ── Tab Bar Icons (Mobile) ─────────────────────── */
const mobileNav = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/notes', label: 'Notes', icon: 'notes' },
  { to: '/assignments', label: 'Assignments', icon: 'assignments' },
  { to: '/notices', label: 'Notices', icon: 'notices' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
];

/* ── Icons (inline SVG) ─────────────────────────── */
const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
  ),
  notes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
  ),
  assignments: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>
  ),
  notices: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
  ),
  lectures: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
  ),
  batches: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  signout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /></svg>
  ),
  batchMgmt: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  )
};

const desktopNav = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['admin', 'teacher', 'student'] },
  { to: '/notes', label: 'Notes', icon: 'notes', roles: ['admin', 'teacher', 'student'] },
  { to: '/assignments', label: 'Assignments', icon: 'assignments', roles: ['admin', 'teacher', 'student'] },
  { to: '/notices', label: 'Notices', icon: 'notices', roles: ['admin', 'teacher', 'student'] },
  { to: '/lectures', label: 'Lectures', icon: 'lectures', roles: ['admin', 'teacher', 'student'] },
  { to: '/batches', label: 'Batches', icon: 'batches', roles: ['admin', 'teacher'] },
  { to: '/batch-management', label: 'Batch Mgmt', icon: 'batchMgmt', roles: ['admin'] },
  { to: '/profile', label: 'Profile', icon: 'profile', roles: ['admin', 'teacher', 'student'] },
];

export function AppShell() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role: UserRole = profile?.role ?? 'student';
  const currentNav = desktopNav.find(n => location.pathname.startsWith(n.to));
  const pageTitle = currentNav?.label ?? 'ARDSOFT';

  return (
    <div className="min-h-screen bg-void">
      {/* Sidebar (Desktop only) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-white/[0.02] border-r border-white/5 z-50">
        <div className="p-6">
           <Link to="/dashboard" className="block">
              <img src="/logo.png" alt="ARDSOFT" className="h-12 w-auto object-contain" />
           </Link>
           <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mt-2 ml-1">Student Portal</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
           {desktopNav.filter(n => n.roles.includes(role)).map(n => (
             <NavLink
               key={n.to}
               to={n.to}
               className={({ isActive }) => `
                 flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all group
                 ${isActive ? 'bg-cyan/10 text-cyan shadow-[0_0_20px_rgba(0,229,255,0.05)]' : 'text-white/40 hover:text-white hover:bg-white/5'}
               `}
             >
                <span className="opacity-70 group-hover:opacity-100">{icons[n.icon]}</span>
                {n.label}
             </NavLink>
           ))}
        </nav>

        <div className="p-4 border-t border-white/5">
           <button
             onClick={() => signOut().then(() => navigate('/login'))}
             className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-sm text-white/30 hover:text-danger hover:bg-danger/5 transition-all"
           >
              {icons.signout}
              Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 pb-24 md:pb-8 min-h-screen">
         {/* Top Header */}
         <header className="px-6 py-6 md:px-10 flex items-center justify-between">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-white tracking-tight">{pageTitle}</h2>
            
            <Link to="/profile" className="flex items-center gap-3 p-1.5 rounded-full bg-white/5 border border-white/10 hover:border-cyan/30 transition-all select-none">
                <div className="w-8 h-8 rounded-full bg-cyan/10 flex items-center justify-center overflow-hidden">
                   {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[11px] font-bold text-cyan">{profile?.name?.charAt(0).toUpperCase()}</span>}
                </div>
            </Link>
         </header>

         {/* Content Area */}
         <div className="px-6 md:px-10 max-w-7xl mx-auto">
            <Outlet />
         </div>
      </main>

      {/* Bottom Nav (Mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-void/80 backdrop-blur-2xl border-t border-white/5 z-50 flex items-center justify-around px-4">
         {mobileNav.map(n => (
           <NavLink
             key={n.to}
             to={n.to}
             className={({ isActive }) => `
               flex flex-col items-center gap-1.5 transition-all
               ${isActive ? 'text-cyan scale-110' : 'text-white/30'}
             `}
           >
              {icons[n.icon]}
              <span className="text-[10px] uppercase font-bold tracking-widest">{n.label}</span>
              {location.pathname.startsWith(n.to) && (
                <motion.div layoutId="tab" className="absolute -bottom-2 w-1 h-1 rounded-full bg-cyan shadow-[0_0_8px_rgba(0,229,255,1)]" />
              )}
           </NavLink>
         ))}
      </nav>
    </div>
  );
}
