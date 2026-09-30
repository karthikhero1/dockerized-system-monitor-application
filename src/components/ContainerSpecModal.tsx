import React from 'react';
import { X, Box, Shield, CheckCircle, Network, Layers, Copy, Check } from 'lucide-react';
import { SystemTelemetry } from '../types.ts';

interface ContainerSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: SystemTelemetry | null;
}

export const ContainerSpecModal: React.FC<ContainerSpecModalProps> = ({
  isOpen,
  onClose,
  telemetry,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !telemetry) return null;

  const copyDockerRun = () => {
    const cmd = `docker run -d \\
  --name docker-sysmon \\
  --restart unless-stopped \\
  -p 5000:5000 \\
  -v /:/host:ro \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  --read-only \\
  --user 10001:10001 \\
  --security-opt=no-new-privileges:true \\
  sysmon/telemetry:latest`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <i className="fa-brands fa-docker text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Docker Container Specification</h2>
              <p className="text-[11px] text-slate-400 font-mono">sysmon/telemetry:latest</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs font-mono">
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-slate-500 text-[10px] block">RUNTIME</span>
              <span className="text-slate-200 font-medium">{telemetry.container.runtime}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">SECURITY CONTEXT</span>
              <span className="text-emerald-400 font-medium">Non-root (UID 10001)</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">INTERNAL PORT</span>
              <span className="text-slate-200 font-medium">{telemetry.container.port}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">EXPOSED PORT</span>
              <span className="text-blue-400 font-medium">{telemetry.container.exposed_port}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-800">
              <span className="text-slate-500 text-[10px] block">HOST FS MOUNT</span>
              <span className="text-amber-400 font-medium">/:ro (Read-Only Host Telemetry Pass)</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Production Run Command
              </span>
              <button
                onClick={copyDockerRun}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-[11px] overflow-x-auto leading-relaxed">
{`docker run -d \\
  --name docker-sysmon \\
  --restart unless-stopped \\
  -p 5000:5000 \\
  -v /:/host:ro \\
  --read-only \\
  --user 10001:10001 \\
  sysmon/telemetry:latest`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
