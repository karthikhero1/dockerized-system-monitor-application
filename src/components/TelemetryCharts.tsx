import React from 'react';
import { TelemetryPoint } from '../types.ts';
import { Activity, Cpu, HardDrive } from 'lucide-react';

interface TelemetryChartsProps {
  history: TelemetryPoint[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-500 font-mono">
        Collecting time-series data points...
      </div>
    );
  }

  const width = 360;
  const height = 90;
  const padding = 15;

  const getPoints = (key: 'cpu' | 'memory' | 'disk') => {
    return history.map((pt, i) => {
      const x = padding + (i / Math.max(1, history.length - 1)) * (width - 2 * padding);
      const val = Math.min(100, Math.max(0, pt[key]));
      const y = height - padding - (val / 100) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');
  };

  const getArea = (key: 'cpu' | 'memory' | 'disk') => {
    const points = history.map((pt, i) => {
      const x = padding + (i / Math.max(1, history.length - 1)) * (width - 2 * padding);
      const val = Math.min(100, Math.max(0, pt[key]));
      const y = height - padding - (val / 100) * (height - 2 * padding);
      return `${x},${y}`;
    });
    const firstX = padding;
    const lastX = padding + ((history.length - 1) / Math.max(1, history.length - 1)) * (width - 2 * padding);
    const bottomY = height - padding;
    return `${firstX},${bottomY} ${points.join(' ')} ${lastX},${bottomY}`;
  };

  const latest = history[history.length - 1];

  return (
    <div className="space-y-3">
      {/* CPU Rolling Chart */}
      <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>CPU History (3s intervals)</span>
          </span>
          <span className="font-mono text-blue-400 font-bold">{latest?.cpu.toFixed(1)}%</span>
        </div>
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1e293b" />
            {/* Area */}
            <polygon points={getArea('cpu')} fill="url(#cpuGradient)" />
            {/* Line */}
            <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={getPoints('cpu')} />
          </svg>
        </div>
      </div>

      {/* Memory Rolling Chart */}
      <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>RAM History (Virtual Memory)</span>
          </span>
          <span className="font-mono text-purple-400 font-bold">{latest?.memory.toFixed(1)}%</span>
        </div>
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
            <defs>
              <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1e293b" />
            <polygon points={getArea('memory')} fill="url(#memGradient)" />
            <polyline fill="none" stroke="#a855f7" strokeWidth="2" points={getPoints('memory')} />
          </svg>
        </div>
      </div>
    </div>
  );
};
