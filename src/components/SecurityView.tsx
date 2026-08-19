import React, { useState } from 'react';
import { SECURITY_THREATS } from '../data/securityData';
import { SecurityThreat } from '../types';
import { ShieldCheck, ShieldAlert, Lock, CheckCircle2, AlertOctagon, Terminal, Copy, Check } from 'lucide-react';

export const SecurityView: React.FC = () => {
  const [activeThreat, setActiveThreat] = useState<SecurityThreat>(SECURITY_THREATS[0]);
  const [customPayload, setCustomPayload] = useState<string>(SECURITY_THREATS[0].samplePayload);
  const [simulatedDefenseResult, setSimulatedDefenseResult] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectThreat = (threat: SecurityThreat) => {
    setActiveThreat(threat);
    setCustomPayload(threat.samplePayload);
    runSimulation(threat.samplePayload, threat.id);
  };

  const runSimulation = (payload: string, threatId: string) => {
    if (threatId === 'THREAT-01' || payload.includes('</script>')) {
      const escaped = payload
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
      setSimulatedDefenseResult(`[SAFE SERIALIZED SSR OUTPUT]:\nwindow.__AETHER_STATE__ = "${escaped}";\n\nResult: Safe! Browser HTML parser ignores Unicode escapes; Script tag remains open and intact.`);
    } else if (threatId === 'THREAT-02' || payload.startsWith('javascript:')) {
      setSimulatedDefenseResult(`[AETHER URI SANITIZER INTERCEPTED]:\nTarget: "${payload}"\nBlocked Scheme: "javascript:"\nResolved Output: "about:blank"\n\nResult: Blocked! Zero script execution on click/navigation.`);
    } else if (threatId === 'THREAT-03' || payload.includes('<img') || payload.includes('onerror')) {
      setSimulatedDefenseResult(`[W3C TRUSTED TYPES ENFORCEMENT]:\nPolicy: aether#html.createHTML()\nAction: Stripped inline event handler "onerror"\nResult: Safe HTML token created under Cryptographically Sealed Policy.`);
    } else if (threatId === 'THREAT-04' || payload.includes('__proto__')) {
      setSimulatedDefenseResult(`[PROTOTYPE POLLUTION DEFENSE]:\nObject.create(null) store initialized.\nRejected keys: ["__proto__", "constructor", "prototype"]\nObject.prototype polluted? FALSE. Application memory is hermetically sealed.`);
    } else {
      setSimulatedDefenseResult(`[AETHER ACTION CSRF VALIDATOR]:\nSec-Fetch-Site: cross-site -> REJECTED (HTTP 403 Forbidden).\nAction signature verification failed. State unmodified.`);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Security Architecture Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-cyan-300 text-xs font-mono mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Level 1 Defense-in-Depth Specification</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Aether Security Model & Threat Neutralization
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Zero-Trust Input architecture. The compiler statically enforces contextual encoding, W3C Trusted Types, zero-eval execution, and script-tag breakout immunity during SSR serialization.
            </p>
          </div>
        </div>

        {/* 5 Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-emerald-400 font-bold">1. Zero-eval Guarantee</span>
            <p className="text-slate-400 text-[11px] mt-1">Strict CSP (script-src &apos;self&apos;)</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-cyan-400 font-bold">2. Contextual Sanitizer</span>
            <p className="text-slate-400 text-[11px] mt-1">URI, HTML, Attr, CSS contexts</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-purple-400 font-bold">3. W3C Trusted Types</span>
            <p className="text-slate-400 text-[11px] mt-1">window.trustedTypes sealed policy</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-amber-400 font-bold">4. Unicode SSR Escaping</span>
            <p className="text-slate-400 text-[11px] mt-1">Zero &lt;/script&gt; tag breakout</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-sky-400 font-bold">5. Prototype Shielding</span>
            <p className="text-slate-400 text-[11px] mt-1">Object.create(null) stores</p>
          </div>
        </div>
      </div>

      {/* Interactive Threat Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Attack Vectors List */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Common Threat Vectors ({SECURITY_THREATS.length})
          </span>

          <div className="space-y-2">
            {SECURITY_THREATS.map((threat) => {
              const isSelected = activeThreat.id === threat.id;
              return (
                <div
                  key={threat.id}
                  id={`threat-item-${threat.id}`}
                  onClick={() => handleSelectThreat(threat)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{threat.title}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      isSelected ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {threat.id}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1 line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {threat.category}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Threat Analysis & Code Defense */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {activeThreat.id} · {activeThreat.category}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">
                {activeThreat.title}
              </h3>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Aether Immune</span>
            </div>
          </div>

          {/* Vulnerability Description & Ecosystem Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200/80 space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-red-800">
                <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                <span>Exploit Vector / Root Cause</span>
              </div>
              <p className="text-xs text-red-950 leading-relaxed">
                {activeThreat.vulnDescription}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Ecosystem Impact</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed">
                {activeThreat.frameworkImpact}
              </p>
            </div>
          </div>

          {/* Interactive Payload Tester */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Interactive Exploit Payload
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customPayload}
                onChange={(e) => {
                  setCustomPayload(e.target.value);
                  runSimulation(e.target.value, activeThreat.id);
                }}
                className="flex-1 px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                onClick={() => runSimulation(customPayload, activeThreat.id)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium"
              >
                Test Neutralizer
              </button>
            </div>
          </div>

          {/* Neutralizer Output Simulation */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Aether Runtime & Compiler Response
            </span>
            <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {simulatedDefenseResult || activeThreat.aetherDefense}
            </div>
          </div>

          {/* Architectural Code Countermeasure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Architectural Implementation
              </span>
              <button
                onClick={() => handleCopy(activeThreat.aetherCodeSnippet)}
                className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
            <div className="bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
              <pre>{activeThreat.aetherCodeSnippet}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
