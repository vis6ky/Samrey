import React, { useState } from 'react';
import { DOCS_REGISTRY, DocEntry } from '../data/docContents';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Copy, Check, FileText, Download } from 'lucide-react';

export const DocReader: React.FC = () => {
  const [selectedDoc, setSelectedDoc] = useState<DocEntry>(DOCS_REGISTRY[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedDoc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedDoc.filename.split('/').pop() || 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-cyan-300 text-xs font-mono mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full Specification Documents</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Aether Architectural Documentation Suite
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Inspect and export the complete markdown technical specifications generated in the <code className="text-cyan-300 font-mono">docs/</code> directory.
            </p>
          </div>
        </div>
      </div>

      {/* Doc Tabs & Split Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document Selector */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Generated Documents ({DOCS_REGISTRY.length})
          </span>

          <div className="space-y-2">
            {DOCS_REGISTRY.map((doc) => {
              const isSelected = selectedDoc.id === doc.id;
              return (
                <div
                  key={doc.id}
                  id={`doc-tab-${doc.id}`}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{doc.title}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      isSelected ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      .md
                    </span>
                  </div>
                  <p className={`text-[11px] font-mono mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {doc.filename}
                  </p>
                  <p className={`text-xs mt-1.5 line-clamp-2 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                    {doc.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Markdown Renderer */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono text-slate-500">{selectedDoc.filename}</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedDoc.title}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied' : 'Copy MD'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-code:font-mono prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-950 prose-pre:text-slate-200 text-sm leading-relaxed overflow-y-auto max-h-[750px] pr-2">
            <Markdown remarkPlugins={[remarkGfm]}>{selectedDoc.content}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
};
