import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Activity,
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  FlaskConical,
  Database,
  Cpu,
  FileCode2,
  Layers,
  Sliders,
  GitCompare,
  BarChart3,
  Stethoscope,
  ShieldCheck,
  TrendingUp,
  Shield,
  Users,
  LogOut,
  User,
  ChevronRight,
} from 'lucide-react';

/* ── Nav item type ── */
interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  end?: boolean;
}

/* ── Section type ── */
interface NavSection {
  label: string;
  color: string;
  items: NavItem[];
}

export default function DoctorLayout() {
  const { user, signOut, canAccessLab, isAdmin } = useAuth();
  const navigate = useNavigate();

  const hasLab = canAccessLab();
  const hasAdmin = isAdmin();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  /* ── Build sections dynamically based on role ── */
  const sections: NavSection[] = [];

  // Doctor section — all roles see this
  sections.push({
    label: 'Clinical',
    color: 'text-teal-400',
    items: [
      { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/doctor/cases', label: 'Patient Cases', icon: FolderOpen },
      { to: '/doctor/cases/new', label: 'New Intake', icon: PlusCircle },
    ],
  });

  // AI Lab section — ai_user + admin
  if (hasLab) {
    sections.push({
      label: 'AI Lab',
      color: 'text-violet-400',
      items: [
        { to: '/doctor/lab', label: 'Lab Dashboard', icon: FlaskConical, end: true },
        { to: '/doctor/lab/cases', label: 'Case Repository', icon: FolderOpen },
        { to: '/doctor/lab/datasets', label: 'Datasets', icon: Database },
        { to: '/doctor/lab/models', label: 'Model Registry', icon: Cpu },
        { to: '/doctor/lab/prompts', label: 'Prompt Lab', icon: FileCode2 },
        { to: '/doctor/lab/rag', label: 'RAG Studio', icon: Layers },
        { to: '/doctor/lab/experiments', label: 'Experiments', icon: Sliders },
        { to: '/doctor/lab/comparison', label: 'Comparison Grid', icon: GitCompare },
        { to: '/doctor/lab/evaluations', label: '10-D Evaluations', icon: BarChart3 },
        { to: '/doctor/lab/reviews', label: 'Doctor Reviews', icon: Stethoscope },
        { to: '/doctor/lab/regression', label: 'Regression Suite', icon: ShieldCheck },
        { to: '/doctor/lab/analytics', label: 'Analytics', icon: TrendingUp },
      ],
    });
  }

  // Admin section — admin only
  if (hasAdmin) {
    sections.push({
      label: 'Admin',
      color: 'text-amber-400',
      items: [
        { to: '/doctor/admin', label: 'User Management', icon: Users },
      ],
    });
  }

  /* ── Role badge ── */
  const roleBadge =
    user?.role === 'admin'
      ? { label: 'Administrator', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' }
      : user?.role === 'ai_user'
      ? { label: 'AI Operator', color: 'bg-violet-500/20 text-violet-300 border border-violet-500/30' }
      : { label: 'Doctor', color: 'bg-teal-500/20 text-teal-300 border border-teal-500/30' };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex flex-col bg-slate-900 border-r border-slate-800 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/40">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">DoctorSakhi</p>
            <p className="text-[11px] text-slate-500">Clinical AI Studio</p>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 pt-3 pb-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${roleBadge.color}`}>
            <Shield size={11} />
            {roleBadge.label}
          </span>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              <p className={`px-3 mb-1 text-[10px] font-bold uppercase tracking-widest ${section.color}`}>
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                        isActive
                          ? section.label === 'AI Lab'
                            ? 'bg-violet-500/15 text-violet-300'
                            : section.label === 'Admin'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-teal-500/15 text-teal-300'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={16}
                          className={
                            isActive
                              ? section.label === 'AI Lab'
                                ? 'text-violet-400'
                                : section.label === 'Admin'
                                ? 'text-amber-400'
                                : 'text-teal-400'
                              : 'text-slate-500 group-hover:text-slate-300'
                          }
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {isActive && (
                          <ChevronRight size={12} className="opacity-60" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
              {user?.fullName ? user.fullName.slice(0, 2) : <User size={13} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.fullName ?? '—'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}
