import React, { useState, useEffect } from 'react';
import {
  Database,
  PlusCircle,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardBody,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useToast,
} from '@/components/ui';
import { datasetsApi } from '@/lib/api';
import type { Dataset } from '@/types';

export default function DatasetsPage() {
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New dataset form
  const [name, setName] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [cohort, setCohort] = useState('Knee & Spine Ambulatory');
  const [description, setDescription] = useState('');
  const [isBenchmark, setIsBenchmark] = useState(false);

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const data = await datasetsApi.list();
      setDatasets(data);
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: 'Dataset name required',
        description: 'Please specify a name for this evaluation dataset.',
        variant: 'warning',
      });
      return;
    }

    try {
      await datasetsApi.create({
        name: name.trim(),
        version: version.trim() || 'v1.0',
        cohort: cohort.trim() || 'General Orthopedic',
        description: description.trim(),
        isBenchmark,
      });

      toast({
        title: 'Dataset Created',
        description: `Evaluation dataset ${name} registered successfully.`,
        variant: 'success',
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      loadDatasets();
    } catch (err: any) {
      toast({
        title: 'Creation Failed',
        description: err.message || 'Unable to create dataset.',
        variant: 'danger',
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="Dataset Management"
        subtitle="Curate standardized test case cohorts, golden evaluation benchmarks, and active learning collections"
        action={
          <Button
            variant="lab"
            size="md"
            icon={<PlusCircle size={15} />}
            onClick={() => setIsModalOpen(true)}
          >
            Create New Dataset
          </Button>
        }
      />

      {/* ── Datasets Grid ── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading datasets...</div>
      ) : datasets.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <Database size={32} className="mx-auto text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-300">No Datasets Found</h3>
          <p className="text-xs text-slate-500">Create your first evaluation cohort to start benchmarking models.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-lab-400 bg-lab-500/10 px-2 py-0.5 rounded border border-lab-500/20">
                      {ds.version}
                    </span>
                    {ds.isBenchmark && (
                      <Badge variant="success" size="sm" dot>
                        Golden Benchmark
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{ds.id}</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-lab-300 transition-colors">
                    {ds.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {ds.description || 'No description provided.'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Cohort Tag:</span>
                  <span className="text-slate-200 font-semibold">{ds.cohort}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-mono text-slate-300">
                  <FolderOpen size={13} className="text-lab-400" />
                  {ds.caseCount ?? 0} Cases
                </span>
                <span className="text-[11px] text-slate-500">
                  {ds.updatedAt ? new Date(ds.updatedAt).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Create Dataset ── */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} size="md">
        <ModalHeader
          title="Create Evaluation Dataset"
          description="Register a new evaluation cohort for multi-model benchmarking"
        />
        <form onSubmit={handleCreate}>
          <ModalBody className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Dataset Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Lumbar Radiculopathy Benchmark 40"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Version String</label>
                <input
                  type="text"
                  placeholder="v1.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Clinical Cohort</label>
                <input
                  type="text"
                  placeholder="e.g. Knee & Spine"
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Description / Clinical Purpose</label>
              <textarea
                rows={3}
                placeholder="Describe the clinical inclusion criteria and evaluation goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isBenchmark"
                checked={isBenchmark}
                onChange={(e) => setIsBenchmark(e.target.checked)}
                className="rounded border-slate-700 text-lab-500 focus:ring-lab-400 bg-slate-950"
              />
              <label htmlFor="isBenchmark" className="text-xs text-slate-300 font-medium">
                Designate as Golden Benchmark Dataset (Used for regression testing)
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="lab" size="sm" type="submit">
              Save Dataset
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
