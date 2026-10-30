export const RESERVED_USERNAMES = new Set([
  "dashboard",
  "admin",
  "api",
  "auth",
  "signin",
  "signup",
  "login",
  "logout",
  "settings",
  "explore",
  "leaderboard",
  "overlay",
  "about",
  "terms",
  "privacy",
  "help",
  "support",
  "blog",
  "pricing",
  "contact",
  "feed",
  "search",
  "notifications",
  "onboarding",
]);

export const CASHOUT_DENOMINATIONS = [1000, 1500, 2500] as const; // in cents: $10, $15, $25

export const PLATFORM_MARKUP_PERCENT = 20;

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
