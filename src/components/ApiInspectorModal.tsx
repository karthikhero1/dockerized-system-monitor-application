import React, { useState, useEffect } from 'react';
import { Check, Copy, RefreshCw, X, Terminal, Clock, Send } from 'lucide-react';

interface ApiInspectorModalProps {
  endpoint: string;
  method?: 'GET' | 'POST';
  isOpen: boolean;
  onClose: () => void;
  onRefreshParent?: () => void;
}

export const ApiInspectorModal: React.FC<ApiInspectorModalProps> = ({
  endpoint,
  method = 'GET',
  isOpen,
  onClose,
  onRefreshParent,
}) => {
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);

  const executeRequest = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
      });
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setResponseStatus(res.status);
      const data = await res.json();
      setResponseBody(data);
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      setResponseStatus(500);
      setResponseBody({ error: err.message || 'Network request failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      executeRequest();
    }
  }, [isOpen, endpoint, method]);

  if (!isOpen) return null;

  const curlCommand = `curl -i -X ${method} ${window.location.origin}${endpoint}`;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(responseBody, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  method === 'POST' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {method}
                </span>
                <span className="font-mono text-sm font-semibold text-white">{endpoint}</span>
              </div>
              <p className="text-[11px] text-slate-400">Live REST Telemetry Inspector</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={executeRequest}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition flex items-center gap-1.5 text-xs px-2.5"
              title="Resend Request"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Send</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">HTTP Status:</span>
              {responseStatus !== null ? (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  responseStatus >= 200 && responseStatus < 300
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {responseStatus} {responseStatus === 200 ? 'OK' : responseStatus === 503 ? 'SERVICE UNAVAILABLE' : ''}
                </span>
              ) : (
                <span className="text-slate-500">Waiting...</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Latency: <strong className="text-slate-200">{latencyMs !== null ? `${latencyMs}ms` : '--'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCurl}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50"
            >
              {curlCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{curlCopied ? 'cURL Copied' : 'Copy cURL'}</span>
            </button>
            <button
              onClick={copyJson}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'JSON Copied' : 'Copy JSON'}</span>
            </button>
          </div>
        </div>

        {/* cURL bar preview */}
        <div className="px-5 py-2 bg-slate-900/60 border-b border-slate-800/50 text-[11px] font-mono text-slate-400 truncate flex items-center gap-2">
          <span className="text-slate-500 select-none">$</span>
          <span className="text-slate-300 truncate">{curlCommand}</span>
        </div>

        {/* JSON Response Body */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Querying host telemetry socket...</span>
            </div>
          ) : responseBody ? (
            <pre className="text-emerald-300/90 whitespace-pre-wrap leading-relaxed select-text font-mono">
              {JSON.stringify(responseBody, null, 2)}
            </pre>
          ) : (
            <div className="text-slate-500 text-center py-8">No response data</div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            Content-Type: application/json • Charset: UTF-8
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium text-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
