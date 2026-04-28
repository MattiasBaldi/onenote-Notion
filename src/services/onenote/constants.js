import path from "node:path";

export const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
export const LOGIN_ROOT = "https://login.microsoftonline.com";
export const DEFAULT_SCOPES = ["User.Read", "Notes.Read", "offline_access"];
export const AUTH_CACHE_PATH = path.join(
  process.env.HOME || process.cwd(),
  ".cache",
  "onenote-exporter",
  "auth-cache.json",
);
export const DEFAULT_OUT_DIR = path.resolve(
  process.env.HOME || process.cwd(),
  "Desktop",
  "onenote",
);
