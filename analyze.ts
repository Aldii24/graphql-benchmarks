import fs from "fs";
import { aggregateMetrics, parse, parseFileName } from "./analyze/parser";
import { generateHistograms } from "./analyze/plot";
import { writeBenchmarkResults } from "./analyze/table";
import { BenchmarkRun } from "./analyze/types";

function main(): void {
  const resultFiles = process.argv.slice(2);
  if (resultFiles.length === 0) {
    throw new Error("No benchmark result files provided");
  }

  const runs: BenchmarkRun[] = resultFiles.map((filePath) => {
    const meta = parseFileName(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const metrics = parse(content);
    return { ...meta, metrics };
  });

  const firstRun = runs[0];
  if (!firstRun) {
    return;
  }

  const aggregated = aggregateMetrics(runs);
  generateHistograms(aggregated, firstRun.bench);
  writeBenchmarkResults(aggregated, firstRun.bench);

  for (const filePath of resultFiles) {
    fs.unlinkSync(filePath);
  }
}

main();
