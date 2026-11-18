import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { adminApi } from '@/lib/api';
import {
  X, Shield, Stethoscope, Cpu, Activity, Clock, LogIn,
  Monitor, History, ActivitySquare, AlertCircle, User as UserIcon,
  FileText, CheckCircle, Layers
} from 'lucide-react';

interface UserDetailsPanelProps {
  user: UserProfile;
  onClose: () => void;
}

type UserDetails = {
  patient_count: number;
  case_count: number;
  ground_truth_count: number;
  total_logins: number;
  active_sessions: any[];
  login_history: Array<{ ip: string | null; user_agent: string | null; logged_in_at: string }>;
  recent_cases: Array<{
    id: string; title: string; body_region: string;
    difficulty: string; status: string; created_at: string;
    patient: { name: string; age: number; sex: string } | null;
  }>;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:      'bg-green-100 text-green-700',
  moderate:  'bg-blue-100 text-blue-700',
  complex:   'bg-amber-100 text-amber-700',
  high_risk: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  draft:               'bg-slate-100 text-slate-600',
  ground_truth_ready:  'bg-blue-100 text-blue-700',
  evaluating:          'bg-amber-100 text-amber-700',
  reviewed:            'bg-green-100 text-green-700',
};

function parseDevice(ua: string | null) {
  if (!ua) return 'Unknown Device';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Mac OS')) return 'Mac OS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Device';
  return 'Browser';
}

function parseBrowser(ua: string | null) {
  if (!ua) return '';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return '';
}

