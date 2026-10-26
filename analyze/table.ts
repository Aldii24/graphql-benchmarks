import fs from "fs";
import { BenchmarkId, ServerMetrics } from "./types";

const BENCHMARK_QUERIES: Record<BenchmarkId, string> = {
  1: "`{ posts { id userId title user { id name email }}}`",
  2: "`{ posts { title }}`",
  3: "`{ greet }`",
};

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function buildResultsTable(
  metrics: readonly ServerMetrics[],
  bench: BenchmarkId,
): string {
  const sorted = [...metrics].sort((a, b) => b.reqSec - a.reqSec);
  const slowest = sorted[sorted.length - 1];
  const slowestReqSec = slowest ? slowest.reqSec : 1;

  const lines: string[] = [];
  if (bench === 1) {
    lines.push(
      "<!-- PERFORMANCE_RESULTS_START -->",
      "",
      "| Query | Server | Requests/sec | Latency (ms) | Relative |",
      "|-------:|--------:|--------------:|--------------:|---------:|",
    );
  }
  lines.push(`| ${bench} | ${BENCHMARK_QUERIES[bench]} |`);

  for (const item of sorted) {
    const reqSec = formatNumber(item.reqSec);
    const latency = formatNumber(item.latency);
    const relative = (item.reqSec / slowestReqSec).toFixed(2);
    lines.push(
      `|| [${item.server}] | \`${reqSec}\` | \`${latency}\` | \`${relative}x\` |`,
    );
  }

  if (bench === 3) {
    lines.push("", "<!-- PERFORMANCE_RESULTS_END -->");
  }

  return lines.join("\n");
}

export function writeBenchmarkResults(
  metrics: readonly ServerMetrics[],
  bench: BenchmarkId,
  resultsFile = "results.md",
  readmeFile = "README.md",
): void {
  const resultsTable = buildResultsTable(metrics, bench);
  fs.appendFileSync(resultsFile, `${resultsTable}\n`);

  if (bench === 3) {
    const finalResults = fs.readFileSync(resultsFile, "utf8").trim();
    console.log(
      finalResults
        .replace(/<!-- PERFORMANCE_RESULTS_START -->/g, "")
        .replace(/<!-- PERFORMANCE_RESULTS_END -->/g, ""),
    );

    const readmeContent = fs.readFileSync(readmeFile, "utf8");
    const markerPattern =
      /<!-- PERFORMANCE_RESULTS_START -->[\s\S]*<!-- PERFORMANCE_RESULTS_END -->/;
    const updatedReadme = markerPattern.test(readmeContent)
      ? readmeContent.replace(markerPattern, finalResults)
      : `${readmeContent}\n${finalResults}\n`;

    fs.writeFileSync(readmeFile, updatedReadme);
  }
}
