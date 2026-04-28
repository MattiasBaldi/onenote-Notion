import path from "node:path";
import { DEFAULT_OUT_DIR } from "./constants.js";
import { clearAuthCache, getAccessToken, loadEnvFile } from "./auth.js";
import { listNotebookSections, listNotebooks, listSectionPages } from "./graph.js";
import { getNamespaceConfig, loadConfig } from "../../lib/config-loader.js";
import {
  ensureDir,
  exportNotebookTree,
  fetchNotebookDetails,
  fetchPageDetails,
  fetchSectionDetails,
  writeJson,
} from "./output.js";

function printUsage() {
  console.log(`
Usage:
  onenote-exporter onenote login
  onenote-exporter onenote logout
  onenote-exporter onenote list notebooks
  onenote-exporter onenote list sections <notebookId>
  onenote-exporter onenote list pages <sectionId>
  onenote-exporter onenote fetch notebook <notebookId>
  onenote-exporter onenote fetch section <sectionId>
  onenote-exporter onenote fetch page <pageId>
  onenote-exporter onenote export [notebook <notebookId>]

Global flags:
  --out <dir>
  --tenant <tenant-id-or-common-or-consumers>
  --client-id <app-client-id>
  --token <access-token>
  --scopes "User.Read Notes.Read offline_access"
  --json
  --quiet
  --help

Config file:
  onenote.config.json
`.trim());
}

function parseCli(argv, defaults = {}) {
  const scopes =
    Array.isArray(defaults.scopes)
      ? defaults.scopes
      : typeof defaults.scopes === "string"
        ? defaults.scopes.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
        : null;

  const args = {
    command: "export",
    subject: null,
    resourceId: null,
    out: defaults.out ? path.resolve(process.cwd(), defaults.out) : DEFAULT_OUT_DIR,
    scopes,
    tenant: process.env.ONENOTE_TENANT_ID || process.env.MS_TENANT_ID || defaults.tenant || "common",
    clientId: process.env.ONENOTE_CLIENT_ID || process.env.MS_CLIENT_ID || defaults.clientId || "",
    token: process.env.ONENOTE_ACCESS_TOKEN || process.env.GRAPH_ACCESS_TOKEN || defaults.token || "",
    quiet: false,
    json: false,
    help: false,
  };

  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === "--help" || current === "-h") {
      args.help = true;
      continue;
    }
    if (current === "--json") {
      args.json = true;
      continue;
    }
    if (current === "--quiet") {
      args.quiet = true;
      continue;
    }
    if (current === "--out" && next) {
      args.out = path.resolve(process.cwd(), next);
      i += 1;
      continue;
    }
    if (current === "--tenant" && next) {
      args.tenant = next;
      i += 1;
      continue;
    }
    if (current === "--client-id" && next) {
      args.clientId = next;
      i += 1;
      continue;
    }
    if (current === "--token" && next) {
      args.token = next;
      i += 1;
      continue;
    }
    if (current === "--scopes" && next) {
      args.scopes = next
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }

    positionals.push(current);
  }

  if (positionals.length) {
    args.command = positionals[0];
  }
  if (positionals.length > 1) {
    args.subject = positionals[1];
  }
  if (positionals.length > 2) {
    args.resourceId = positionals[2];
  }

  return args;
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

export async function run(argv = []) {
  await loadEnvFile();
  const config = await loadConfig();
  const args = parseCli(argv, getNamespaceConfig(config, "onenote"));

  if (args.help) {
    printUsage();
    return;
  }

  if (args.command === "login") {
    const token = await getAccessToken({
      token: args.token,
      tenant: args.tenant,
      clientId: args.clientId,
      scopes: args.scopes,
      quiet: args.quiet,
    });
    if (!args.quiet) {
      console.log("Login complete.");
    }
    return token;
  }

  if (args.command === "logout") {
    await clearAuthCache();
    if (!args.quiet) {
      console.log("Logged out and cleared cached session.");
    }
    return;
  }

  const token = await getAccessToken({
    token: args.token,
    tenant: args.tenant,
    clientId: args.clientId,
    scopes: args.scopes,
    quiet: args.quiet,
  });

  if (args.command === "list") {
    if (args.subject === "notebooks") {
      const notebooks = await listNotebooks(token);
      if (args.json) return printJson(notebooks);
      notebooks.forEach((notebook) => {
        console.log(`${notebook.id}\t${notebook.displayName}`);
      });
      return;
    }

    if (args.subject === "sections") {
      if (!args.resourceId) throw new Error("Missing notebookId for list sections.");
      const sections = await listNotebookSections(token, args.resourceId);
      if (args.json) return printJson(sections);
      sections.forEach((section) => {
        console.log(`${section.id}\t${section.displayName}`);
      });
      return;
    }

    if (args.subject === "pages") {
      if (!args.resourceId) throw new Error("Missing sectionId for list pages.");
      const pages = await listSectionPages(token, args.resourceId);
      if (args.json) return printJson(pages);
      pages.forEach((page) => {
        console.log(`${page.id}\t${page.title}`);
      });
      return;
    }

    throw new Error("Usage: list notebooks | sections <notebookId> | pages <sectionId>");
  }

  if (args.command === "fetch") {
    if (args.subject === "notebook") {
      if (!args.resourceId) throw new Error("Missing notebookId for fetch notebook.");
      return printJson(await fetchNotebookDetails(token, args.resourceId));
    }
    if (args.subject === "section") {
      if (!args.resourceId) throw new Error("Missing sectionId for fetch section.");
      return printJson(await fetchSectionDetails(token, args.resourceId));
    }
    if (args.subject === "page") {
      if (!args.resourceId) throw new Error("Missing pageId for fetch page.");
      return printJson(await fetchPageDetails(token, args.resourceId));
    }

    throw new Error("Usage: fetch notebook <notebookId> | section <sectionId> | page <pageId>");
  }

  if (args.command === "export") {
    await ensureDir(args.out);
    if (!args.quiet) {
      console.log("Starting Microsoft OneNote export...");
    }

    const notebooks = await listNotebooks(token);
    const selectedNotebooks =
      args.subject === "notebook" && args.resourceId
        ? notebooks.filter((notebook) => notebook.id === args.resourceId)
        : notebooks;

    if (args.subject === "notebook" && args.resourceId && !selectedNotebooks.length) {
      throw new Error(`Notebook not found: ${args.resourceId}`);
    }

    if (!args.quiet) {
      console.log(`Found ${selectedNotebooks.length} notebooks. Fetching sections and pages...`);
    }

    const summary = {
      exportedAt: new Date().toISOString(),
      notebookCount: selectedNotebooks.length,
      pageCount: 0,
      notebooks: [],
    };

    for (const notebook of selectedNotebooks) {
      const result = await exportNotebookTree({
        token,
        notebook,
        outDir: args.out,
        quiet: args.quiet,
      });

      summary.pageCount += result.pageCount;
      summary.notebooks.push({
        id: notebook.id,
        displayName: notebook.displayName,
        isDefault: notebook.isDefault,
        pageCount: result.pageCount,
        path: path.relative(args.out, result.notebookDir),
      });
    }

    await writeJson(path.join(args.out, "export-summary.json"), summary);

    console.log(`Exported ${summary.notebookCount} notebooks and ${summary.pageCount} pages to ${args.out}`);
    return;
  }

  throw new Error("Unknown command. Use onenote login, logout, list, fetch, export, or --help.");
}