export function UserDetailsPanel({ user, onClose }: UserDetailsPanelProps) {
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'cases'>('overview');

  useEffect(() => {
    async function load() {
      try {
        const data = await adminApi.getUserDetails(user.id);
        setDetails(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load user details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'doctor' ? 'Doctor' : 'AI Operator';
  const RoleIcon = user.role === 'admin' ? Shield : user.role === 'doctor' ? Stethoscope : Cpu;
  const roleColor = user.role === 'admin'
    ? 'bg-purple-100 text-purple-700 border-purple-200'
    : user.role === 'doctor'
    ? 'bg-teal-100 text-teal-700 border-teal-200'
    : 'bg-amber-100 text-amber-700 border-amber-200';

  return (
    <>
      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                {user.fullName ? user.fullName.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900">{user.fullName || 'Unknown User'}</h2>
                  {!user.isActive && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wide">
                      Deactivated
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${roleColor}`}>
                    <RoleIcon size={12} />
                    {roleLabel}
                  </span>
                  <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">
                    {user.id.substring(0, 16)}…
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick facts row */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Account Created</p>
              <p className="font-semibold text-slate-700">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Last Login</p>
              <p className="font-semibold text-slate-700">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Total Logins</p>
              <p className="font-semibold text-slate-700">{user.loginCount ?? (details?.total_logins ?? '…')}</p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-200 flex-shrink-0 bg-white">
          {(['overview', 'sessions', 'cases'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab === 'overview' ? '📊 Overview' : tab === 'sessions' ? '🔐 Login History' : '📁 Cases'}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="m-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-200">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : !details ? null : (

            <>
              {/* ── Overview Tab ── */}
              {activeTab === 'overview' && (
                <div className="p-6 space-y-6">
                  {/* Stats */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Activity size={14} className="text-teal-600" />
                      Application Usage
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Patients', value: details.patient_count, icon: UserIcon, color: 'text-blue-600 bg-blue-50' },
                        { label: 'Cases', value: details.case_count, icon: FileText, color: 'text-teal-600 bg-teal-50' },
                        { label: 'Ground Truths', value: details.ground_truth_count, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center">
                          <div className={`p-2 rounded-lg ${color} mb-2`}>
                            <Icon size={16} />
                          </div>
                          <p className="text-2xl font-bold text-slate-800">{value}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Layers size={14} className="text-purple-600" />
                      Account Details
                    </h3>
                    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {[
                        { label: 'Full Name', value: user.fullName },
                        { label: 'Email Address', value: user.email },
                        { label: 'User ID', value: user.id, mono: true },
                        { label: 'Role', value: roleLabel },
                        { label: 'Specialty', value: user.specialty || 'General / Physical Therapy' },
                        { label: 'Account Status', value: user.isActive !== false ? '✅ Active' : '🚫 Deactivated' },
                        { label: 'Account Created', value: user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A' },
                        { label: 'Last Updated', value: user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A' },
                        { label: 'Last Login', value: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never recorded' },
                        { label: 'Total Logins', value: String(details.total_logins) },
                      ].map(({ label, value, mono }) => (
                        <div key={label} className="px-4 py-3 flex justify-between items-center text-sm">
                          <span className="text-slate-500 text-xs font-semibold w-36 shrink-0">{label}</span>
                          <span className={`text-slate-800 text-right ${mono ? 'font-mono text-xs break-all' : 'font-medium'}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Permissions */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Shield size={14} className="text-amber-600" />
                      Assigned Permissions
                    </h3>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                      {user.role === 'admin' || user.role === 'doctor' ? (
                        <>
                          <p className="text-xs font-semibold text-slate-600 flex items-center gap-2"><Stethoscope size={14} className="text-teal-600" /> Clinical Portal</p>
                          <ul className="text-xs text-slate-500 ml-5 list-disc space-y-1">
                            <li>Patient Registration & Management</li>
                            <li>Clinical Intake & Case Creation</li>
                            <li>Doctor Ground Truth Reviews</li>
                          </ul>
                        </>
                      ) : null}
                      {user.role === 'admin' || user.role === 'ai_user' ? (
                        <>
                          <p className="text-xs font-semibold text-slate-600 flex items-center gap-2 mt-3"><Cpu size={14} className="text-amber-600" /> AI Lab Portal</p>
                          <ul className="text-xs text-slate-500 ml-5 list-disc space-y-1">
                            <li>Model Registry & Evaluation</li>
                            <li>Prompt Lab & RAG Studio</li>
                            <li>Experiment Comparisons & Analytics</li>
                          </ul>
                        </>
                      ) : null}
                      {user.role === 'admin' && (
                        <>
                          <p className="text-xs font-semibold text-slate-600 flex items-center gap-2 mt-3"><Shield size={14} className="text-purple-600" /> Admin Portal</p>
                          <ul className="text-xs text-slate-500 ml-5 list-disc space-y-1">
                            <li>User Role & Status Management</li>
                            <li>System Settings & Configuration</li>
                            <li>All Clinical and AI Lab access</li>
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Sessions Tab ── */}
              {activeTab === 'sessions' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <History size={14} className="text-blue-600" />
                      Login History (Last 10 events)
                    </h3>
                    <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      {details.total_logins} total logins
                    </span>
                  </div>

                  {details.login_history.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-10 text-center">
                      <LogIn size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-500">No login events recorded yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Events are logged on the next login after applying this update.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <ul className="divide-y divide-slate-100">
                        {details.login_history.map((log, i) => (
                          <li key={i} className="px-4 py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                <Monitor size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {parseDevice(log.user_agent)}
                                  {parseBrowser(log.user_agent) && (
                                    <span className="ml-2 text-xs font-normal text-slate-500">via {parseBrowser(log.user_agent)}</span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{log.ip || 'IP not captured'}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm text-slate-700 font-medium">{new Date(log.logged_in_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              <p className="text-xs text-slate-400">{new Date(log.logged_in_at).toLocaleTimeString()}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p>IP addresses are not currently captured by the browser client. This requires a backend middleware or Supabase Edge Function to populate reliably.</p>
                  </div>
                </div>
              )}

              {/* ── Cases Tab ── */}
              {activeTab === 'cases' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <ActivitySquare size={14} className="text-purple-600" />
                      Recent Patient Cases
                    </h3>
                    <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      {details.case_count} total
                    </span>
                  </div>

                  {details.recent_cases.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-10 text-center">
                      <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-500">No patient cases created by this user.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {details.recent_cases.map((c) => (
                        <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-slate-800 text-sm pr-4">{c.title}</h4>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}>
                              {c.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div>
                              <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">Patient</p>
                              <p className="font-medium text-slate-700">
                                {c.patient ? `${c.patient.name} · ${c.patient.age}y ${c.patient.sex.charAt(0).toUpperCase()}` : 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">Body Region</p>
                              <p className="font-medium text-slate-700 capitalize">{c.body_region.replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">Difficulty</p>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${DIFFICULTY_COLORS[c.difficulty] || 'bg-slate-100 text-slate-600'}`}>
                                {c.difficulty.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div>
                              <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">Created</p>
                              <p className="text-slate-600">{new Date(c.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
