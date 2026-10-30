import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Treena",
  slug: "treena",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "treena",
  userInterfaceStyle: "dark",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.treena.ide",
    infoPlist: {
      NSLocalNetworkUsageDescription:
        "Treena connects to your workspace WebSocket bridge on your local network (e.g. your computer).",
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
    },
  },
  android: {
    package: "com.treena.ide",
    adaptiveIcon: {
      backgroundColor: "#0A0A0A",
      foregroundImage: "./assets/images/adaptive-icon.png",
    },
    softwareKeyboardLayoutMode: "resize",
    // @ts-expect-error ExpoConfig Android type omits this; AndroidManifest supports it for http preview URLs.
    usesCleartextTraffic: true,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        backgroundColor: "#0A0A0A",
      },
    ],
    "expo-secure-store",
    "expo-asset",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...config?.extra,
    /** Set EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID and EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_SECRET in .env. */
    githubOAuthClientId: process.env.EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID ?? "",
    githubOAuthClientSecret: process.env.EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_SECRET ?? "",
    /** Set EXPO_PUBLIC_CLOUD_API_URL to your deployed Cloud API base URL. */
    cloudApiUrl: process.env.EXPO_PUBLIC_CLOUD_API_URL ?? "",
    /**
     * Fargate→Fly migration flag. When true, mobile uses the persistent-machine
     * orchestration (lib/userMachine.ts, useUserMachine hook, /users/ensure +
     * /machines/me/status endpoints) instead of the legacy ephemeral-session
     * flow (lib/cloudSession.ts, useCloudSession hook, /sessions). Defaults
     * false for the duration of the rollout.
     */
    useFly: (process.env.EXPO_PUBLIC_USE_FLY ?? "false").toLowerCase() === "true",
    /** When useFly is true, override cloudApiUrl with the Fly-hosted treena-api. */
    flyApiUrl: process.env.EXPO_PUBLIC_FLY_API_URL ?? "https://treena-api.fly.dev",
  },
});
