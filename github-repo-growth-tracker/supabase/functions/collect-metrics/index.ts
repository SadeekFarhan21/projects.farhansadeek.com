import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type QueueRepo = {
  tracked_repo_id: string;
  github_repo_id: number | null;
  repo_owner: string;
  repo_name: string;
  last_collected_on: string | null;
};

type CollectorState = {
  id: number;
  discovery_since_id: number;
};

type GitHubRepoSummary = {
  id: number;
  name: string;
  owner: {
    login: string;
  } | null;
};

type GitHubRepoResponse = {
  id: number;
  stargazers_count: number;
  forks_count: number;
  full_name: string;
  html_url: string;
  archived: boolean;
  disabled: boolean;
};

type Failure = {
  repo: string;
  message: string;
};

function isPermanentRepoFailure(status: number, errorText: string): boolean {
  const lower = errorText.toLowerCase();

  // Gone/missing/legal blocks are permanent for this collector.
  if (status === 404 || status === 410 || status === 451) {
    return true;
  }

  // GitHub sometimes returns a 403 "Repository access blocked" payload.
  if (status === 403 && lower.includes('repository access blocked')) {
    return true;
  }

  if (status === 403 && lower.includes('"block"') && lower.includes('"reason":"unavailable"')) {
    return true;
  }

  return false;
}

type GitHubFetchResult<T> =
  | {
      ok: true;
      data: T;
      status: number;
      usedToken: boolean;
      usedFallback: boolean;
    }
  | {
      ok: false;
      status: number;
      errorText: string;
      usedToken: boolean;
      usedFallback: boolean;
    };

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function createGitHubBaseHeaders(): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'supabase-collect-metrics'
  };
}

function createGitHubTokenHeaders(token: string): HeadersInit {
  return {
    ...createGitHubBaseHeaders(),
    Authorization: `Bearer ${token}`
  };
}

async function fetchGitHubJson<T>(url: string, token: string | null): Promise<GitHubFetchResult<T>> {
  const baseHeaders = createGitHubBaseHeaders();
  const tokenHeaders = token ? createGitHubTokenHeaders(token) : baseHeaders;

  let response = await fetch(url, { headers: tokenHeaders });
  let usedToken = Boolean(token);
  let usedFallback = false;

  if (token && response.status === 401) {
    const authErrorBody = await response.text();
    if (authErrorBody.toLowerCase().includes('bad credentials')) {
      response = await fetch(url, { headers: baseHeaders });
      usedToken = false;
      usedFallback = true;
    } else {
      return {
        ok: false,
        status: response.status,
        errorText: authErrorBody,
        usedToken,
        usedFallback
      };
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      ok: false,
      status: response.status,
      errorText: errorBody,
      usedToken,
      usedFallback
    };
  }

  return {
    ok: true,
    status: response.status,
    data: (await response.json()) as T,
    usedToken,
    usedFallback
  };
}

function getSupabaseCredentials(): { supabaseUrl: string | null; serviceRoleKey: string | null } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('APP_SUPABASE_URL');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY');

  return { supabaseUrl, serviceRoleKey };
}

