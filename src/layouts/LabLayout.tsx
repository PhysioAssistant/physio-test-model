import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  FlaskConical,
  Database,
  Cpu,
  FileCode2,
  GitCompare,
  BarChart3,
  LogOut,
  User,
  FolderOpen,
  Sliders,
  Columns3,
  Stethoscope,
  ShieldCheck,
  TrendingUp,
  Layers,
} from 'lucide-react';

const navItems = [
  { to: '/lab', label: 'Lab Dashboard', icon: FlaskConical, end: true },
  { to: '/lab/cases', label: 'Case Repository', icon: FolderOpen, end: false },
  { to: '/lab/datasets', label: 'Datasets', icon: Database, end: false },
  { to: '/lab/models', label: 'Model Registry', icon: Cpu, end: false },
  { to: '/lab/prompts', label: 'Prompt Lab', icon: FileCode2, end: false },
  { to: '/lab/rag', label: 'RAG Studio', icon: Layers, end: false },
  { to: '/lab/experiments', label: 'Experiments', icon: Sliders, end: false },
  { to: '/lab/comparison', label: 'Comparison Grid', icon: GitCompare, end: false },
  { to: '/lab/evaluations', label: '10-D Evaluations', icon: BarChart3, end: false },
  { to: '/lab/reviews', label: 'Doctor Reviews', icon: Stethoscope, end: false },
  { to: '/lab/regression', label: 'Regression Suite', icon: ShieldCheck, end: false },
  { to: '/lab/analytics', label: 'Analytics', icon: TrendingUp, end: false },
];

export default function LabLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-lab-500 flex items-center justify-center">
            <FlaskConical size={16} className="text-white" />
          </div>
          <div>
            <p className="font-display font-700 text-white text-sm leading-tight">AI Eval Lab</p>
            <p className="text-xs text-slate-500">Internal Tooling</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-lab-500/15 text-lab-400 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <User size={14} className="text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.fullName ?? '—'}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role ?? 'AI Researcher'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}
