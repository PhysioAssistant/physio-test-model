import React, { useState, useEffect } from 'react';
import {
  Layers,
  PlusCircle,
  Database,
  Binary,
  Sliders,
  CheckCircle2,
  Cpu,
  BookOpen,
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
import { ragApi } from '@/lib/api';
import type { RAGConfig, RetrieverType } from '@/types';

export default function RAGPage() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<RAGConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [version, setVersion] = useState('kb-v13');
  const [knowledgeBaseName, setKnowledgeBaseName] = useState('APTA & JOSPT Orthopedic Guidelines');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-large');
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(64);
  const [retrieverType, setRetrieverType] = useState<RetrieverType>('hybrid_rrf');
  const [topK, setTopK] = useState(5);
  const [rrfKWeight, setRrfKWeight] = useState(60);
  const [rerankerEnabled, setRerankerEnabled] = useState(true);
  const [rerankerModel, setRerankerModel] = useState('cohere-rerank-v3');

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const data = await ragApi.list();
      setConfigs(data);
    } catch (err) {
      console.error('Failed to load RAG configs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please specify a name for this RAG configuration.',
        variant: 'warning',
      });
      return;
    }

    try {
      await ragApi.create({
        name: name.trim(),
        version: version.trim() || 'kb-v13',
        knowledgeBaseName: knowledgeBaseName.trim(),
        embeddingModel,
        chunkSize: Number(chunkSize),
        chunkOverlap: Number(chunkOverlap),
        retrieverType,
        topK: Number(topK),
        rrfKWeight: Number(rrfKWeight),
        rerankerEnabled,
        rerankerModel: rerankerEnabled ? rerankerModel : undefined,
      });

      toast({
        title: 'RAG Configuration Saved',
        description: `${name} registered for experimentation.`,
        variant: 'success',
      });

      setIsModalOpen(false);
      setName('');
      loadConfigs();
    } catch (err: any) {
      toast({
        title: 'Creation Failed',
        description: err.message || 'Unable to save RAG configuration.',
        variant: 'danger',
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="RAG Parameter Studio"
        subtitle="Configure knowledge base indices, chunking strategies, hybrid RRF algorithms, and reranker models"
        action={
          <Button
            variant="lab"
            size="md"
            icon={<PlusCircle size={15} />}
            onClick={() => setIsModalOpen(true)}
          >
            New RAG Configuration
          </Button>
        }
      />

      {/* ── Configs Grid ── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading RAG parameters...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {configs.map((rag) => (
            <div
              key={rag.id}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {rag.version}
                    </span>
                    <Badge variant={rag.retrieverType === 'hybrid_rrf' ? 'brand' : 'neutral'} size="sm">
                      {rag.retrieverType === 'hybrid_rrf'
                        ? 'Hybrid RRF'
                        : rag.retrieverType === 'bm25'
                        ? 'Keyword (BM25)'
                        : 'Vector (Dense)'}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{rag.id}</span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-100">{rag.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <BookOpen size={13} className="text-slate-500" />
                    {rag.knowledgeBaseName}
                  </p>
                </div>

                {/* Specs Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Chunk Size</span>
                    <span className="text-slate-200 font-semibold">{rag.chunkSize} tok</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Overlap</span>
                    <span className="text-slate-200 font-semibold">{rag.chunkOverlap} tok</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Top-K</span>
                    <span className="text-slate-200 font-semibold">{rag.topK} docs</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">RRF k-weight</span>
                    <span className="text-slate-200 font-semibold">{rag.rrfKWeight}</span>
                  </div>
                </div>

                {/* Reranker & Model */}
                <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                  <div className="flex items-center justify-between">
                    <span>Embedding Model:</span>
                    <span className="font-mono text-slate-300">{rag.embeddingModel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reranker:</span>
                    <span className="font-mono text-slate-300">
                      {rag.rerankerEnabled ? rag.rerankerModel || 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Updated: {new Date(rag.updatedAt).toLocaleDateString()}</span>
                <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Ready for Experiments
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Create RAG Config ── */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} size="lg">
        <ModalHeader
          title="Configure RAG Architecture"
          description="Define retrieval models, chunking boundaries, and rank-fusion parameters"
        />
        <form onSubmit={handleCreate}>
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Configuration Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinical Orthopedics Hybrid RRF v13"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Version Identifier</label>
                <input
                  type="text"
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Knowledge Base Source</label>
              <input
                type="text"
                required
                value={knowledgeBaseName}
                onChange={(e) => setKnowledgeBaseName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Retriever Strategy</label>
                <select
                  value={retrieverType}
                  onChange={(e) => setRetrieverType(e.target.value as RetrieverType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="hybrid_rrf">Hybrid RRF (Dense Vector + BM25)</option>
                  <option value="vector">Dense Vector Search Only</option>
                  <option value="bm25">Keyword BM25 Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Embedding Model</label>
                <select
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                >
                  <option value="text-embedding-3-large">text-embedding-3-large (3072-dim)</option>
                  <option value="text-embedding-3-small">text-embedding-3-small (1536-dim)</option>
                  <option value="bge-large-en-v1.5">bge-large-en-v1.5 (Local)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Chunk Size</label>
                <input
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Overlap</label>
                <input
                  type="number"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Top-K</label>
                <input
                  type="number"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">RRF k-weight</label>
                <input
                  type="number"
                  value={rrfKWeight}
                  onChange={(e) => setRrfKWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="rerankerEnabled"
                checked={rerankerEnabled}
                onChange={(e) => setRerankerEnabled(e.target.checked)}
                className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-400 bg-slate-950"
              />
              <label htmlFor="rerankerEnabled" className="text-xs text-slate-300 font-medium">
                Apply Cross-Encoder Reranker (Cohere rerank-v3)
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="lab" size="sm" type="submit">
              Save RAG Setup
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
