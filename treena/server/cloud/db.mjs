/**
 * DynamoDB storage for per-user state.
 *
 * Tables:
 *   - treena-user-tokens   (PK: githubUserId N)            AI CLI tokens
 *   - treena-user-machines (PK: githubUserId N)            Fly machine + volume metadata
 *   - treena-user-repos    (PK: githubUserId N, SK: repoUrl S)  Per-repo setup state
 *
 * treena-user-repos fields (no schema enforcement — DDB is schemaless):
 *   - setupState     : "unset" | "cloning" | "ready" | "failed"
 *   - setupStartedAt : epoch ms; set when setupState transitions to "cloning"
 *                      (used by /repos/open for >5min stuck-state recovery)
 *   - lastOpenedAt   : epoch ms; bumped on every /repos/open call
 *   - currentBranch  : last branch the user requested (or null)
 *   - installedAt    : epoch ms; set when mobile flips setupState to "ready"
 *   - lastError      : optional human-readable error or recovery reason
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE = process.env.DYNAMODB_TABLE || "treena-user-tokens";
const MACHINES_TABLE = process.env.DYNAMODB_MACHINES_TABLE || "treena-user-machines";
const REPOS_TABLE = process.env.DYNAMODB_REPOS_TABLE || "treena-user-repos";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());

/**
 * Build an UpdateCommand input from a flat patch object. Escapes every field
 * name with a `#alias` so we never trip on DDB reserved words (status, etc.).
 */
function buildUpdate(tableName, key, patch) {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return null;
  const sets = [];
  const removes = [];
  const names = {};
  const values = {};
  for (const [field, value] of entries) {
    const nameAlias = `#${field}`;
    names[nameAlias] = field;
    if (value === null) {
      removes.push(nameAlias);
    } else {
      const valueAlias = `:${field}`;
      values[valueAlias] = value;
      sets.push(`${nameAlias} = ${valueAlias}`);
    }
  }
  const parts = [];
  if (sets.length) parts.push("SET " + sets.join(", "));
  if (removes.length) parts.push("REMOVE " + removes.join(", "));
  return {
    TableName: tableName,
    Key: key,
    UpdateExpression: parts.join(" "),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
  };
}

async function getFullUserItem(githubUserId) {
  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { githubUserId },
      })
    );
    return result.Item || {};
  } catch (err) {
    console.error("[db] getFullUserItem error:", err.message);
    return {};
  }
}

/**
 * Get stored AI tokens for a GitHub user.
 * @param {number} githubUserId
 * @returns {Promise<{ claudeOauthToken?: string, codexApiKey?: string }>}
 */
export async function getAiTokens(githubUserId) {
  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { githubUserId },
        ProjectionExpression: "claudeOauthToken, codexApiKey",
      })
    );
    return result.Item || {};
  } catch (err) {
    console.error("[db] getAiTokens error:", err.message);
    return {};
  }
}

/**
 * Store AI tokens for a GitHub user. Merges with existing — only overwrites provided fields.
 * @param {number} githubUserId
 * @param {{ claudeOauthToken?: string, codexApiKey?: string }} tokens
 */
export async function putAiTokens(githubUserId, tokens) {
  const existing = await getFullUserItem(githubUserId);

  const merged = {
    ...existing,
    githubUserId,
    claudeOauthToken: tokens.claudeOauthToken || existing.claudeOauthToken || null,
    codexApiKey: tokens.codexApiKey || existing.codexApiKey || null,
    updatedAt: Date.now(),
  };

  const item = Object.fromEntries(
    Object.entries(merged).filter(([, v]) => v != null)
  );

  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );
}

// ── User machines ────────────────────────────────────────────

/**
 * Get the user's machine record.
 * @returns {Promise<object|null>}
 */
export async function getUserMachine(githubUserId) {
  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: MACHINES_TABLE,
        Key: { githubUserId },
      })
    );
    return result.Item || null;
  } catch (err) {
    console.error("[db] getUserMachine error:", err.message);
    throw err;
  }
}

/**
 * Insert/replace the user's machine row. Use for full-row writes (initial
 * creation). For hot-path partial updates (status, lastStartedAt) use
 * updateUserMachine to avoid clobbering concurrent writes.
 */
export async function putUserMachine(githubUserId, fields) {
  const item = {
    githubUserId,
    ...fields,
  };
  const cleaned = Object.fromEntries(
    Object.entries(item).filter(([, v]) => v != null)
  );
  await ddb.send(
    new PutCommand({
      TableName: MACHINES_TABLE,
      Item: cleaned,
    })
  );
}

/**
 * Atomic partial update of the user's machine row. Pass null in patch to
 * REMOVE a field; undefined to skip it.
 */
export async function updateUserMachine(githubUserId, patch) {
  const input = buildUpdate(MACHINES_TABLE, { githubUserId }, patch);
  if (!input) return;
  await ddb.send(new UpdateCommand(input));
}

// ── User repos ───────────────────────────────────────────────

/**
 * Get setup state for one (user, repo).
 */
export async function getUserRepo(githubUserId, repoUrl) {
  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: REPOS_TABLE,
        Key: { githubUserId, repoUrl },
      })
    );
    return result.Item || null;
  } catch (err) {
    console.error("[db] getUserRepo error:", err.message);
    throw err;
  }
}

/**
 * Insert/replace a repo row.
 */
export async function putUserRepo(githubUserId, repoUrl, fields) {
  const item = {
    githubUserId,
    repoUrl,
    ...fields,
  };
  const cleaned = Object.fromEntries(
    Object.entries(item).filter(([, v]) => v != null)
  );
  await ddb.send(
    new PutCommand({
      TableName: REPOS_TABLE,
      Item: cleaned,
    })
  );
}

/**
 * Atomic partial update of a repo row.
 */
export async function updateUserRepo(githubUserId, repoUrl, patch) {
  const input = buildUpdate(REPOS_TABLE, { githubUserId, repoUrl }, patch);
  if (!input) return;
  await ddb.send(new UpdateCommand(input));
}

/**
 * List all repos a user has ever opened. Cheap (PK Query, no scan).
 */
export async function listUserRepos(githubUserId) {
  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: REPOS_TABLE,
        KeyConditionExpression: "githubUserId = :u",
        ExpressionAttributeValues: { ":u": githubUserId },
      })
    );
    return result.Items || [];
  } catch (err) {
    console.error("[db] listUserRepos error:", err.message);
    throw err;
  }
}
