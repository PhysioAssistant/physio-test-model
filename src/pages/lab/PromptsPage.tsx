import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  PlusCircle,
  Copy,
  Check,
  History,
  Code2,
  Tag,
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
import { promptsApi } from '@/lib/api';
import type { PromptVersion } from '@/types';

export default function PromptsPage() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // New version form
  const [name, setName] = useState('');
  const [version, setVersion] = useState('v9');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPromptTemplate, setUserPromptTemplate] = useState('');
  const [changeSummary, setChangeSummary] = useState('');

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const data = await promptsApi.list();
      setPrompts(data);
      if (data.length > 0) {
        setSelectedPrompt(data[0]);
      }
    } catch (err) {
      console.error('Failed to load prompts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
    toast({
      title: 'Copied',
      description: `${fieldName} copied to clipboard.`,
      variant: 'info',
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) {
      toast({
        title: 'Fields required',
        description: 'Please specify prompt name and system instructions.',
        variant: 'warning',
      });
      return;
    }

    try {
      const created = await promptsApi.create({
        promptId: 'physio-clinical-main',
        name: name.trim(),
        version: version.trim() || `v${prompts.length + 1}`,
        systemPrompt: systemPrompt.trim(),
        userPromptTemplate: userPromptTemplate.trim(),
        supportedVariables: ['patient_context', 'retrieved_context', 'clinical_findings'],
        expectedOutputSchemaJson: '{}',
        changeSummary: changeSummary.trim() || 'Iteration update',
        isActive: true,
        createdBy: 'ai-001',
      });

      toast({
        title: 'Prompt Version Created',
        description: `Version ${created.version} successfully registered.`,
        variant: 'success',
      });

      setIsModalOpen(false);
      setName('');
      loadPrompts();
    } catch (err: any) {
      toast({
        title: 'Creation Failed',
        description: err.message || 'Unable to create prompt version.',
        variant: 'danger',
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="Versioned Prompt Lab"
        subtitle="Maintain immutable, reproducible prompt versions, variables, and clinical schema contracts"
        action={
          <Button
            variant="lab"
            size="md"
            icon={<PlusCircle size={15} />}
            onClick={() => {
              setName(selectedPrompt?.name || 'Physio Clinical Assessment & Prescription');
              setVersion(`v${prompts.length + 8}`);
              setSystemPrompt(selectedPrompt?.systemPrompt || '');
              setUserPromptTemplate(selectedPrompt?.userPromptTemplate || '');
              setIsModalOpen(true);
            }}
          >
            New Prompt Version
          </Button>
        }
      />

      {/* ── Main Two-Column View ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Version History Selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Version History</span>
            <span className="font-mono">{prompts.length} versions</span>
          </div>

          <div className="space-y-2">
            {prompts.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPrompt(p)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedPrompt?.id === p.id
                    ? 'bg-slate-900 border-lab-500 shadow-xs'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-lab-400 bg-lab-500/10 px-2 py-0.5 rounded border border-lab-500/20">
                      {p.version}
                    </span>
                    {p.isActive && (
                      <Badge variant="success" size="sm" dot>
                        Production
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-slate-200">{p.name}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-2">
                  {p.changeSummary || 'No change summary logged.'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Prompt Inspection */}
        <div className="lg:col-span-8 space-y-5">
          {selectedPrompt ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-lab-400 bg-lab-500/10 px-2.5 py-0.5 rounded border border-lab-500/20">
                      {selectedPrompt.version}
                    </span>
                    <span className="text-slate-600">•</span>
                    <h3 className="text-base font-bold text-slate-100">{selectedPrompt.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Created by <span className="font-mono text-slate-300">{selectedPrompt.createdBy}</span> on{' '}
                    {new Date(selectedPrompt.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {selectedPrompt.isActive && (
                  <Badge variant="success" size="md">
                    Active Benchmark Target
                  </Badge>
                )}
              </div>

              {/* Supported Variables */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={13} className="text-amber-400" />
                  Available Template Variables
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedPrompt.supportedVariables.map((v) => (
                    <span
                      key={v}
                      className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    System Instructions
                  </label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedPrompt.systemPrompt, 'System Prompt')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {copiedField === 'System Prompt' ? <Check size={12} /> : <Copy size={12} />}
                    Copy
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {selectedPrompt.systemPrompt}
                </div>
              </div>

              {/* User Prompt Template */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    User Prompt Template
                  </label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedPrompt.userPromptTemplate, 'User Template')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {copiedField === 'User Template' ? <Check size={12} /> : <Copy size={12} />}
                    Copy
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {selectedPrompt.userPromptTemplate}
                </div>
              </div>

              {/* Output Schema */}
              {selectedPrompt.expectedOutputSchemaJson && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 size={13} className="text-indigo-400" />
                    Expected Structured Output JSON Schema
                  </label>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300 max-h-48 overflow-y-auto">
                    {selectedPrompt.expectedOutputSchemaJson}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
              Select a prompt version to inspect.
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Create New Version ── */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} size="lg">
        <ModalHeader
          title="Create New Prompt Version"
          description="Create an immutable revision with updated clinical guidelines or schema constraints"
        />
        <form onSubmit={handleCreate}>
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Prompt Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Version Identifier</label>
                <input
                  type="text"
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-lab-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Change Summary / Changelog *</label>
              <input
                type="text"
                required
                placeholder="e.g. Added strict requirement to flag unmeasured ROM"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">System Instructions *</label>
              <textarea
                rows={4}
                required
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">User Prompt Template *</label>
              <textarea
                rows={4}
                required
                value={userPromptTemplate}
                onChange={(e) => setUserPromptTemplate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="lab" size="sm" type="submit">
              Save Prompt Version
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
