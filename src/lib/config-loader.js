import fs from "node:fs/promises";
import path from "node:path";

const CONFIG_FILE_NAMES = ["sync.config.json", "onenote.config.json"];

export async function loadConfig(cwd = process.cwd()) {
  const found = [];
  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = path.resolve(cwd, fileName);

    try {
      const raw = await fs.readFile(configPath, "utf8");
      const parsed = JSON.parse(raw);
      found.push({
        path: configPath,
        data: parsed,
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      throw new Error(`Failed to read ${fileName}: ${error.message}`);
    }
  }

  if (found.length) {
    const merged = found.reduceRight((acc, entry) => deepMerge(acc, entry.data), {});
    return {
      path: found[0].path,
      paths: found.map((entry) => entry.path),
      data: merged,
    };
  }

  return {
    path: path.resolve(cwd, CONFIG_FILE_NAMES[0]),
    paths: [],
    data: {},
  };
}

export function getNamespaceConfig(config, namespace) {
  const root = config?.data || {};
  const base = root[namespace] || {};
  const compat = namespace === "onenote" ? root.microsoft || {} : {};
  return {
    ...(root.defaults || {}),
    ...compat,
    ...base,
  };
}

export function getOrchestrationConfig(config) {
  const root = config?.data || {};
  const orchestration = root.orchestration || {};

  return {
    defaultNamespace: orchestration.defaultNamespace || "sync",
    namespaces: orchestration.namespaces || {},
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function deepMerge(base, override) {
  if (!isPlainObject(base)) return override;
  if (!isPlainObject(override)) return override ?? base;

  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
      continue;
    }
    result[key] = value;
  }
  return result;
}

export function getSyncConfig(config, profileName = "default") {
  const root = config?.data || {};
  const sync = root.sync || {};
  const effectiveProfileName =
    profileName !== "default" ? profileName : sync.defaultProfile || profileName;
  const base = {
    source: { service: "onenote" },
    destination: { service: "notion" },
    selection: {
      notebookIds: [],
      sectionIds: [],
      pageIds: [],
      titleIncludes: [],
    },
    limits: {
      maxNotebooks: 1,
      maxSectionsPerNotebook: 4,
      maxPagesPerSection: 10,
      maxPages: 20,
      maxPayloadChars: 24000,
    },
    agent: {},
  };
  const defaults = sync.defaults || {};
  const profile =
    sync.profiles?.[effectiveProfileName] ||
    sync.profiles?.default ||
    root.profiles?.[effectiveProfileName] ||
    root.profiles?.default ||
    {};

  return deepMerge(base, deepMerge(defaults, profile));
}
