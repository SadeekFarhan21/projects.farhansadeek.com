/**
 * CloudWatch metrics emitter for the Fly migration.
 *
 * Buffers metrics in-process, flushes every 60s via PutMetricData. Logs the
 * metric to stdout regardless (so a log-aggregator can pick it up even when
 * CloudWatch is disabled or unreachable).
 *
 * Disabled when CW_METRICS_ENABLED env is not "true" — useful for local dev
 * and for the legacy Fargate runtime mode where we don't want extra IAM scope.
 *
 * Namespace defaults to `Treena/Migration` (override via CW_METRICS_NAMESPACE).
 */
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";

const ENABLED = process.env.CW_METRICS_ENABLED === "true";
const NAMESPACE = process.env.CW_METRICS_NAMESPACE || "Treena/Migration";
const FLUSH_INTERVAL_MS = 60_000;
// PutMetricData accepts up to 1000 MetricDatum entries per call. We're nowhere
// near that scale but keep the chunker for safety.
const MAX_PER_BATCH = 1000;

let cwClient = null;
let buffer = [];
let flushTimer = null;
let started = false;

function client() {
  if (!cwClient) cwClient = new CloudWatchClient();
  return cwClient;
}

/**
 * Add a metric to the buffer.
 *
 * @param {object} m
 * @param {string} m.name              Metric name, e.g. "MachineCreateLatencyMs"
 * @param {number} m.value             Numeric value
 * @param {string} [m.unit="None"]     CloudWatch unit (Milliseconds, Count, Bytes, ...)
 * @param {Record<string,string>} [m.dimensions]  e.g. { Outcome: "success" }
 * @param {Date} [m.timestamp]
 */
export function emitMetric({ name, value, unit = "None", dimensions, timestamp }) {
  if (typeof value !== "number" || !Number.isFinite(value)) return;

  // Always log so a log aggregator can pick it up even with CW disabled.
  // Single-line JSON for cheap parsing.
  const dimsStr = dimensions
    ? Object.entries(dimensions)
        .map(([k, v]) => `${k}=${v}`)
        .join(",")
    : "";
  console.log(
    JSON.stringify({
      ts: (timestamp || new Date()).toISOString(),
      kind: "metric",
      ns: NAMESPACE,
      name,
      value,
      unit,
      dims: dimsStr,
    })
  );

  if (!ENABLED) return;

  buffer.push({
    MetricName: name,
    Value: value,
    Unit: unit,
    Timestamp: timestamp || new Date(),
    Dimensions: dimensions
      ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
      : undefined,
  });
}

async function flushOnce() {
  if (!ENABLED) return;
  if (buffer.length === 0) return;
  const toSend = buffer;
  buffer = [];
  for (let i = 0; i < toSend.length; i += MAX_PER_BATCH) {
    const chunk = toSend.slice(i, i + MAX_PER_BATCH);
    try {
      await client().send(
        new PutMetricDataCommand({
          Namespace: NAMESPACE,
          MetricData: chunk,
        })
      );
    } catch (err) {
      // Drop on error rather than re-buffering — if CW is broken, we'd just
      // accumulate forever. Logs already captured the metric for backfill.
      console.error(
        `[metrics] PutMetricData failed (${chunk.length} metrics dropped):`,
        err.message
      );
    }
  }
}

export function start() {
  if (started) return;
  started = true;
  if (!ENABLED) {
    console.log(`[metrics] disabled (CW_METRICS_ENABLED!=true) — logs only, namespace=${NAMESPACE}`);
    return;
  }
  flushTimer = setInterval(() => {
    flushOnce().catch((e) => console.error("[metrics] flush err:", e.message));
  }, FLUSH_INTERVAL_MS);
  if (typeof flushTimer.unref === "function") flushTimer.unref();
  console.log(`[metrics] enabled (namespace=${NAMESPACE}, flush=${FLUSH_INTERVAL_MS}ms)`);
  // Best-effort flush on graceful shutdown.
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.once(sig, () => {
      void flushOnce();
    });
  }
}

export function stop() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  started = false;
}

/** For testing / one-shot scripts: force an immediate flush. */
export async function flushNow() {
  await flushOnce();
}
