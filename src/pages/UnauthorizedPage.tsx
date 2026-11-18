import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-danger-light flex items-center justify-center mb-6">
        <ShieldOff size={28} className="text-danger" />
      </div>
      <h1 className="font-display font-bold text-2xl text-slate-800 mb-2">Access Denied</h1>
      <p className="text-slate-500 text-sm mb-1">
        Your account role (<span className="font-semibold text-slate-700">{user?.role ?? 'unknown'}</span>) does not have
        permission to view this page.
      </p>
      <p className="text-slate-400 text-xs mb-8">
        Contact your administrator if you believe this is a mistake.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Button variant="danger" size="sm" leftIcon={<LogOut size={14} />} onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
