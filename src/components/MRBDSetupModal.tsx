import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, ExternalLink, Glasses, ShieldCheck, Server, Smartphone, Laptop } from 'lucide-react';

interface MRBDSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MRBDSetupModal: React.FC<MRBDSetupModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'controls'>('checklist');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-text">
      <div className="relative w-full max-w-2xl bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Glasses className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-black uppercase tracking-tight">
                Meta Ray-Ban Display Setup Guide
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Official Web Apps verification checklist &amp; gesture reference
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-700 hover:text-black hover:bg-slate-200 border border-black rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b-2 border-black bg-slate-100 px-6 pt-3 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-black text-black'
                : 'border-transparent text-slate-500 hover:text-black'
            }`}
          >
            Setup Checklist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'controls'
                ? 'border-black text-black'
                : 'border-transparent text-slate-500 hover:text-black'
            }`}
          >
            Controls &amp; Troubleshooting (mrbd.dev)
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-4 text-sm text-slate-800">
          {activeTab === 'checklist' ? (
            <div className="space-y-4">
              {/* Tooling & MCP */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-black font-black uppercase tracking-wider text-xs mb-1.5">
                  <Laptop className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  <span>1. Tooling &amp; Wearables MCP Configuration</span>
                </div>
                <p className="text-xs text-slate-700 mb-2 leading-relaxed">
                  The official Wearables MCP server provides the <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-black font-bold">search_webapps_docs</code> tool. In Cursor or Claude Code, add the endpoint:
                </p>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-black font-mono text-xs text-amber-300 break-all select-all shadow-inner">
                  Endpoint: https://mcp.developer.meta.com/wearables
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-900">Claude Desktop config snippet:</span>
                  <pre className="mt-1 p-2.5 bg-slate-900 rounded-xl text-[11px] font-mono text-slate-200 overflow-x-auto shadow-inner">
{`"mcpServers": {
  "meta-wearables": {
    "url": "https://mcp.developer.meta.com/wearables"
  }
}`}
                  </pre>
                </div>
              </div>

              {/* Hardware */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-black font-black uppercase tracking-wider text-xs mb-1.5">
                  <Glasses className="w-4 h-4 text-amber-500 stroke-[2.5]" />
                  <span>2. Hardware Requirements</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                  <li><strong>Glasses:</strong> Meta Ray-Ban Display glasses running software <strong>v125+</strong></li>
                  <li><strong>Mobile Device:</strong> Paired iPhone or Android phone (connected via BLE/Wi-Fi)</li>
                  <li><strong>Neural Band (Optional):</strong> Meta Neural Band for EMG-based pinch/tap gestures</li>
                </ul>
              </div>

              {/* Meta AI App & Developer Mode */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-black font-black uppercase tracking-wider text-xs mb-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>3. Meta AI App &amp; Developer Mode</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                  <li><strong>App Version:</strong> Meta AI app <strong>v272 or higher</strong></li>
                  <li>
                    <strong>Unlock Developer Mode:</strong> Open Meta AI app &gt; <em>Settings</em> &gt; <em>App Info</em> &gt; tap the <em>App version number 5 times</em>.
                  </li>
                  <li>This unlocks Web App loading and debugging capabilities.</li>
                </ul>
              </div>

              {/* HTTPS Hosting */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-black font-black uppercase tracking-wider text-xs mb-1.5">
                  <Server className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                  <span>4. HTTPS Hosting</span>
                </div>
                <p className="text-xs text-slate-700 mb-2">
                  Meta Ray-Ban Display requires strict public <strong>HTTPS</strong> hosting.
                </p>
                <div className="text-xs text-emerald-900 bg-emerald-100 p-2.5 rounded-xl border border-emerald-400 font-medium">
                  ✔ Your Google AI Studio app is automatically hosted and secured with HTTPS! You can copy the browser URL directly into your Meta AI app developer menu.
                </div>
              </div>

              {/* Local Browser Verification */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-black font-black uppercase tracking-wider text-xs mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                  <span>5. Local Browser Verification &amp; Simulator</span>
                </div>
                <p className="text-xs text-slate-700 mb-2.5">
                  Test your layout in a <strong>600x600 px viewport</strong>. Use the <em>Meta Ray-Ban Display Simulator</em> Chrome extension to preview additive waveguide optical transparency (where black pixels appear transparent in real life).
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://mrbd.dev/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-white border border-black px-3 py-1.5 rounded-xl font-bold text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all"
                  >
                    <span>Visit mrbd.dev</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://wearables.developer.meta.com/docs/develop/webapps/setup/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-white border border-black px-3 py-1.5 rounded-xl font-bold text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all"
                  >
                    <span>Meta Wearables Docs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black uppercase tracking-wider text-black text-xs mb-3">
                  Gesture Mappings on Glasses:
                </h3>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-amber-600 block mb-1">Pinch + Index Finger Tap:</span>
                    <span className="text-slate-700">Sends <code className="bg-slate-200 px-1 rounded font-mono font-bold text-black">Enter</code> event. Stops blue dot and anchors candidate territory. Tap again to close and score!</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-blue-600 block mb-1">Swipe Up:</span>
                    <span className="text-slate-700">Sends <code className="bg-slate-200 px-1 rounded font-mono font-bold text-black">ArrowUp</code>. Zooms map in.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-blue-600 block mb-1">Swipe Down:</span>
                    <span className="text-slate-700">Sends <code className="bg-slate-200 px-1 rounded font-mono font-bold text-black">ArrowDown</code>. Zooms map out (max 100 miles span).</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-rose-600 block mb-1">Undo Button:</span>
                    <span className="text-slate-700">Press <code className="bg-slate-200 px-1 rounded font-mono font-bold text-black">Backspace</code> or tap Undo button to remove the last point.</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-black text-xs text-amber-950 leading-relaxed font-medium">
                <strong>Display Specifics:</strong> The MRBD screen has a 600x600 resolution. Pure black (<code className="font-mono font-bold">#000000</code>) is rendered as optical pass-through (transparent waveguide), allowing the user to see the real world with high-contrast bright yellow paths and bold black labels outlined in white.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t-2 border-black bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            Got It, Back to Game
          </button>
        </div>
      </div>
    </div>
  );
};
