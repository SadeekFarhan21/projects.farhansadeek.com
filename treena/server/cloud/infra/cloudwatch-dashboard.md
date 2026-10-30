# Treena/Migration — CloudWatch Dashboard + Alarm

Observability for the Fargate→Fly migration. Metrics are emitted by `treena-api`
at `Treena/Migration` namespace (us-east-1). All metrics also stream as
structured JSON to stdout (`fly logs -a treena-api`) so a log aggregator can
pick them up even if CloudWatch is misconfigured.

## Available metrics

| Metric                       | Unit         | Dimensions       | Source                                                       |
|------------------------------|--------------|------------------|--------------------------------------------------------------|
| `MachineCreateLatencyMs`     | Milliseconds | `Outcome`        | `backgroundProvision()` in api.mjs                           |
| `MachineCreateFailureCount`  | Count        | -                | `backgroundProvision()` failure path                         |
| `MachineStartLatencyMs`      | Milliseconds | `Outcome`        | `/machines/me/status` wake (Day 3.5)                         |
| `MachineStartFailureCount`   | Count        | -                | wake failure path                                            |
| `MachineStopCount`           | Count        | `Reason`         | `idleStop` daemon                                            |
| `MachineStopFailureCount`    | Count        | -                | `idleStop` Fly stop API failure                              |
| `MachineIdleAtStopMs`        | Milliseconds | -                | `idleStop` (idle duration when machine was stopped)          |
| `ActiveMachineCount`         | Count        | -                | `idleStop` 60s sampler (count of `state=started` machines)   |
| `TotalMachineCount`          | Count        | -                | `idleStop` 60s sampler (all states)                          |
| `MachinesByState`            | Count        | `State`          | `idleStop` 60s sampler (per-state breakdown)                 |

`MachineCreateLatencyMs.Outcome` and `MachineStartLatencyMs.Outcome` take
values `success` or `failure`. `MachinesByState.State` takes Fly machine
states (`created`, `starting`, `started`, `stopping`, `stopped`, etc.).

## Create the dashboard

Save this as `dashboard.json`, then `aws cloudwatch put-dashboard ...`:

```bash
cat > /tmp/treena-migration-dashboard.json <<'EOF'
{
  "widgets": [
    {
      "type": "metric", "x": 0, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "Machine wake latency (ms) — success only",
        "region": "us-east-1",
        "view": "timeSeries", "stacked": false,
        "metrics": [
          [ "Treena/Migration", "MachineStartLatencyMs", "Outcome", "success", { "stat": "p50", "label": "p50" } ],
          [ "...", { "stat": "p99", "label": "p99" } ]
        ],
        "yAxis": { "left": { "min": 0 } }
      }
    },
    {
      "type": "metric", "x": 12, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "Machine create latency (ms) — success only",
        "region": "us-east-1",
        "view": "timeSeries", "stacked": false,
        "metrics": [
          [ "Treena/Migration", "MachineCreateLatencyMs", "Outcome", "success", { "stat": "p50", "label": "p50" } ],
          [ "...", { "stat": "p99", "label": "p99" } ]
        ],
        "yAxis": { "left": { "min": 0 } }
      }
    },
    {
      "type": "metric", "x": 0, "y": 6, "width": 12, "height": 6,
      "properties": {
        "title": "Active machines",
        "region": "us-east-1",
        "view": "timeSeries", "stacked": false,
        "metrics": [
          [ "Treena/Migration", "ActiveMachineCount", { "label": "started" } ],
          [ ".", "TotalMachineCount", { "label": "total" } ]
        ]
      }
    },
    {
      "type": "metric", "x": 12, "y": 6, "width": 12, "height": 6,
      "properties": {
        "title": "Machines by state",
        "region": "us-east-1",
        "view": "timeSeries", "stacked": true,
        "metrics": [
          [ "Treena/Migration", "MachinesByState", "State", "started" ],
          [ "...", "stopped" ],
          [ "...", "starting" ],
          [ "...", "stopping" ],
          [ "...", "created" ]
        ]
      }
    },
    {
      "type": "metric", "x": 0, "y": 12, "width": 12, "height": 6,
      "properties": {
        "title": "Failures per minute",
        "region": "us-east-1",
        "view": "timeSeries", "stacked": false,
        "metrics": [
          [ "Treena/Migration", "MachineCreateFailureCount", { "stat": "Sum", "label": "create failures" } ],
          [ ".", "MachineStartFailureCount", { "stat": "Sum", "label": "start failures" } ],
          [ ".", "MachineStopFailureCount", { "stat": "Sum", "label": "stop failures" } ]
        ],
        "annotations": {
          "horizontal": [ { "label": "alarm threshold", "value": 5 } ]
        }
      }
    },
    {
      "type": "metric", "x": 12, "y": 12, "width": 12, "height": 6,
      "properties": {
        "title": "Stops per minute (idle vs other)",
        "region": "us-east-1",
        "view": "timeSeries", "stacked": true,
        "metrics": [
          [ "Treena/Migration", "MachineStopCount", "Reason", "idle", { "stat": "Sum" } ]
        ]
      }
    }
  ]
}
EOF

aws cloudwatch put-dashboard \
  --dashboard-name TreenaMigration \
  --dashboard-body file:///tmp/treena-migration-dashboard.json \
  --region us-east-1
```

View it at:
`https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=TreenaMigration`

## Alarm: failed create rate

Pages the on-caller (or just goes to alarm state) when more than 5
`MachineCreateFailureCount` events fire within 5 minutes — usually means a
transient Fly issue, an image regression, or expired AWS creds.

```bash
aws cloudwatch put-metric-alarm \
  --region us-east-1 \
  --alarm-name treena-migration-create-failures \
  --alarm-description "Fly machine creation failing for users — check Fly status, treena-api logs, IAM" \
  --namespace Treena/Migration \
  --metric-name MachineCreateFailureCount \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 5 \
  --datapoints-to-alarm 1 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching
```

Add `--alarm-actions <SNS-topic-ARN>` once an SNS topic exists for paging
(skip for now — alarm state in the CloudWatch console is enough during
internal cutover).

## Optional: CW agent permission grant

If `MachineCreateFailureCount > 0` from CloudWatch publish errors (visible in
`fly logs -a treena-api` as `[metrics] PutMetricData failed`), the IAM user
backing `AWS_ACCESS_KEY_ID` on `treena-api` is missing `cloudwatch:PutMetricData`.
Attach this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "cloudwatch:PutMetricData",
    "Resource": "*",
    "Condition": {
      "StringEquals": {
        "cloudwatch:namespace": "Treena/Migration"
      }
    }
  }]
}
```
