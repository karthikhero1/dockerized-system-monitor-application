import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types.ts';
import { X, RefreshCw, Terminal, Search, Filter, Shield } from 'lucide-react';

interface ContainerLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContainerLogsModal: React.FC<ContainerLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load container logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Docker Container Telemetry Stream
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  stdout/stderr
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">sysmon/telemetry:latest • PID 1</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs or sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  filterLevel === lvl
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Log Viewer */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-12">No matching container logs found</div>
          ) : (
            filteredLogs.map((log) => {
              const badgeColor =
                log.level === 'ERROR'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : log.level === 'WARN'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

              return (
                <div key={log.id} className="flex items-start gap-2.5 hover:bg-slate-900/60 p-1.5 rounded transition">
                  <span className="text-[10px] text-slate-500 select-none whitespace-nowrap">
                    {log.timestamp}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase ${badgeColor}`}>
                    {log.level}
                  </span>
                  <span className="text-slate-400 text-[11px] whitespace-nowrap">
                    [{log.source}]
                  </span>
                  <span className="text-slate-200 text-xs select-text flex-1">
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>{filteredLogs.length} events logged</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
