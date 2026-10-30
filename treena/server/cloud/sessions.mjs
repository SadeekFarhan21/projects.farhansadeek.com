/**
 * In-memory session store for ephemeral cloud sessions.
 * Sessions are short-lived (max 2 hours) so persistence is unnecessary.
 */
import crypto from "node:crypto";

/** @type {Map<string, Session>} */
const sessions = new Map();

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {number} githubUserId
 * @property {string} githubLogin
 * @property {string|null} repoUrl
 * @property {string|null} taskArn
 * @property {string} bridgeToken
 * @property {"provisioning"|"ready"|"stopping"|"stopped"|"failed"} status
 * @property {string|null} publicIp
 * @property {string|null} wsUrl
 * @property {number} createdAt
 * @property {number} lastPolledAt
 * @property {string|null} error
 */

export function createSession({ githubUserId, githubLogin, repoUrl }) {
  const id = crypto.randomUUID();
  const bridgeToken = crypto.randomBytes(32).toString("hex");

  /** @type {Session} */
  const session = {
    id,
    githubUserId,
    githubLogin,
    repoUrl: repoUrl || null,
    taskArn: null,
    bridgeToken,
    status: "provisioning",
    publicIp: null,
    wsUrl: null,
    createdAt: Date.now(),
    lastPolledAt: Date.now(),
    error: null,
  };

  sessions.set(id, session);
  return session;
}

export function getSession(id) {
  return sessions.get(id) || null;
}

export function getSessionsByUser(githubUserId) {
  const result = [];
  for (const s of sessions.values()) {
    if (s.githubUserId === githubUserId) result.push(s);
  }
  return result;
}

export function updateSession(id, updates) {
  const session = sessions.get(id);
  if (!session) return null;
  Object.assign(session, updates);
  return session;
}

export function deleteSession(id) {
  sessions.delete(id);
}

export function getAllSessions() {
  return [...sessions.values()];
}
