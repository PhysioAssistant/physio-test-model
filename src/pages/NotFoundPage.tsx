import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
      <p className="text-8xl font-display font-bold text-slate-100 mb-4 select-none">404</p>
      <h1 className="text-xl font-semibold text-slate-700 mb-2">Page not found</h1>
      <p className="text-slate-400 text-sm mb-8 max-w-xs">
        The page you're looking for doesn't exist or you don't have permission to view it.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors"
      >
        <ArrowLeft size={15} />
        Go back
      </button>
    </div>
  );
}
