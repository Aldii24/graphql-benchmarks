import assert from "node:assert/strict";
import test from "node:test";
import { aggregateMetrics, parse, parseFileName } from "./parser";
import { buildResultsTable } from "./table";

const SAMPLE_WRK_OUTPUT = `
Running 10s test @ http://localhost:8000/graphql
  4 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     4.30ms    1.12ms  18.45ms   75.20%
    Req/Sec     5.72k   312.40     6.50k    68.00%
  228050 requests in 10.00s, 145.20MB read
Requests/sec:  22805.00
Transfer/sec:     14.52MB
`;

test("parse extracts reqSec and latency in ms from wrk output", () => {
  const result = parse(SAMPLE_WRK_OUTPUT);
  assert.deepEqual(result, { reqSec: 22805.0, latency: 4.3 });
});

test("parse converts microsecond and second latency units to ms", () => {
  const usOutput = `
    Latency   850.00us    1.12ms  18.45ms   75.20%
Requests/sec:  50000.00
`;
  assert.deepEqual(parse(usOutput), { reqSec: 50000.0, latency: 0.85 });

  const sOutput = `
    Latency     1.25s     1.12ms  18.45ms   75.20%
Requests/sec:  80.00
`;
  assert.deepEqual(parse(sOutput), { reqSec: 80.0, latency: 1250 });
});

test("parseFileName extracts benchmark id, run number, and server name", () => {
  assert.deepEqual(
    parseFileName("bench1_result2_graphql_apollo_server_run.sh.txt"),
    { bench: 1, run: 2, server: "apollo_server" },
  );
  assert.deepEqual(
    parseFileName("/tmp/bench3_result1_graphql_tailcall_run.sh.txt"),
    { bench: 3, run: 1, server: "tailcall" },
  );
});

test("aggregateMetrics averages multiple runs per server and buildResultsTable sorts descending", () => {
  const aggregated = aggregateMetrics([
    {
      bench: 1,
      run: 1,
      server: "server_a",
      metrics: { reqSec: 100, latency: 10 },
    },
    {
      bench: 1,
      run: 2,
      server: "server_a",
      metrics: { reqSec: 200, latency: 20 },
    },
    {
      bench: 1,
      run: 1,
      server: "server_b",
      metrics: { reqSec: 300, latency: 5 },
    },
  ]);

  assert.deepEqual(aggregated, [
    { server: "server_a", reqSec: 150, latency: 15 },
    { server: "server_b", reqSec: 300, latency: 5 },
  ]);

  const table = buildResultsTable(aggregated, 1);
  assert.ok(table.includes("|| [server_b] | `300.00` | `5.00` | `2.00x` |"));
  assert.ok(table.includes("|| [server_a] | `150.00` | `15.00` | `1.00x` |"));
});
