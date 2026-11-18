import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { RouteGuard, GuestGuard } from '@/components/auth/RouteGuard';
import { ErrorBoundary } from '@/components/ui';

/* ── Pages ── */
import LoginPage from '@/pages/LoginPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';
import NotFoundPage from '@/pages/NotFoundPage';

/* ── Unified Doctor Layout (handles Doctor, AI Operator, Admin via dynamic sidebar) ── */
import DoctorLayout from '@/layouts/DoctorLayout';

/* ── Doctor Pages ── */
import DashboardPage from '@/pages/doctor/DashboardPage';
import CasesPage from '@/pages/doctor/CasesPage';
import CreateCasePage from '@/pages/doctor/CreateCasePage';
import CaseDetailPage from '@/pages/doctor/CaseDetailPage';

/* ── Lab Pages ── */
import LabDashboardPage from '@/pages/lab/LabDashboardPage';
import LabCasesPage from '@/pages/lab/LabCasesPage';
import DatasetsPage from '@/pages/lab/DatasetsPage';
import ModelsPage from '@/pages/lab/ModelsPage';
import PromptsPage from '@/pages/lab/PromptsPage';
import RAGPage from '@/pages/lab/RAGPage';
import ExperimentsPage from '@/pages/lab/ExperimentsPage';
import ComparisonPage from '@/pages/lab/ComparisonPage';
import EvaluationDashboardPage from '@/pages/lab/EvaluationDashboardPage';
import ReviewsPage from '@/pages/lab/ReviewsPage';
import RegressionPage from '@/pages/lab/RegressionPage';
import AnalyticsPage from '@/pages/lab/AnalyticsPage';

/* ── Admin Pages ── */
import UserManagementPage from '@/pages/admin/UserManagementPage';

function AppRoutes() {
  return (
    <Routes>
      {/* ── PUBLIC: Login ── */}
      <Route path="/" element={<GuestGuard><LoginPage /></GuestGuard>} />

      {/* ── PROTECTED: Unified Doctor Layout ── */}
      {/*   Accessible to: doctor, ai_user, admin                     */}
      {/*   Sidebar sections shown depend on role (see DoctorLayout)  */}
      <Route
        path="/doctor"
        element={
          <RouteGuard allowedRoles={['doctor', 'ai_user', 'admin']}>
            <DoctorLayout />
          </RouteGuard>
        }
      >
        {/* Doctor: Dashboard & Cases */}
        <Route index element={<DashboardPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/new" element={<CreateCasePage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />

        {/* AI Lab — nested under /doctor/lab (roles: ai_user, admin) */}
        <Route
          path="lab"
          element={
            <RouteGuard allowedRoles={['ai_user', 'admin']}>
              <LabDashboardPage />
            </RouteGuard>
          }
        />
        <Route
          path="lab/cases"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><LabCasesPage /></RouteGuard>}
        />
        <Route
          path="lab/datasets"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><DatasetsPage /></RouteGuard>}
        />
        <Route
          path="lab/models"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><ModelsPage /></RouteGuard>}
        />
        <Route
          path="lab/prompts"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><PromptsPage /></RouteGuard>}
        />
        <Route
          path="lab/rag"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><RAGPage /></RouteGuard>}
        />
        <Route
          path="lab/experiments"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><ExperimentsPage /></RouteGuard>}
        />
        <Route
          path="lab/comparison"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><ComparisonPage /></RouteGuard>}
        />
        <Route
          path="lab/experiments/:id/compare"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><ComparisonPage /></RouteGuard>}
        />
        <Route
          path="lab/evaluations"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><EvaluationDashboardPage /></RouteGuard>}
        />
        <Route
          path="lab/reviews"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><ReviewsPage /></RouteGuard>}
        />
        <Route
          path="lab/regression"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><RegressionPage /></RouteGuard>}
        />
        <Route
          path="lab/analytics"
          element={<RouteGuard allowedRoles={['ai_user', 'admin']}><AnalyticsPage /></RouteGuard>}
        />

        {/* Admin — nested under /doctor/admin (role: admin only) */}
        <Route
          path="admin"
          element={<RouteGuard allowedRoles={['admin']}><UserManagementPage /></RouteGuard>}
        />
      </Route>

      {/* Legacy /lab redirect → /doctor/lab */}
      <Route path="/lab/*" element={<Navigate to="/doctor/lab" replace />} />

      {/* Utility routes */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}
