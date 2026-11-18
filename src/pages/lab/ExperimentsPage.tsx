import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GitCompare,
  PlusCircle,
  Play,
  Clock,
  DollarSign,
  Cpu,
  Layers,
  FileCode2,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
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
import {
  experimentsApi,
  modelsApi,
  datasetsApi,
  promptsApi,
  ragApi,
} from '@/lib/api';
import type {
  Experiment,
  AIModel,
  Dataset,
  PromptVersion,
  RAGConfig,
} from '@/types';

export default function ExperimentsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [ragConfigs, setRagConfigs] = useState<RAGConfig[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Experiment Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [selectedRagId, setSelectedRagId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [exp, mod, ds, pr, rag] = await Promise.all([
        experimentsApi.list(),
        modelsApi.list(),
        datasetsApi.list(),
        promptsApi.list(),
        ragApi.list(),
      ]);
      setExperiments(exp);
      setModels(mod);
      setDatasets(ds);
      setPrompts(pr);
      setRagConfigs(rag);

      // Set defaults for creation modal
      if (ds.length > 0) setSelectedDatasetId(ds[0].id);
      if (mod.length > 0) setSelectedModelIds([mod[0].id, mod[1]?.id].filter(Boolean) as string[]);
      if (pr.length > 0) setSelectedPromptId(pr[0].id);
      if (rag.length > 0) setSelectedRagId(rag[0].id);

      // Check if URL triggers new experiment
      if (searchParams.get('action') === 'new') {
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load experiments data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleModelSelection = (modelId: string) => {
    if (selectedModelIds.includes(modelId)) {
      if (selectedModelIds.length > 1) {
        setSelectedModelIds(selectedModelIds.filter((id) => id !== modelId));
      } else {
        toast({
          title: 'Minimum 1 model required',
          description: 'You must select at least one AI model.',
          variant: 'warning',
        });
      }
    } else {
      setSelectedModelIds([...selectedModelIds, modelId]);
    }
  };

  const handleLaunchExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: 'Experiment name required',
        description: 'Please give this evaluation run a descriptive name.',
        variant: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await experimentsApi.create({
        name: name.trim(),
        description: description.trim(),
        datasetId: selectedDatasetId,
        modelIds: selectedModelIds,
        promptVersionId: selectedPromptId,
        ragConfigId: selectedRagId,
      });

      toast({
        title: 'Experiment Launched',
        description: `Batch ${created.id} queued for multi-model execution.`,
        variant: 'success',
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      loadData();
    } catch (err: any) {
      toast({
        title: 'Execution Failed',
        description: err.message || 'Unable to launch experiment.',
        variant: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="Multi-Model Experimentation"
        subtitle="Execute, compare, and benchmark multiple models against clinical datasets with controlled prompt and RAG configurations"
        action={
          <Button
            variant="lab"
            size="md"
            icon={<PlusCircle size={15} />}
            onClick={() => setIsModalOpen(true)}
          >
            New Experiment
          </Button>
        }
      />

      {/* ── Experiments Table / List ── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading experiments...</div>
      ) : experiments.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <GitCompare size={32} className="mx-auto text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-300">No Experiments Executed</h3>
          <p className="text-xs text-slate-500">Launch a multi-model benchmark run to compare outputs.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 group"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-lab-400 bg-lab-500/10 px-2 py-0.5 rounded border border-lab-500/20">
                    {exp.id}
                  </span>
                  <Badge
                    variant={exp.status === 'completed' ? 'success' : exp.status === 'running' ? 'warning' : 'danger'}
                    size="sm"
                    dot
                  >
                    {exp.status.toUpperCase()}
                  </Badge>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-mono text-slate-400">
                    Dataset: {datasets.find((d) => d.id === exp.datasetId)?.name || exp.datasetId}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-100 group-hover:text-lab-300 transition-colors">
                    {exp.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {exp.description || 'No description provided.'}
                  </p>
                </div>

                {/* Configuration tags */}
                <div className="flex flex-wrap gap-2 text-xs font-mono pt-1">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    <Cpu size={12} className="text-brand-400" />
                    {exp.modelIds.length} Models ({exp.modelIds.map((m) => m.replace('model-', '')).join(', ')})
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    <FileCode2 size={12} className="text-amber-400" />
                    Prompt: {exp.promptVersionId}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    <Layers size={12} className="text-indigo-400" />
                    RAG: {exp.ragConfigId}
                  </span>
                </div>
              </div>

              {/* Metrics & Action Column */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block">Avg Latency</span>
                    <span className="text-slate-200 font-semibold">
                      {exp.averageLatencyMs ? `${exp.averageLatencyMs} ms` : '—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block">Total Cost</span>
                    <span className="text-slate-200 font-semibold">
                      ${exp.totalCostUsd ? exp.totalCostUsd.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block">Progress</span>
                    <span className="text-emerald-400 font-semibold">
                      {exp.completedCases}/{exp.totalCases}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate(`/lab/comparison?exp=${exp.id}`);
                  }}
                  icon={<ArrowRight size={13} />}
                >
                  Compare Outputs
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Launch Experiment ── */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} size="xl">
        <ModalHeader
          title="Launch Multi-Model Benchmark Experiment"
          description="Configure an execution matrix across datasets, models, prompt versions, and RAG architectures"
        />
        <form onSubmit={handleLaunchExperiment}>
          <ModalBody className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Experiment Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Claude 3.5 Sonnet vs GPT-4o on Knee Cohort v1.2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Hypothesis / Test Description</label>
              <input
                type="text"
                placeholder="e.g. Assessing whether Sonnet reduces unsupported diagnostic inferences compared to GPT-4o"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>

            {/* Model Selection (Multi-select) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={13} className="text-brand-400" />
                  Select Models to Compare (Multi-select for Side-by-Side)
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  {selectedModelIds.length} models selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {models.map((m) => {
                  const isSelected = selectedModelIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleModelSelection(m.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500 text-white shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200">{m.name}</span>
                        {isSelected && <CheckCircle2 size={13} className="text-brand-400" />}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 truncate block">
                        {m.modelIdentifier}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix selectors: Dataset, Prompt, RAG */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                  <Database size={12} className="text-lab-400" />
                  Target Dataset
                </label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                  <FileCode2 size={12} className="text-amber-400" />
                  Prompt Version
                </label>
                <select
                  value={selectedPromptId}
                  onChange={(e) => setSelectedPromptId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
                >
                  {prompts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                  <Layers size={12} className="text-indigo-400" />
                  RAG Configuration
                </label>
                <select
                  value={selectedRagId}
                  onChange={(e) => setSelectedRagId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
                >
                  {ragConfigs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.version})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="lab" size="sm" type="submit" loading={isSubmitting}>
              Queue & Execute Benchmark
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
