import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  StatCard,
  NoCasesEmpty,
  PageHeader,
  Button,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  Card,
  CardBody,
  Badge,
} from '@/components/ui';
import {
  PlusCircle,
  FolderOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
  User,
  Sparkles,
} from 'lucide-react';
import { casesApi } from '@/lib/api';
import type { PatientCase } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    casesApi
      .list()
      .then((data) => setCases(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load cases:', err);
        setCases([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const safeCases = Array.isArray(cases) ? cases : [];
  const totalCases = safeCases.length;
  const pendingReview = safeCases.filter((c) => c?.status === 'evaluating' || c?.status === 'ground_truth_ready').length;
  const reviewedCases = safeCases.filter((c) => c?.status === 'reviewed').length;

  const renderCaseList = (items: PatientCase[]) => {
    if (!items || items.length === 0) {
      return <NoCasesEmpty onCreate={() => navigate('/doctor/cases/new')} />;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
        {items.map((c) => {
          if (!c) return null;
          const statusVal = c.status || 'draft';
          const bodyRegionStr = (c.bodyRegion || 'general').toUpperCase();
          const mrnStr = c.patient?.mrn || 'MRN-PENDING';
          const patientNameStr = c.patient?.name || 'Patient';
          const updatedDateStr = c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'Recent';
          const caseTitleStr = c.title || 'Untitled Case';
          const descStr = c.conditionFinalText || c.conditionText || 'No clinical description provided yet.';

          return (
            <Card
              key={c.id || `case-${Math.random()}`}
              hoverable
              className="border-slate-200 hover:border-clinical-300 transition-all cursor-pointer group flex flex-col justify-between"
              onClick={() => navigate(`/doctor/cases/${c.id}`)}
            >
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {mrnStr}
                  </span>
                  <Badge
                    variant={
                      statusVal === 'reviewed'
                        ? 'success'
                        : statusVal === 'ground_truth_ready'
                        ? 'clinical'
                        : 'neutral'
                    }
                    size="sm"
                    dot
                  >
                    {statusVal.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <h4 className="text-sm font-bold text-slate-900 group-hover:text-clinical-700 transition-colors line-clamp-1">
                  {caseTitleStr}
                </h4>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <User size={13} className="text-slate-400" />
                  <span className="font-medium text-slate-700">{patientNameStr}</span>
                  <span>•</span>
                  <span>{bodyRegionStr}</span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {descStr}
                </p>
              </CardBody>

              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{updatedDateStr}</span>
                <span className="font-semibold text-clinical-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Open Case
                  <ArrowRight size={12} />
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* ── Page Header ── */}
      <PageHeader
        title={`Welcome back, ${user?.fullName ?? 'Doctor'} 👋`}
        subtitle="Capture clinical patient cases, dictate condition ground truth, and review AI outputs"
        action={
          <Button
            variant="clinical"
            size="md"
            icon={<PlusCircle size={15} />}
            onClick={() => navigate('/doctor/cases/new')}
          >
            Create New Case
          </Button>
        }
      />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label="Total Patient Cases"
          value={totalCases}
          icon={<FolderOpen size={20} className="text-clinical-600" />}
          description="Active clinical files"
        />
        <StatCard
          label="Awaiting Evaluation / Review"
          value={pendingReview}
          icon={<Clock size={20} className="text-amber-500" />}
          description="Cases ready for verification"
        />
        <StatCard
          label="Doctor Reviewed"
          value={reviewedCases}
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          description="Clinically approved plans"
        />
      </div>

      {/* ── Tabs & Case Collections ── */}
      <Tabs defaultValue="all">
        <TabList>
          <TabTrigger value="all">Recent Cases ({totalCases})</TabTrigger>
          <TabTrigger value="pending">Awaiting Review ({pendingReview})</TabTrigger>
          <TabTrigger value="reviewed">Reviewed ({reviewedCases})</TabTrigger>
        </TabList>

        <TabContent value="all">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading cases...</div>
          ) : (
            renderCaseList(safeCases)
          )}
        </TabContent>

        <TabContent value="pending">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading cases...</div>
          ) : (
            renderCaseList(
              safeCases.filter((c) => c?.status === 'evaluating' || c?.status === 'ground_truth_ready')
            )
          )}
        </TabContent>

        <TabContent value="reviewed">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading cases...</div>
          ) : (
            renderCaseList(safeCases.filter((c) => c?.status === 'reviewed'))
          )}
        </TabContent>
      </Tabs>
    </div>
  );
}
