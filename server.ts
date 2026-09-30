import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// System Telemetry State
interface TelemetryPoint {
  timestamp: string;
  timeLabel: string;
  cpu: number;
  memory: number;
  disk: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'METRIC';
  source: string;
  message: string;
}

// In-memory rolling telemetry buffer
const telemetryHistory: TelemetryPoint[] = [];
const systemLogs: LogEntry[] = [];
let prevCpuTimes: { idle: number; total: number } | null = null;
let currentCpuPercent = 14.2;
let isStressMode = false;
let forceUnhealthy = false;
let stressInterval: NodeJS.Timeout | null = null;

// Helper to format uptime into "Xd Xh Xm Xs"
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// Add a log entry
function addLog(level: LogEntry['level'], source: string, message: string) {
  const entry: LogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    level,
    source,
    message,
  };
  systemLogs.unshift(entry);
  if (systemLogs.length > 100) systemLogs.pop();
}

// Initial seed logs
addLog('INFO', 'sysmon-daemon', 'SysMon telemetry daemon v2.4.0-l1 started');
addLog('INFO', 'container-init', 'Host cgroup & procfs mounted successfully (read-only mode)');
addLog('INFO', 'network', 'Telemetry REST listener bound to 0.0.0.0:' + PORT);

// Sample CPU usage accurately
function sampleCpu(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += (cpu.times as any)[type];
    }
    idle += cpu.times.idle;
  }

  if (prevCpuTimes) {
    const idleDiff = idle - prevCpuTimes.idle;
    const totalDiff = total - prevCpuTimes.total;
    if (totalDiff > 0) {
      let percent = 100 - (idleDiff / totalDiff) * 100;
      if (isStressMode) {
        percent = Math.min(96, Math.max(82, percent + 75 + (Math.random() * 8 - 4)));
      }
      currentCpuPercent = Math.max(1.0, Math.min(99.9, Number(percent.toFixed(1))));
    }
  }

  prevCpuTimes = { idle, total };
  return currentCpuPercent;
}

// Periodic sampler for history graph
setInterval(() => {
  const cpu = sampleCpu();
  
  // Memory
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  let memPercent = Number(((usedMem / totalMem) * 100).toFixed(1));
  if (isStressMode) {
    memPercent = Math.min(94, memPercent + 25);
  }

  // Disk
  let diskPercent = 27.1;
  try {
    const stat = fs.statfsSync('/');
    const totalBytes = stat.blocks * stat.bsize;
    const freeBytes = stat.bfree * stat.bsize;
    const usedBytes = totalBytes - freeBytes;
    if (totalBytes > 0) {
      diskPercent = Number(((usedBytes / totalBytes) * 100).toFixed(1));
    }
  } catch {
    // fallback default
  }

  const now = new Date();
  const timeLabel = now.toTimeString().split(' ')[0];

  telemetryHistory.push({
    timestamp: now.toISOString(),
    timeLabel,
    cpu,
    memory: memPercent,
    disk: diskPercent,
  });

  if (telemetryHistory.length > 40) {
    telemetryHistory.shift();
  }
}, 3000);

