export type BenchmarkId = 1 | 2 | 3;

export interface BenchmarkMetrics {
  reqSec: number;
  latency: number;
}

export interface BenchmarkFileMeta {
  bench: BenchmarkId;
  run: number;
  server: string;
}

export interface BenchmarkRun extends BenchmarkFileMeta {
  metrics: BenchmarkMetrics;
}

export interface ServerMetrics {
  server: string;
  reqSec: number;
  latency: number;
}
