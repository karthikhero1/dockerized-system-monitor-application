export interface SystemTelemetry {
  hostname: string;
  uptime: string;
  uptime_seconds: number;
  os: string;
  platform: string;
  arch: string;
  health: {
    status: 'HEALTHY' | 'UNHEALTHY';
    code: string;
    reason: string;
  };
  cpu: {
    usage_percent: number;
    cores_logical: number;
    model: string;
    speed_mhz: number;
    load_avg: [number, number, number];
    per_core: number[];
  };
  memory: {
    usage_percent: number;
    total_gb: number;
    used_gb: number;
    available_gb: number;
    free_gb: number;
    status: 'NORMAL' | 'HIGH' | 'CRITICAL';
  };
  disk: {
    usage_percent: number;
    total_gb: number;
    used_gb: number;
    free_gb: number;
    mount: string;
    status: string;
  };
  container: {
    user: string;
    port: number;
    exposed_port: number;
    image: string;
    runtime: string;
    network: string;
  };
  node_process: {
    pid: number;
    node_version: string;
    rss_mb: number;
    heap_used_mb: number;
  };
  simulations: {
    is_stress_active: boolean;
    is_force_unhealthy: boolean;
  };
  timestamp: string;
}

export interface TelemetryPoint {
  timestamp: string;
  timeLabel: string;
  cpu: number;
  memory: number;
  disk: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'METRIC';
  source: string;
  message: string;
}