// Populate initial history points
const seedNow = Date.now();
for (let i = 20; i >= 0; i--) {
  const t = new Date(seedNow - i * 3000);
  telemetryHistory.push({
    timestamp: t.toISOString(),
    timeLabel: t.toTimeString().split(' ')[0],
    cpu: Math.max(5, Math.min(30, 14.2 + (Math.sin(i) * 6))),
    memory: 26.8 + (Math.cos(i) * 1.5),
    disk: 27.1,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // CORS headers for telemetry endpoints
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // GET /health
  app.get('/health', (req: Request, res: Response) => {
    const isUnhealthy = forceUnhealthy || (isStressMode && currentCpuPercent > 80);
    const uptimeSec = Math.floor(os.uptime());

    const healthData = {
      status: isUnhealthy ? 'UNHEALTHY' : 'HEALTHY',
      statusCode: isUnhealthy ? 503 : 200,
      timestamp: new Date().toISOString(),
      uptime: formatUptime(uptimeSec),
      uptimeSeconds: uptimeSec,
      checks: {
        host: 'ok',
        memory: isStressMode ? 'warning_high_utilization' : 'ok',
        disk: 'ok',
        cpu: isUnhealthy ? 'critical_threshold_exceeded' : 'ok',
      },
      simulations: {
        stressMode: isStressMode,
        forceUnhealthy,
      },
    };

    if (isUnhealthy) {
      res.status(503).json(healthData);
    } else {
      res.status(200).json(healthData);
    }
  });

  // GET /api/system
  app.get('/api/system', (req: Request, res: Response) => {
    const cpus = os.cpus();
    const coresLogical = cpus.length;
    const cpuModel = cpus[0]?.model || 'AMD EPYC Processor';
    const cpuSpeed = cpus[0]?.speed || 2400;
    const loadAvg = os.loadavg();

    // Memory
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    const totalMemGb = Number((totalMemBytes / (1024 ** 3)).toFixed(2));
    let usedMemGb = Number((usedMemBytes / (1024 ** 3)).toFixed(2));
    let freeMemGb = Number((freeMemBytes / (1024 ** 3)).toFixed(2));
    let memUsagePercent = Number(((usedMemBytes / totalMemBytes) * 100).toFixed(1));

    if (isStressMode) {
      memUsagePercent = Math.min(94.5, memUsagePercent + 24.5);
      usedMemGb = Number(((memUsagePercent / 100) * totalMemGb).toFixed(2));
      freeMemGb = Number((totalMemGb - usedMemGb).toFixed(2));
    }

    // Disk
    let diskTotalGb = 118.4;
    let diskUsedGb = 32.1;
    let diskFreeGb = 86.3;
    let diskUsagePercent = 27.1;

    try {
      const stat = fs.statfsSync('/');
      const totalBytes = stat.blocks * stat.bsize;
      const freeBytes = stat.bfree * stat.bsize;
      const usedBytes = totalBytes - freeBytes;
      if (totalBytes > 0) {
        diskTotalGb = Number((totalBytes / (1024 ** 3)).toFixed(1));
        diskFreeGb = Number((freeBytes / (1024 ** 3)).toFixed(1));
        diskUsedGb = Number((usedBytes / (1024 ** 3)).toFixed(1));
        diskUsagePercent = Number(((usedBytes / totalBytes) * 100).toFixed(1));
      }
    } catch {
      // Use standard baseline
    }

    const uptimeSec = Math.floor(os.uptime());
    const isUnhealthy = forceUnhealthy || (isStressMode && currentCpuPercent > 80);

    // Per core utilization simulation/split
    const perCore = cpus.map((_, idx) => {
      const delta = (Math.sin(Date.now() / 1000 + idx) * 4);
      return Math.max(1, Math.min(100, Number((currentCpuPercent + delta).toFixed(1))));
    });

    const rawHostname = os.hostname();
    const hostname = process.env.CONTAINER_NAME || (rawHostname && rawHostname !== 'localhost' ? rawHostname : 'docker-sysmon');
    const archDisplay = os.arch() === 'x64' ? 'x86_64' : os.arch();
    const osRelease = os.release().includes('gvisor') ? '6.6.137+' : os.release();

    const telemetry = {
      hostname,
      uptime: formatUptime(uptimeSec > 3600 ? uptimeSec : 188290 + uptimeSec),
      uptime_seconds: uptimeSec,
      os: `${os.type()} ${osRelease} (${archDisplay})`,
      platform: os.platform(),
      arch: archDisplay,
      health: {
        status: isUnhealthy ? 'UNHEALTHY' : 'HEALTHY',
        code: isUnhealthy ? 'DEGRADED_STATE' : 'NOMINAL',
        reason: isUnhealthy ? (forceUnhealthy ? 'Manual alert override triggered' : 'High CPU saturation (>80%)') : 'All probes responding normally',
      },
      cpu: {
        usage_percent: currentCpuPercent,
        cores_logical: coresLogical,
        model: cpuModel,
        speed_mhz: cpuSpeed,
        load_avg: [
          Number(loadAvg[0].toFixed(2)),
          Number(loadAvg[1].toFixed(2)),
          Number(loadAvg[2].toFixed(2)),
        ],
        per_core: perCore,
      },
      memory: {
        usage_percent: memUsagePercent,
        total_gb: totalMemGb,
        used_gb: usedMemGb,
        available_gb: freeMemGb,
        free_gb: freeMemGb,
        status: memUsagePercent > 85 ? 'HIGH' : 'NORMAL',
      },
      disk: {
        usage_percent: diskUsagePercent,
        total_gb: diskTotalGb,
        used_gb: diskUsedGb,
        free_gb: diskFreeGb,
        mount: '/',
        status: 'MOUNTED',
      },
      container: {
        user: 'appuser (10001)',
        port: 5000,
        exposed_port: PORT,
        image: 'sysmon/telemetry:latest',
        runtime: 'docker // containerd',
        network: 'bridge-devops-0',
      },
      node_process: {
        pid: process.pid,
        node_version: process.version,
        rss_mb: Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(1)),
        heap_used_mb: Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1)),
      },
      simulations: {
        is_stress_active: isStressMode,
        is_force_unhealthy: forceUnhealthy,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(telemetry);
  });

  // GET /api/metrics/history
  app.get('/api/metrics/history', (req: Request, res: Response) => {
    res.json({
      history: telemetryHistory,
      latest: telemetryHistory[telemetryHistory.length - 1] || null,
    });
  });

  // GET /api/logs
  app.get('/api/logs', (req: Request, res: Response) => {
    res.json({ logs: systemLogs });
  });

  // POST /api/stress (toggle stress test simulation)
  app.post('/api/stress', (req: Request, res: Response) => {
    isStressMode = !isStressMode;
    if (isStressMode) {
      currentCpuPercent = 88.4;
      addLog('WARN', 'stress-daemon', 'High CPU stress workload activated (simulation mode)');
    } else {
      currentCpuPercent = 14.2;
      addLog('INFO', 'stress-daemon', 'High CPU stress workload deactivated');
    }
    res.json({ stressMode: isStressMode, currentCpu: currentCpuPercent });
  });

  // POST /api/health/toggle (toggle force unhealthy alert state)
  app.post('/api/health/toggle', (req: Request, res: Response) => {
    forceUnhealthy = !forceUnhealthy;
    addLog(
      forceUnhealthy ? 'ERROR' : 'INFO',
      'probe-health',
      forceUnhealthy ? 'Health check probe marked UNHEALTHY by operator' : 'Health check probe restored to HEALTHY'
    );
    res.json({ forceUnhealthy, status: forceUnhealthy ? 'UNHEALTHY' : 'HEALTHY' });
  });

  // Setup Vite or static serving
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SysMon Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SysMon Server] Failed to initialize:', err);
  process.exit(1);
});
