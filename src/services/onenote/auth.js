import fs from "node:fs/promises";
import path from "node:path";
import { AUTH_CACHE_PATH, DEFAULT_SCOPES, LOGIN_ROOT } from "./constants.js";

export async function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");

  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const assignment = trimmed.startsWith("export ")
        ? trimmed.slice("export ".length).trim()
        : trimmed;
      const eqIndex = assignment.indexOf("=");
      if (eqIndex === -1) continue;

      const key = assignment.slice(0, eqIndex).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = assignment.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readAuthCache() {
  try {
    const raw = await fs.readFile(AUTH_CACHE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeAuthCache(cache) {
  await ensureDir(path.dirname(AUTH_CACHE_PATH));
  await fs.writeFile(AUTH_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

export async function clearAuthCache() {
  await fs.rm(AUTH_CACHE_PATH, { force: true });
}

async function refreshAccessToken({ tenant, clientId, refreshToken, scopes }) {
  const tokenUrl = `${LOGIN_ROOT}/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;
  const scopeList = scopes?.length ? scopes : DEFAULT_SCOPES;

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
      scope: scopeList.join(" "),
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(
      `Refresh token request failed: ${json.error || res.status} ${json.error_description || ""}`.trim(),
    );
  }

  return json;
}

export async function getAccessToken({ token, tenant, clientId, scopes, quiet }) {
  if (token) {
    return token.trim();
  }

  if (!clientId) {
    throw new Error(
      [
        "No access token or client ID was provided.",
        "Set ONENOTE_ACCESS_TOKEN, or use device-code auth with ONENOTE_CLIENT_ID (and optionally ONENOTE_TENANT_ID).",
      ].join(" "),
    );
  }

  const scopeList = scopes?.length ? scopes : DEFAULT_SCOPES;
  const cache = await readAuthCache();

  if (cache?.refreshToken && cache?.clientId === clientId && cache?.tenant === tenant) {
    try {
      const refreshed = await refreshAccessToken({
        tenant,
        clientId,
        refreshToken: cache.refreshToken,
        scopes: cache.scopes || scopeList,
      });

      await writeAuthCache({
        tenant,
        clientId,
        scopes: scopeList,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || cache.refreshToken,
        expiresAt: Date.now() + (refreshed.expires_in || 3600) * 1000,
      });

      if (!quiet) {
        console.log("Reused cached sign-in session.");
      }

      return refreshed.access_token;
    } catch {
      // Fall through to device code.
    }
  }

  const deviceCodeUrl = `${LOGIN_ROOT}/${encodeURIComponent(tenant)}/oauth2/v2.0/devicecode`;
  const tokenUrl = `${LOGIN_ROOT}/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;

  const deviceRes = await fetch(deviceCodeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      scope: scopeList.join(" "),
    }),
  });

  const deviceJson = await deviceRes.json();
  if (!deviceRes.ok) {
    throw new Error(
      `Device code request failed: ${deviceJson.error || deviceRes.status} ${deviceJson.error_description || ""}`.trim(),
    );
  }

  if (!quiet) {
    console.log(deviceJson.message);
    console.log("Waiting for sign-in to complete...");
  }

  let intervalMs = (deviceJson.interval || 5) * 1000;
  const expiresAt = Date.now() + (deviceJson.expires_in || 900) * 1000;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: clientId,
        device_code: deviceJson.device_code,
      }),
    });

    const tokenJson = await tokenRes.json();
    if (tokenRes.ok && tokenJson.access_token) {
      await writeAuthCache({
        tenant,
        clientId,
        scopes: scopeList,
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token || null,
        expiresAt: Date.now() + (tokenJson.expires_in || 3600) * 1000,
      });

      if (!quiet) {
        console.log("Sign-in complete. Continuing...");
      }
      return tokenJson.access_token;
    }

    const error = tokenJson.error;
    if (error === "authorization_pending") {
      continue;
    }
    if (error === "slow_down") {
      intervalMs += 5000;
      continue;
    }
    throw new Error(
      `OAuth token request failed: ${error || tokenRes.status} ${tokenJson.error_description || ""}`.trim(),
    );
  }

  throw new Error("Timed out waiting for device-code authorization.");
}
