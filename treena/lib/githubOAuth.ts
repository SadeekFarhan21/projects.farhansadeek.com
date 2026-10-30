/**
 * GitHub OAuth (authorization code + PKCE).
 *
 * GitHub OAuth App setup:
 * - Register at https://github.com/settings/developers → OAuth Apps → New.
 * - Authorization callback URL: must match getGithubOAuthRedirectUri() exactly
 *   (typically treena://github-oauth; Expo Go in dev may use exp://… — add both in GitHub).
 * - Set EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID and EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_SECRET in .env.
 *
 * Scopes: repo (HTTPS git), read:user (profile; optional but useful).
 */
import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";

const GITHUB_AUTHORIZATION: AuthSession.AuthDiscoveryDocument = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
};

const GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";

const OAUTH_PATH = "github-oauth";

export function getGithubOAuthClientId(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID?.trim() ?? "";
  const fromExtra = String(
    Constants.expoConfig?.extra?.githubOAuthClientId ?? ""
  ).trim();
  return fromEnv || fromExtra;
}

export function getGithubOAuthClientSecret(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const fromExtra = String(
    Constants.expoConfig?.extra?.githubOAuthClientSecret ?? ""
  ).trim();
  return fromEnv || fromExtra;
}

/** Paste this value into the GitHub OAuth App "Authorization callback URL" field. */
export function getGithubOAuthRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: "treena",
    path: OAUTH_PATH,
  });
}

export type GithubOAuthResult =
  | { ok: true; accessToken: string }
  | { ok: false; message: string };

export async function signInWithGithub(): Promise<GithubOAuthResult> {
  const clientId = getGithubOAuthClientId();
  if (!clientId) {
    return {
      ok: false,
      message:
        "GitHub sign-in is not configured. Set EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID in .env and rebuild.",
    };
  }

  const redirectUri = getGithubOAuthRedirectUri();

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ["repo", "read:user"],
    redirectUri,
    usePKCE: true,
  });

  const result = await request.promptAsync(GITHUB_AUTHORIZATION);

  if (result.type === "locked") {
    return { ok: false, message: "Another sign-in is already in progress." };
  }
  if (result.type === "cancel" || result.type === "dismiss") {
    return { ok: false, message: "Sign in cancelled." };
  }
  if (result.type === "error") {
    const desc =
      result.error?.message ??
      result.params?.error_description ??
      result.params?.error ??
      "GitHub authorization failed.";
    return { ok: false, message: String(desc) };
  }
  if (result.type !== "success") {
    return { ok: false, message: "Unexpected sign-in result." };
  }

  const code = result.params.code;
  if (!code || !request.codeVerifier) {
    return { ok: false, message: "Missing authorization code. Try again." };
  }

  try {
    const token = await AuthSession.exchangeCodeAsync(
      {
        clientId,
        clientSecret: getGithubOAuthClientSecret(),
        code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier,
        },
      },
      { tokenEndpoint: GITHUB_TOKEN_ENDPOINT }
    );

    if (!token.accessToken) {
      return { ok: false, message: "GitHub did not return an access token." };
    }

    return { ok: true, accessToken: token.accessToken };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg || "Token exchange failed." };
  }
}
