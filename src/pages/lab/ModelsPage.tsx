import React, { useState, useEffect } from 'react';
import {
  Cpu,
  PlusCircle,
  CheckCircle2,
  DollarSign,
  Zap,
  Globe,
  Sliders,
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
import { modelsApi } from '@/lib/api';
import type { AIModel, ModelProviderType } from '@/types';

export default function ModelsPage() {
  const { toast } = useToast();
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New model state
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<ModelProviderType>('anthropic');
  const [modelIdentifier, setModelIdentifier] = useState('');
  const [contextWindow, setContextWindow] = useState(200000);
  const [inputCost, setInputCost] = useState(0.003);
  const [outputCost, setOutputCost] = useState(0.015);
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [endpointUrl, setEndpointUrl] = useState('');

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const data = await modelsApi.list();
      setModels(data);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !modelIdentifier.trim()) {
      toast({
        title: 'Fields required',
        description: 'Please provide both model name and model identifier.',
        variant: 'warning',
      });
      return;
    }

    try {
      await modelsApi.create({
        name: name.trim(),
        provider,
        modelIdentifier: modelIdentifier.trim(),
        contextWindow: Number(contextWindow),
        inputTokenCostPer1k: Number(inputCost),
        outputTokenCostPer1k: Number(outputCost),
        endpointUrl: endpointUrl.trim() || undefined,
        defaultConfig: {
          temperature: Number(temperature),
          maxTokens: Number(maxTokens),
        },
        isActive: true,
        isDefaultProduction: false,
      });

      toast({
        title: 'Model Registered',
        description: `${name} added to the model registry.`,
        variant: 'success',
      });

      setIsModalOpen(false);
      setName('');
      setModelIdentifier('');
      loadModels();
    } catch (err: any) {
      toast({
        title: 'Registration failed',
        description: err.message || 'Unable to register model.',
        variant: 'danger',
      });
    }
  };

  const getProviderBadge = (p: ModelProviderType) => {
    switch (p) {
      case 'anthropic':
        return <Badge variant="brand" size="sm">Anthropic</Badge>;
      case 'openai':
        return <Badge variant="clinical" size="sm">OpenAI</Badge>;
      case 'bedrock':
        return <Badge variant="warning" size="sm">AWS Bedrock</Badge>;
      case 'ollama':
        return <Badge variant="neutral" size="sm">Ollama (Local)</Badge>;
      default:
        return <Badge variant="outline" size="sm">Custom HTTP</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="Provider-Agnostic Model Registry"
        subtitle="Manage LLM endpoints, token pricing tables, context limits, and hyperparameter bounds"
        action={
          <Button
            variant="lab"
            size="md"
            icon={<PlusCircle size={15} />}
            onClick={() => setIsModalOpen(true)}
          >
            Register New Model
          </Button>
        }
      />

      {/* ── Models Grid ── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading model registry...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {models.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  {getProviderBadge(m.provider)}
                  {m.isDefaultProduction && (
                    <Badge variant="success" size="sm" dot>
                      Production Default
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-100 group-hover:text-brand-300 transition-colors">
                    {m.name}
                  </h4>
                  <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                    {m.modelIdentifier}
                  </p>
                </div>

                {/* Specs Box */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Context Window</span>
                    <span className="text-slate-200 font-semibold">
                      {(m.contextWindow / 1000).toFixed(0)}k tokens
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Default Temp</span>
                    <span className="text-slate-200 font-semibold">
                      {m.defaultConfig?.temperature ?? 0.2}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Pricing (/1k tok):</span>
                    <span className="text-slate-300">
                      ${m.inputTokenCostPer1k} in / ${m.outputTokenCostPer1k} out
                    </span>
                  </div>
                </div>
              </div>

              {/* Status footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Active Endpoint
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  Max: {m.defaultConfig?.maxTokens || 4096}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Register New Model ── */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} size="lg">
        <ModalHeader
          title="Register Model Endpoint"
          description="Add an OpenAI-compatible, Anthropic, Bedrock, or custom HTTP endpoint"
        />
        <form onSubmit={handleRegister}>
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Claude 3.5 Sonnet (Latest)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Provider Type *</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as ModelProviderType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="openai">OpenAI</option>
                  <option value="bedrock">Amazon Bedrock</option>
                  <option value="ollama">Ollama (Local / Self-hosted)</option>
                  <option value="custom_http">Custom HTTP Endpoint</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Model Identifier / Slug *</label>
              <input
                type="text"
                required
                placeholder="e.g. claude-3-5-sonnet-20241022 or gpt-4o"
                value={modelIdentifier}
                onChange={(e) => setModelIdentifier(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {provider === 'custom_http' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Custom HTTP Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://my-llm-service.internal/v1/chat/completions"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Context Window</label>
                <input
                  type="number"
                  value={contextWindow}
                  onChange={(e) => setContextWindow(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Input Cost ($/1k)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={inputCost}
                  onChange={(e) => setInputCost(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Output Cost ($/1k)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={outputCost}
                  onChange={(e) => setOutputCost(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Default Temperature</label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Default Max Tokens</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="lab" size="sm" type="submit">
              Register Model
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
