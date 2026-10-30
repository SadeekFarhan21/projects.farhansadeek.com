#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
  const equalsIndex = withoutExport.indexOf('=');
  if (equalsIndex <= 0) {
    return null;
  }

  const key = withoutExport.slice(0, equalsIndex).trim();
  let value = withoutExport.slice(equalsIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadDotEnvIfPresent() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

function parsePositiveInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

function parseNonNegativeInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

loadDotEnvIfPresent();

const projectRef = process.env.SUPABASE_PROJECT_REF;
const cronSecret = process.env.CRON_SECRET;
const functionName = process.env.FUNCTION_NAME ?? 'collect-metrics';

if (!projectRef) {
  throw new Error('Missing SUPABASE_PROJECT_REF. Put it in .env or export it before running.');
}

if (!cronSecret) {
  throw new Error('Missing CRON_SECRET. Put it in .env or export it before running.');
}

const intervalSeconds = parsePositiveInt('INTERVAL_SECONDS', 600);
const maxRuns = parseNonNegativeInt('MAX_RUNS', 0);
const endpoint = `https://${projectRef}.functions.supabase.co/${functionName}`;

let runCount = 0;
let successCount = 0;
let failureCount = 0;
let stopping = false;

function printSummary() {
  console.log('----- minute poll summary -----');
  console.log(`runs=${runCount} success=${successCount} failure=${failureCount}`);
}

function stopHandler(signal) {
  if (!stopping) {
    stopping = true;
    console.log(`Received ${signal}. Stopping after current run...`);
  }
}

process.on('SIGINT', () => stopHandler('SIGINT'));
process.on('SIGTERM', () => stopHandler('SIGTERM'));

console.log('Starting minute collector');
console.log(`endpoint=${endpoint}`);
console.log(`interval=${intervalSeconds}s max_runs=${maxRuns} (0 = infinite)`);

while (!stopping) {
  runCount += 1;
  const timestamp = new Date().toISOString();
  console.log(`----- run ${runCount} @ ${timestamp} -----`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-cron-secret': cronSecret,
        'Content-Type': 'application/json'
      },
      body: '{}',
      signal: controller.signal
    });

    const body = await response.text();
    console.log(body);

    if (response.ok && /"ok"\s*:\s*true/.test(body)) {
      successCount += 1;
    } else {
      failureCount += 1;
    }
  } catch (error) {
    failureCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Request failed: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (maxRuns > 0 && runCount >= maxRuns) {
    break;
  }

  if (!stopping) {
    await sleep(intervalSeconds * 1000);
  }
}

printSummary();
