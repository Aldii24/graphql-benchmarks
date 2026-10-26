import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { BenchmarkId, ServerMetrics } from "./types";

function writeDataFile(
  filePath: string,
  metrics: readonly ServerMetrics[],
  pickValue: (metric: ServerMetrics) => number,
): void {
  const lines = [
    "Server Value",
    ...metrics.map((metric) => `${metric.server} ${pickValue(metric)}`),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function buildGnuplotScript(
  reqSecData: string,
  latencyData: string,
  reqSecHistogramFile: string,
  latencyHistogramFile: string,
): string {
  return `
set term pngcairo size 1280,720 enhanced font "Courier,12"
set output "${reqSecHistogramFile}"
set style data histograms
set style histogram cluster gap 1
set style fill solid border -1
set xtics rotate by -45
set boxwidth 0.9
set title "Requests/Sec"
stats "${reqSecData}" using 2 nooutput
set yrange [0:STATS_max*1.2]
set key outside right top
plot "${reqSecData}" using 2:xtic(1) title "Req/Sec"

set output "${latencyHistogramFile}"
set title "Latency (in ms)"
stats "${latencyData}" using 2 nooutput
set yrange [0:STATS_max*1.2]
plot "${latencyData}" using 2:xtic(1) title "Latency"
`;
}

export function generateHistograms(
  metrics: readonly ServerMetrics[],
  bench: BenchmarkId,
  assetsDir = "assets",
): void {
  const reqSecData = "/tmp/reqSec.dat";
  const latencyData = "/tmp/latency.dat";

  writeDataFile(reqSecData, metrics, (m) => m.reqSec);
  writeDataFile(latencyData, metrics, (m) => m.latency);

  const reqSecHistogramFile = `req_sec_histogram${bench}.png`;
  const latencyHistogramFile = `latency_histogram${bench}.png`;

  const script = buildGnuplotScript(
    reqSecData,
    latencyData,
    reqSecHistogramFile,
    latencyHistogramFile,
  );
  execFileSync("gnuplot", [], { input: script });

  fs.mkdirSync(assetsDir, { recursive: true });
  fs.renameSync(reqSecHistogramFile, path.join(assetsDir, reqSecHistogramFile));
  fs.renameSync(
    latencyHistogramFile,
    path.join(assetsDir, latencyHistogramFile),
  );
}