async function readCollectorState(supabase: ReturnType<typeof createClient>): Promise<CollectorState> {
  const { data, error } = await supabase
    .from('collector_state')
    .select('id, discovery_since_id')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read collector_state: ${error.message}`);
  }

  if (data) {
    return data as CollectorState;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('collector_state')
    .upsert({ id: 1, discovery_since_id: 0 }, { onConflict: 'id' })
    .select('id, discovery_since_id')
    .single();

  if (insertError) {
    throw new Error(`Failed to initialize collector_state: ${insertError.message}`);
  }

  return inserted as CollectorState;
}

async function writeCollectorState(
  supabase: ReturnType<typeof createClient>,
  discoverySinceId: number
): Promise<void> {
  const { error } = await supabase
    .from('collector_state')
    .update({ discovery_since_id: discoverySinceId, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) {
    throw new Error(`Failed to update collector_state: ${error.message}`);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      message: 'Use POST to run collection.'
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const requestSecret = request.headers.get('x-cron-secret');
    if (requestSecret !== cronSecret) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseCredentials();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        error:
          'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (or APP_SUPABASE_URL/APP_SUPABASE_SERVICE_ROLE_KEY) in function secrets.'
      },
      500
    );
  }

  const githubToken = Deno.env.get('GITHUB_TOKEN')?.trim() || null;
  const hasGitHubToken = Boolean(githubToken);
  const discoverPublicRepos = (Deno.env.get('DISCOVER_PUBLIC_REPOS') ?? 'true') !== 'false';
  const discoveryPagesPerRun = Math.min(
    parsePositiveInt(Deno.env.get('DISCOVERY_PAGES_PER_RUN'), hasGitHubToken ? 2 : 1),
    25
  );
  const discoveryPageSize = Math.min(parsePositiveInt(Deno.env.get('DISCOVERY_PAGE_SIZE'), 100), 100);
  const metricsBatchSize = Math.min(
    parsePositiveInt(Deno.env.get('METRICS_BATCH_SIZE'), hasGitHubToken ? 250 : 40),
    2500
  );

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const now = new Date();
  const collectedOn = now.toISOString().slice(0, 10);
  let githubTokenFallbackUsed = false;

  let state: CollectorState;
  try {
    state = await readCollectorState(supabase);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }

  const discoveryFailures: Failure[] = [];
  let discoveredRepositories = 0;
  let discoverySinceId = state.discovery_since_id;

  if (discoverPublicRepos) {
    for (let page = 0; page < discoveryPagesPerRun; page += 1) {
      const url = new URL('https://api.github.com/repositories');
      url.searchParams.set('per_page', String(discoveryPageSize));
      url.searchParams.set('since', String(discoverySinceId));

      const discoveryResult = await fetchGitHubJson<GitHubRepoSummary[]>(url.toString(), githubToken);
      if (!discoveryResult.ok) {
        discoveryFailures.push({
          repo: `public-list-since-${discoverySinceId}`,
          message: `GitHub API returned ${discoveryResult.status}: ${discoveryResult.errorText.slice(0, 180)}`
        });
        break;
      }

      if (discoveryResult.usedFallback) {
        githubTokenFallbackUsed = true;
      }

      const payload = discoveryResult.data;
      if (payload.length === 0) {
        break;
      }

      const rows = payload
        .filter((repo) => repo.owner?.login && repo.name)
        .map((repo) => ({
          github_repo_id: repo.id,
          repo_owner: repo.owner!.login,
          repo_name: repo.name,
          source: 'github_public_scan',
          is_active: true
        }));

      if (rows.length > 0) {
        const { error: upsertByNameError } = await supabase.from('tracked_repos').upsert(rows, {
          onConflict: 'repo_owner,repo_name'
        });

        if (upsertByNameError) {
          const needsRepoIdFallback =
            /tracked_repos_github_repo_id_unique/i.test(upsertByNameError.message) ||
            /duplicate key value violates unique constraint/i.test(upsertByNameError.message);

          if (!needsRepoIdFallback) {
            discoveryFailures.push({
              repo: `public-list-since-${discoverySinceId}`,
              message: `Failed to upsert discovered repos: ${upsertByNameError.message}`
            });
            break;
          }

          const { error: upsertByRepoIdError } = await supabase.from('tracked_repos').upsert(rows, {
            onConflict: 'github_repo_id'
          });

          if (upsertByRepoIdError) {
            discoveryFailures.push({
              repo: `public-list-since-${discoverySinceId}`,
              message: `Fallback upsert by github_repo_id also failed: ${upsertByRepoIdError.message}`
            });
            break;
          }
        }

        discoveredRepositories += rows.length;
      }

      discoverySinceId = Math.max(...payload.map((repo) => repo.id));
    }

    try {
      await writeCollectorState(supabase, discoverySinceId);
    } catch (error) {
      discoveryFailures.push({
        repo: 'collector_state',
        message: (error as Error).message
      });
    }
  }

  const { data: queueRows, error: queueError } = await supabase
    .from('repos_collection_queue')
    .select('tracked_repo_id, github_repo_id, repo_owner, repo_name, last_collected_on')
    .or(`last_collected_on.is.null,last_collected_on.lt.${collectedOn}`)
    .order('last_collected_on', { ascending: true, nullsFirst: true })
    .order('github_repo_id', { ascending: true, nullsFirst: true })
    .limit(metricsBatchSize);

  if (queueError) {
    return jsonResponse({ error: `Failed to read repos_collection_queue: ${queueError.message}` }, 500);
  }

  const repositoriesToCollect = (queueRows ?? []) as QueueRepo[];

  const collectionFailures: Failure[] = [];
  let upserted = 0;
  let deactivatedRepos = 0;

  for (const repo of repositoriesToCollect) {
    const repoRef = `${repo.repo_owner}/${repo.repo_name}`;
    const repoResult = await fetchGitHubJson<GitHubRepoResponse>(
      `https://api.github.com/repos/${repoRef}`,
      githubToken
    );

    if (!repoResult.ok) {
      if (isPermanentRepoFailure(repoResult.status, repoResult.errorText)) {
        const { error: deactivateError } = await supabase
          .from('tracked_repos')
          .update({ is_active: false })
          .eq('id', repo.tracked_repo_id);

        if (deactivateError) {
          collectionFailures.push({
            repo: repoRef,
            message: `Permanent GitHub failure (${repoResult.status}), and deactivation failed: ${deactivateError.message}`
          });
          continue;
        }

        deactivatedRepos += 1;
        collectionFailures.push({
          repo: repoRef,
          message: `Permanent GitHub failure (${repoResult.status}); repo deactivated`
        });
        continue;
      }

      collectionFailures.push({
        repo: repoRef,
        message: `GitHub API returned ${repoResult.status}: ${repoResult.errorText.slice(0, 180)}`
      });
      continue;
    }

    if (repoResult.usedFallback) {
      githubTokenFallbackUsed = true;
    }

    const payload = repoResult.data;

    const [ownerFromPayload, nameFromPayload] = payload.full_name.split('/');
    if (
      repo.github_repo_id !== payload.id ||
      repo.repo_owner !== ownerFromPayload ||
      repo.repo_name !== nameFromPayload
    ) {
      const { error: repoSyncError } = await supabase
        .from('tracked_repos')
        .update({
          github_repo_id: payload.id,
          repo_owner: ownerFromPayload,
          repo_name: nameFromPayload
        })
        .eq('id', repo.tracked_repo_id);

      if (repoSyncError) {
        collectionFailures.push({
          repo: repoRef,
          message: `Failed to sync tracked_repos row: ${repoSyncError.message}`
        });
        continue;
      }
    }

    const { error: upsertError } = await supabase.from('repo_daily_metrics').upsert(
      {
        tracked_repo_id: repo.tracked_repo_id,
        collected_on: collectedOn,
        stars: payload.stargazers_count,
        forks: payload.forks_count,
        raw_payload: {
          github_repo_id: payload.id,
          full_name: payload.full_name,
          html_url: payload.html_url,
          archived: payload.archived,
          disabled: payload.disabled,
          fetched_at: new Date().toISOString()
        }
      },
      {
        onConflict: 'tracked_repo_id,collected_on'
      }
    );

    if (upsertError) {
      collectionFailures.push({
        repo: repoRef,
        message: `Supabase upsert failed: ${upsertError.message}`
      });
      continue;
    }

    upserted += 1;
  }

  const { data: deletedRows, error: cleanupError } = await supabase.rpc('cleanup_old_metrics');

  // Refresh the materialized growth metrics table
  const { data: refreshedRows, error: refreshError } = await supabase.rpc(
    'refresh_repo_growth_metrics'
  );

  return jsonResponse({
    ok: true,
    collected_on: collectedOn,
    github_token_configured: hasGitHubToken,
    github_token_fallback_used: githubTokenFallbackUsed,
    discovery: {
      enabled: discoverPublicRepos,
      pages_per_run: discoveryPagesPerRun,
      page_size: discoveryPageSize,
      discovered_repositories: discoveredRepositories,
      discovery_since_id: discoverySinceId,
      failed_discovery_steps: discoveryFailures.length,
      failures: discoveryFailures
    },
    collection: {
      requested_batch_size: metricsBatchSize,
      processed_repositories: repositoriesToCollect.length,
      upserted_repositories: upserted,
      deactivated_repositories: deactivatedRepos,
      failed_repositories: collectionFailures.length,
      failures: collectionFailures
    },
    deleted_rows_older_than_3_months: deletedRows ?? 0,
    cleanup_error: cleanupError?.message ?? null,
    refresh: {
      rows: refreshedRows ?? 0,
      error: refreshError?.message ?? null
    }
  });
});
