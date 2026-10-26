import path from "path";
import {
  BenchmarkFileMeta,
  BenchmarkId,
  BenchmarkMetrics,
  BenchmarkRun,
  ServerMetrics,
} from "./types";

const FILE_NAME_PATTERN =
  /^bench([123])_result(\d+)_(?:graphql_)?(.+?)(?:_run\.sh)?\.txt$/;

function parseLatencyMs(raw: string): number {
  if (raw.endsWith("ms")) {
    return parseFloat(raw.slice(0, -2));
  }
  if (raw.endsWith("us")) {
    return parseFloat(raw.slice(0, -2)) / 1000;
  }
  if (raw.endsWith("s")) {
    return parseFloat(raw.slice(0, -1)) * 1000;
  }
  return parseFloat(raw);
}

export function parse(input: string): BenchmarkMetrics {
  let reqSec: number | undefined;
  let latency: number | undefined;

  for (const rawLine of input.split(/\r?\n/)) {
    const parts = rawLine.trim().split(/\s+/);
    const label = parts[0];
    const value = parts[1];
    if (!label || !value) {
      continue;
    }

    if (label === "Latency" && latency === undefined) {
      latency = parseLatencyMs(value);
    } else if (label.startsWith("Requests/sec") && reqSec === undefined) {
      reqSec = parseFloat(value);
    }
  }

  if (
    reqSec === undefined ||
    latency === undefined ||
    Number.isNaN(reqSec) ||
    Number.isNaN(latency)
  ) {
    throw new Error("Failed to parse benchmark metrics from wrk output");
  }

  return { reqSec, latency };
}

export function parseFileName(filePath: string): BenchmarkFileMeta {
  const baseName = path.basename(filePath);
  const match = FILE_NAME_PATTERN.exec(baseName);
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Invalid benchmark result file name: ${baseName}`);
  }

  const bench = Number(match[1]) as BenchmarkId;
  const run = Number(match[2]);
  const server = match[3];

  return { bench, run, server };
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

export function aggregateMetrics(
  runs: readonly BenchmarkRun[],
): ServerMetrics[] {
  const grouped = new Map<string, { reqSecs: number[]; latencies: number[] }>();

  for (const run of runs) {
    let entry = grouped.get(run.server);
    if (!entry) {
      entry = { reqSecs: [], latencies: [] };
      grouped.set(run.server, entry);
    }
    entry.reqSecs.push(run.metrics.reqSec);
    entry.latencies.push(run.metrics.latency);
  }

  const results: ServerMetrics[] = [];
  for (const [server, values] of grouped.entries()) {
    results.push({
      server,
      reqSec: average(values.reqSecs),
      latency: average(values.latencies),
    });
  }

  return results;
}
