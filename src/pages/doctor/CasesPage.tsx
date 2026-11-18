import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  PlusCircle,
  Search,
  Filter,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Badge,
  StatCard,
  Tabs,
  TabList,
  TabTrigger,
  NoCasesEmpty,
  Card,
  CardBody,
} from '@/components/ui';
import { casesApi, regionsApi } from '@/lib/api';
import type { PatientCase } from '@/types';

export default function CasesPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [regionSearch, setRegionSearch] = useState('');

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const data = await casesApi.list();
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
    regionsApi.getAll().then((regions) => {
      if (regions.length > 0) setAvailableRegions(regions);
    });
  }, []);

  const safeCases = Array.isArray(cases) ? cases : [];
  const q = (searchQuery || '').toLowerCase();

  // Filter cases
  const filteredCases = safeCases.filter((c) => {
    if (!c) return false;
    const titleStr = (c.title || '').toLowerCase();
    const patName = (c.patient?.name || '').toLowerCase();
    const mrn = (c.patient?.mrn || '').toLowerCase();
    const region = (c.bodyRegion || '').toLowerCase();

    const matchesSearch =
      titleStr.includes(q) ||
      patName.includes(q) ||
      mrn.includes(q) ||
      region.includes(q);

    const matchesStatus =
      selectedStatus === 'all' || c.status === selectedStatus;

    const matchesRegion =
      selectedRegion === 'all' ||
      (c.bodyRegion || '').toLowerCase() === selectedRegion.toLowerCase();

    return matchesSearch && matchesStatus && matchesRegion;
  });

  // Status stats
  const totalCount = safeCases.length;
  const gtReadyCount = safeCases.filter((c) => c?.status === 'ground_truth_ready').length;
  const reviewedCount = safeCases.filter((c) => c?.status === 'reviewed').length;
  const draftCount = safeCases.filter((c) => c?.status === 'draft').length;

  const getStatusBadge = (status: PatientCase['status']) => {
    switch (status) {
      case 'ground_truth_ready':
        return (
          <Badge variant="clinical" size="sm" dot>
            Ground Truth Ready
          </Badge>
        );
      case 'reviewed':
        return (
          <Badge variant="success" size="sm" dot>
            Doctor Reviewed
          </Badge>
        );
      case 'evaluating':
        return (
          <Badge variant="brand" size="sm" dot>
            AI Evaluated
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm" dot>
            Draft
          </Badge>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* ── Page Header ── */}
      <PageHeader
        title="Patient Cases"
        subtitle="Manage clinical cases, dictate condition ground truth, and run AI evaluation"
        action={
          <Button
            variant="clinical"
            size="md"
            icon={<PlusCircle size={16} />}
            onClick={() => navigate('/doctor/cases/new')}
          >
            Create New Case
          </Button>
        }
      />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Cases"
          value={totalCount}
          icon={<FolderOpen size={20} className="text-clinical-600" />}
          description="Active clinical cases"
        />
        <StatCard
          label="Ground Truth Ready"
          value={gtReadyCount}
          icon={<CheckCircle2 size={20} className="text-clinical-700" />}
          description="Ready for AI evaluation"
        />
        <StatCard
          label="Doctor Reviewed"
          value={reviewedCount}
          icon={<Sparkles size={20} className="text-emerald-600" />}
          description="Clinically validated"
        />
        <StatCard
          label="Drafts In Progress"
          value={draftCount}
          icon={<Clock size={20} className="text-amber-500" />}
          description="Awaiting ground truth completion"
        />
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by patient, title, MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm text-slate-900 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-600 transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Region Filter — dynamic + searchable */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium shrink-0">
            <Filter size={14} />
            <span>Region:</span>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="All Regions"
              value={regionSearch}
              onChange={(e) => {
                setRegionSearch(e.target.value);
                if (e.target.value === '') setSelectedRegion('all');
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-clinical-500 w-48 placeholder:text-slate-500"
            />
            {regionSearch && (
              <div className="absolute z-20 top-full mt-1 left-0 w-48 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg text-xs">
                <div
                  className="px-3 py-2 cursor-pointer hover:bg-slate-50 text-slate-600 font-medium border-b border-slate-100"
                  onClick={() => { setSelectedRegion('all'); setRegionSearch(''); }}
                >
                  ✕ All Regions
                </div>
                {availableRegions
                  .filter((r) => r.toLowerCase().includes(regionSearch.toLowerCase()))
                  .map((r) => (
                    <div
                      key={r}
                      className={`px-3 py-2 cursor-pointer hover:bg-clinical-50 ${
                        selectedRegion.toLowerCase() === r.toLowerCase()
                          ? 'bg-clinical-50 text-clinical-700 font-semibold'
                          : 'text-slate-700'
                      }`}
                      onClick={() => { setSelectedRegion(r); setRegionSearch(r); }}
                    >
                      {r}
                    </div>
                  ))}
                {availableRegions.filter((r) =>
                  r.toLowerCase().includes(regionSearch.toLowerCase())
                ).length === 0 && (
                  <div className="px-3 py-2 text-slate-400">No matching regions</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <Tabs defaultValue="all">
        <TabList>
          <TabTrigger value="all" onClick={() => setSelectedStatus('all')}>All Cases ({totalCount})</TabTrigger>
          <TabTrigger value="ground_truth_ready" onClick={() => setSelectedStatus('ground_truth_ready')}>Ready for AI ({gtReadyCount})</TabTrigger>
          <TabTrigger value="reviewed" onClick={() => setSelectedStatus('reviewed')}>Reviewed ({reviewedCount})</TabTrigger>
          <TabTrigger value="draft" onClick={() => setSelectedStatus('draft')}>Drafts ({draftCount})</TabTrigger>
        </TabList>
      </Tabs>

      {/* ── Case List / Cards ── */}
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="inline-block w-8 h-8 border-3 border-clinical-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading clinical cases...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <NoCasesEmpty onCreate={() => navigate('/doctor/cases/new')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCases.map((c) => (
            <Card
              key={c.id}
              hoverable
              className="flex flex-col justify-between border-slate-200 hover:border-clinical-300 transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/doctor/cases/${c.id}`)}
            >
              <CardBody className="space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
                      {c.patient?.mrn || 'MRN-PENDING'}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-clinical-700 transition-colors line-clamp-1">
                      {c.title}
                    </h3>
                  </div>
                  {getStatusBadge(c.status)}
                </div>

                {/* Patient metadata */}
                <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50/80 px-3 py-2 rounded-lg border border-slate-100">
                  <User size={13} className="text-slate-400" />
                  <span className="font-medium text-slate-800">{c.patient?.name}</span>
                  <span className="text-slate-300">•</span>
                  <span>{c.patient?.age} yrs</span>
                  <span className="text-slate-300">•</span>
                  <span className="capitalize">{c.patient?.sex}</span>
                </div>

                {/* Condition snippet */}
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {c.conditionFinalText || c.conditionText || 'No clinical description provided yet.'}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="neutral" size="sm">
                    {c.bodyRegion.toUpperCase()}
                  </Badge>
                  {c.tags.slice(0, 2).map((tag, idx) => (
                    <Badge key={idx} variant="outline" size="sm">
                      {tag}
                    </Badge>
                  ))}
                  {c.tags.length > 2 && (
                    <span className="text-[10px] text-slate-400 font-medium self-center">
                      +{c.tags.length - 2} more
                    </span>
                  )}
                </div>
              </CardBody>

              {/* Footer action */}
              <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {new Date(c.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="font-semibold text-clinical-600 group-hover:text-clinical-700 flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
                  {c.status === 'reviewed' ? 'View Review' : 'Open Case'}
                  <ArrowRight size={13} />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
