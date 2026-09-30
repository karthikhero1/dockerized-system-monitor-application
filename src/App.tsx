/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SystemTelemetry, TelemetryPoint } from './types.ts';
import { ApiInspectorModal } from './components/ApiInspectorModal.tsx';
import { TelemetryCharts } from './components/TelemetryCharts.tsx';
import { ContainerLogsModal } from './components/ContainerLogsModal.tsx';
import { ContainerSpecModal } from './components/ContainerSpecModal.tsx';
import {
  RotateCw,
  Activity,
  AlertTriangle,
  Flame,
  LineChart,
  FileText,
  Sliders,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function App() {
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Updating...');
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(3);
  const [isWideView, setIsWideView] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showCoreDetails, setShowCoreDetails] = useState(false);

  // Modals
  const [inspectEndpoint, setInspectEndpoint] = useState<{ path: string; method?: 'GET' | 'POST' } | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showContainerModal, setShowContainerModal] = useState(false);

  // Fetch telemetry
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [sysRes, histRes] = await Promise.all([
        fetch('/api/system'),
        fetch('/api/metrics/history'),
      ]);

      if (sysRes.ok) {
        const sysData: SystemTelemetry = await sysRes.json();
        setTelemetry(sysData);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        throw new Error('Telemetry API returned ' + sysRes.status);
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.history) {
          setHistory(histData.history);
        }
      }
    } catch (err) {
      console.error('Failed to fetch telemetry metrics:', err);
      // Fallback state indicating unhealthy
      setTelemetry((prev) =>
        prev
          ? {
              ...prev,
              health: {
                status: 'UNHEALTHY',
                code: 'CONNECTION_REFUSED',
                reason: 'Failed to communicate with host daemon',
              },
            }
          : null
      );
    } finally {
      setLoading(false);
    }
  };

  // Toggle stress simulation
  const toggleStressMode = async () => {
    try {
      await fetch('/api/stress', { method: 'POST' });
      await fetchMetrics();
    } catch (e) {
      console.error('Failed to toggle stress mode', e);
    }
  };

  // Toggle health status alert directly
  const toggleHealthAlert = async () => {
    try {
      await fetch('/api/health/toggle', { method: 'POST' });
      await fetchMetrics();
    } catch (e) {
      console.error('Failed to toggle health state', e);
    }
  };

  // Polling hook
  useEffect(() => {
    fetchMetrics();
    if (pollIntervalSec <= 0) return;
    const interval = setInterval(fetchMetrics, pollIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [pollIntervalSec]);

  // Derived state defaults
  const isHealthy = telemetry?.health.status === 'HEALTHY';
  const cpuPercent = telemetry ? telemetry.cpu.usage_percent : 14.2;
  const memPercent = telemetry ? telemetry.memory.usage_percent : 26.8;
  const diskPercent = telemetry ? telemetry.disk.usage_percent : 27.1;

  // Determine bar colors based on severity
  const getCpuBarColor = (pct: number) => {
    if (pct > 80) return 'bg-rose-500';
    if (pct > 60) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const getCpuTextColor = (pct: number) => {
    if (pct > 80) return 'text-rose-400';
    if (pct > 60) return 'text-amber-400';
    return 'text-blue-400';
  };

  const getMemBadge = (mem: SystemTelemetry['memory'] | undefined) => {
    if (!mem) return { text: 'NORMAL', class: 'bg-purple-500/10 text-purple-300' };
    if (mem.usage_percent > 85) return { text: 'CRITICAL', class: 'bg-rose-500/20 text-rose-300' };
    if (mem.usage_percent > 70) return { text: 'HIGH', class: 'bg-amber-500/20 text-amber-300' };
    return { text: 'NORMAL', class: 'bg-purple-500/10 text-purple-300' };
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased selection:bg-emerald-500 selection:text-white flex flex-col justify-between py-0 sm:py-6">
      
      {/* Outer Shell Wrapper */}
      <div
        className={`mx-auto w-full transition-all duration-300 ${
          isWideView ? 'max-w-4xl px-4' : 'max-w-md'
        } min-h-screen sm:min-h-0 flex flex-col bg-slate-900 border-x sm:border border-slate-800 shadow-2xl sm:rounded-2xl overflow-hidden`}
      >
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition"
            onClick={() => setShowContainerModal(true)}
            title="Inspect Docker Container Specs"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <i className="fa-brands fa-docker text-lg"></i>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                SysMon
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  L1 DevOps
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">Dockerized Host Telemetry</p>
            </div>
          </div>

          {/* Live Status Pill & Refresh */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleHealthAlert}
              title="Click to toggle health status simulation"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition ${
                isHealthy
                  ? 'bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isHealthy ? 'bg-emerald-500 status-pulse' : 'bg-rose-500 status-pulse'
                }`}
              ></span>
              <span
                className={`font-medium ${
                  isHealthy ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isHealthy ? 'HEALTHY' : 'UNHEALTHY'}
              </span>
            </button>

            <button
              onClick={fetchMetrics}
              title="Manual Refresh"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={() => setIsWideView(!isWideView)}
              title={isWideView ? 'Switch to Mobile Frame' : 'Switch to Wide Dashboard'}
              className="hidden sm:flex p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              {isWideView ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* Warning notification banner if unhealthy */}
        {!isHealthy && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between text-xs text-rose-300 font-mono animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">
                {telemetry?.health.reason || 'Alert: Service reported degraded telemetry state'}
              </span>
            </div>
            <button
              onClick={toggleHealthAlert}
              className="text-[10px] uppercase font-bold text-rose-400 hover:underline shrink-0 ml-2"
            >
              Resolve
            </button>
          </div>
        )}

        {/* Main Dashboard Body */}
        <main className="flex-1 p-4 space-y-4">
          {/* System Info Card */}
          <section className="bg-slate-850 rounded-xl p-4 border border-slate-800/80 shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 text-slate-800/20 text-7xl pointer-events-none select-none">
              <i className="fa-solid fa-server"></i>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-nodes text-emerald-400"></i> Host Environment
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {lastUpdated === 'Updating...' ? 'Updating...' : `Updated ${lastUpdated}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[11px]">Hostname</span>
                <p className="font-mono font-medium text-slate-200 truncate">
                  {telemetry ? telemetry.hostname : 'docker-sysmon'}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[11px]">System Uptime</span>
                <p className="font-mono font-medium text-emerald-400 truncate">
                  {telemetry ? telemetry.uptime : '2d 4h 18m 10s'}
                </p>
              </div>
              <div className="col-span-2 space-y-0.5 pt-1 border-t border-slate-800 flex items-center justify-between">
                <div className="truncate pr-2">
                  <span className="text-slate-400 text-[11px]">OS & Kernel</span>
                  <p className="font-mono text-[11px] text-slate-300 truncate">
                    {telemetry ? telemetry.os : 'Linux 6.6.137+ (x86_64)'}
                  </p>
                </div>
                <button
                  onClick={() => setShowLogsModal(true)}
                  className="shrink-0 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 transition flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>Logs</span>
                </button>
              </div>
            </div>
          </section>

          {/* Metric 1: CPU Usage */}
          <section className="bg-slate-850 rounded-xl p-4 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-microchip"></i>
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">CPU Utilization</h2>
                  <p className="text-[10px] text-slate-400 font-mono">
                    <span>{telemetry?.cpu.cores_logical || 4}</span> Logical Cores
                  </p>
                </div>
              </div>
              <span className={`text-base font-bold font-mono ${getCpuTextColor(cpuPercent)}`}>
                {cpuPercent.toFixed(1)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full ${getCpuBarColor(cpuPercent)} rounded-full metric-transition`}
                style={{ width: `${Math.min(100, Math.max(2, cpuPercent))}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1.5">
              <span>0%</span>
              <button
                onClick={() => setShowCoreDetails(!showCoreDetails)}
                className="hover:text-slate-300 transition flex items-center gap-1"
              >
                <span>
                  Load Avg (psutil){' '}
                  {telemetry
                    ? `[${telemetry.cpu.load_avg.join(', ')}]`
                    : '[0.42, 0.38, 0.35]'}
                </span>
                {showCoreDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <span>100%</span>
            </div>

            {/* Per-Core Details toggle */}
            {showCoreDetails && telemetry?.cpu.per_core && (
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs font-mono space-y-2 animate-fade-in">
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Processor Model:</span>
                  <span className="text-slate-300 truncate max-w-[200px]">{telemetry.cpu.model}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {telemetry.cpu.per_core.map((corePct, idx) => (
                    <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-500">Core #{idx}</span>
                        <span className="text-blue-400 font-bold">{corePct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${corePct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Metric 2: Memory Usage */}
          <section className="bg-slate-850 rounded-xl p-4 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-memory"></i>
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Virtual Memory (RAM)</h2>
                  <p className="text-[10px] text-slate-400 font-mono">
                    <span>{telemetry ? telemetry.memory.used_gb : '4.18'}</span> /{' '}
                    <span>{telemetry ? telemetry.memory.total_gb : '15.62'}</span> GB
                  </p>
                </div>
              </div>
              <span className="text-base font-bold font-mono text-purple-400">
                {memPercent.toFixed(1)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-purple-500 rounded-full metric-transition"
                style={{ width: `${Math.min(100, Math.max(2, memPercent))}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1.5">
              <span>
                Avail:{' '}
                <span className="text-slate-400">
                  {telemetry ? `${telemetry.memory.available_gb} GB` : '11.44 GB'}
                </span>
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getMemBadge(telemetry?.memory).class}`}>
                {getMemBadge(telemetry?.memory).text}
              </span>
            </div>
          </section>

          {/* Metric 3: Disk Usage */}
          <section className="bg-slate-850 rounded-xl p-4 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-hard-drive"></i>
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Disk Storage (/)</h2>
                  <p className="text-[10px] text-slate-400 font-mono">
                    <span>{telemetry ? telemetry.disk.used_gb : '32.1'}</span> /{' '}
                    <span>{telemetry ? telemetry.disk.total_gb : '118.4'}</span> GB
                  </p>
                </div>
              </div>
              <span className="text-base font-bold font-mono text-amber-400">
                {diskPercent.toFixed(1)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-amber-500 rounded-full metric-transition"
                style={{ width: `${Math.min(100, Math.max(2, diskPercent))}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1.5">
              <span>
                Free:{' '}
                <span className="text-slate-400">
                  {telemetry ? `${telemetry.disk.free_gb} GB` : '86.3 GB'}
                </span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold text-[10px]">
                MOUNTED
              </span>
            </div>
          </section>

          {/* Time Series Charts (Collapsible / Toggleable) */}
          {showCharts && (
            <section className="bg-slate-850 rounded-xl p-4 border border-slate-800/80 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <LineChart className="w-3.5 h-3.5 text-blue-400" /> Real-Time Telemetry Timeline
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Live 3s Window</span>
              </div>
              <TelemetryCharts history={history} />
            </section>
          )}

          {/* REST API Endpoints Card */}
          <section className="bg-slate-850 rounded-xl p-4 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-network-wired text-slate-400"></i> REST API Endpoints
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Click to test live</span>
            </div>
            
            <div className="space-y-2 text-xs">
              {/* GET /health */}
              <button
                onClick={() => setInspectEndpoint({ path: '/health', method: 'GET' })}
                className="w-full flex items-center justify-between p-2 rounded bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition group text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30">
                    GET
                  </span>
                  <code className="text-slate-300 font-mono text-[11px]">/health</code>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isHealthy ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isHealthy ? '200 OK' : '503 SERVICE UNAVAILABLE'}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition" />
                </div>
              </button>

              {/* GET /api/system */}
              <button
                onClick={() => setInspectEndpoint({ path: '/api/system', method: 'GET' })}
                className="w-full flex items-center justify-between p-2 rounded bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition group text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30">
                    GET
                  </span>
                  <code className="text-slate-300 font-mono text-[11px]">/api/system</code>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-blue-400">JSON Telemetry</span>
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition" />
                </div>
              </button>
            </div>
          </section>

          {/* Docker Container Spec Details */}
          <section
            onClick={() => setShowContainerModal(true)}
            className="bg-slate-900/60 hover:bg-slate-900/90 cursor-pointer rounded-xl p-3 border border-slate-800/60 hover:border-slate-700 text-[11px] font-mono text-slate-400 flex items-center justify-between transition group"
            title="View container security and runtime specification"
          >
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-emerald-400 group-hover:scale-110 transition"></i>
              <span>
                Container User:{' '}
                <strong className="text-slate-200">
                  {telemetry?.container.user || 'appuser (10001)'}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Port {telemetry?.container.port || 5000}</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700">
                INFO
              </span>
            </div>
          </section>

          {/* Interactive Simulation & Diagnostic Controls Panel */}
          <section className="bg-slate-900/40 rounded-xl p-3 border border-dashed border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" /> DevOps Simulator & Tools
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-mono">Poll:</span>
                {[1, 3, 5, 0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPollIntervalSec(s)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                      pollIntervalSec === s
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s === 0 ? 'Off' : `${s}s`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              {/* Toggle Stress */}
              <button
                onClick={toggleStressMode}
                className={`p-2 rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  telemetry?.simulations.is_stress_active
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${telemetry?.simulations.is_stress_active ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
                <span>
                  {telemetry?.simulations.is_stress_active ? 'Stop CPU Stress' : 'Simulate CPU Stress'}
                </span>
              </button>

              {/* Toggle Unhealthy */}
              <button
                onClick={toggleHealthAlert}
                className={`p-2 rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  !isHealthy
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${!isHealthy ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>{!isHealthy ? 'Reset Health OK' : 'Trigger Unhealthy'}</span>
              </button>

              {/* Toggle Charts */}
              <button
                onClick={() => setShowCharts(!showCharts)}
                className={`p-2 rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  showCharts
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <LineChart className="w-3.5 h-3.5 text-blue-400" />
                <span>{showCharts ? 'Hide Charts' : 'View Charts'}</span>
              </button>

              {/* View Logs */}
              <button
                onClick={() => setShowLogsModal(true)}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Container Logs</span>
              </button>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="p-3 border-t border-slate-800 bg-slate-900/90 text-center text-[10px] text-slate-500 font-mono">
          <span>
            Auto-polling every {pollIntervalSec > 0 ? `${pollIntervalSec}s` : 'manual'} • Express & Node.js & Docker Telemetry
          </span>
        </footer>
      </div>

      {/* REST API Inspector Modal */}
      {inspectEndpoint && (
        <ApiInspectorModal
          endpoint={inspectEndpoint.path}
          method={inspectEndpoint.method || 'GET'}
          isOpen={Boolean(inspectEndpoint)}
          onClose={() => setInspectEndpoint(null)}
          onRefreshParent={fetchMetrics}
        />
      )}

      {/* Container Logs Stream Modal */}
      <ContainerLogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
      />

      {/* Docker Spec Modal */}
      <ContainerSpecModal
        isOpen={showContainerModal}
        onClose={() => setShowContainerModal(false)}
        telemetry={telemetry}
      />
    </div>
  );
}
