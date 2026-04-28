import { loadConfig, getSyncConfig } from "../lib/config-loader.js";
import { loadEnvFile } from "../services/onenote/auth.js";
import { applySyncPlan, buildSyncPlan, loadSourceItemsOnly, renderDebugSnapshot, renderSelectionSnapshot } from "./engine.js";

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCli(argv) {
  const args = {
    command: argv[0] || "help",
    subject: "",
    profile: "default",
    json: false,
    yes: false,
    help: false,
    source: {},
    destination: {},
    selection: {},
    limits: {},
    agent: {},
  };
  const positionals = [];

  for (let i = 1; i < argv.length; i += 1) {
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
    if (current === "--yes") {
      args.yes = true;
      continue;
    }
    if (current === "--profile" && next) {
      args.profile = next;
      i += 1;
      continue;
    }
    if (current === "--source" && next) {
      args.source.service = next;
      i += 1;
      continue;
    }
    if (current === "--destination" && next) {
      args.destination.service = next;
      i += 1;
      continue;
    }
    if (current === "--destination-parent-page" && next) {
      args.destination.parentPageId = next;
      i += 1;
      continue;
    }
    if (current === "--destination-section" && next) {
      args.destination.sectionId = next;
      i += 1;
      continue;
    }
    if (current === "--destination-database" && next) {
      args.destination.databaseId = next;
      i += 1;
      continue;
    }
    if (current === "--source-page" && next) {
      args.selection.pageIds = [...(args.selection.pageIds || []), ...parseList(next)];
      i += 1;
      continue;
    }
    if (current === "--source-section" && next) {
      args.selection.sectionIds = [...(args.selection.sectionIds || []), ...parseList(next)];
      i += 1;
      continue;
    }
    if (current === "--source-notebook" && next) {
      args.selection.notebookIds = [...(args.selection.notebookIds || []), ...parseList(next)];
      i += 1;
      continue;
    }
    if (current === "--query" && next) {
      args.selection.query = next;
      i += 1;
      continue;
    }
    if (current === "--modified-after" && next) {
      args.selection.modifiedAfter = next;
      i += 1;
      continue;
    }
    if (current === "--created-after" && next) {
      args.selection.createdAfter = next;
      i += 1;
      continue;
    }
    if (current === "--title-contains" && next) {
      args.selection.titleIncludes = [...(args.selection.titleIncludes || []), ...parseList(next)];
      i += 1;
      continue;
    }
    if (current === "--limit-pages" && next) {
      args.limits.maxPages = Number(next);
      i += 1;
      continue;
    }
    if (current === "--limit-sections" && next) {
      args.limits.maxSectionsPerNotebook = Number(next);
      i += 1;
      continue;
    }
    if (current === "--limit-notebooks" && next) {
      args.limits.maxNotebooks = Number(next);
      i += 1;
      continue;
    }
    if (current === "--max-payload-chars" && next) {
      args.limits.maxPayloadChars = Number(next);
      i += 1;
      continue;
    }
    if (current === "--model" && next) {
      args.agent.model = next;
      i += 1;
      continue;
    }
    if (current === "--prompt" && next) {
      args.agent.prompt = next;
      i += 1;
      continue;
    }
    if (current === "--source-context-query" && next) {
      args.agent.sourceContextQuery = next;
      i += 1;
      continue;
    }
    if (current === "--destination-context-query" && next) {
      args.agent.destinationContextQuery = next;
      i += 1;
      continue;
    }

    if (!current.startsWith("--")) {
      positionals.push(current);
    }
  }

  args.subject = positionals[0] || "";

  return args;
}

function mergeOverrides(args) {
  return {
    source: Object.keys(args.source || {}).length ? args.source : undefined,
    destination: Object.keys(args.destination || {}).length ? args.destination : undefined,
    selection: Object.keys(args.selection || {}).length ? args.selection : undefined,
    limits: Object.keys(args.limits || {}).length ? args.limits : undefined,
    agent: Object.keys(args.agent || {}).length ? args.agent : undefined,
  };
}

function printUsage() {
  console.log(`
Usage:
  onenote-exporter sync plan [--profile <name>]
  onenote-exporter sync preview [--profile <name>]
  onenote-exporter sync apply [--profile <name>] --yes
  onenote-exporter sync debug <config|selection|source|destination|plan>

Common flags:
  --source <onenote|notion>
  --destination <onenote|notion>
  --destination-parent-page <id>
  --destination-section <id>
  --destination-database <id>
  --source-page <id[,id]>
  --source-section <id[,id]>
  --source-notebook <id[,id]>
  --query <search query>
  --modified-after <ISO timestamp>
  --created-after <ISO timestamp>
  --title-contains <text[,text]>
  --limit-pages <n>
  --limit-sections <n>
  --limit-notebooks <n>
  --max-payload-chars <n>
  --model <langchain-model>
  --prompt <custom planner prompt>
  --source-context-query <context7 query>
  --destination-context-query <context7 query>
  --json
  --yes
  --help
`.trim());
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printPlanSummary(plan) {
  console.log(`Profile: ${plan.profileName}`);
  console.log(`Source: ${plan.source.service}`);
  console.log(`Destination: ${plan.destination.service}`);
  console.log(`Items: ${plan.itemCount}`);
  if (plan.warnings.length) {
    console.log("Warnings:");
    for (const warning of plan.warnings) {
      console.log(`- ${warning}`);
    }
  }
  for (const item of plan.items) {
    console.log(`- [${item.action}] ${item.title} -> ${item.destinationType} (${item.confidence.toFixed(2)})`);
  }
}

export async function run(argv = []) {
  await loadEnvFile();
  const config = await loadConfig();
  const args = parseCli(argv);
  const overrides = mergeOverrides(args);
  const activeProfile =
    args.profile !== "default"
      ? args.profile
      : config?.data?.sync?.defaultProfile || "default";

  if (args.help || args.command === "help" || args.command === "--help") {
    printUsage();
    return;
  }

  const syncConfig = getSyncConfig(config, args.profile);

  if (args.command === "debug") {
    const subject = args.subject || "config";
    if (subject === "config") {
      const snapshot = renderSelectionSnapshot({
        profileName: activeProfile,
        ...syncConfig,
      });
      return printJson({
        configPath: config.path,
        configPaths: config.paths || [config.path],
        ...snapshot,
      });
    }
    if (subject === "selection") {
      const snapshot = renderSelectionSnapshot({
        profileName: activeProfile,
        ...syncConfig,
        source: { ...(syncConfig.source || {}), ...(overrides.source || {}) },
        destination: { ...(syncConfig.destination || {}), ...(overrides.destination || {}) },
        selection: { ...(syncConfig.selection || {}), ...(overrides.selection || {}) },
        limits: { ...(syncConfig.limits || {}), ...(overrides.limits || {}) },
      });
      return printJson(snapshot);
    }
    if (subject === "source") {
      const sourceItems = await loadSourceItemsOnly({
        config,
        profileName: activeProfile,
        overrides,
      });
      return printJson(sourceItems);
    }
    if (subject === "destination") {
      return printJson({
        profileName: activeProfile,
        destination: syncConfig.destination,
        limits: syncConfig.limits,
        agent: syncConfig.agent,
        agents: syncConfig.agents,
      });
    }
    if (subject === "plan") {
      const plan = await buildSyncPlan({
        config,
        profileName: activeProfile,
        overrides,
      });
      return printJson(renderDebugSnapshot(plan));
    }
    throw new Error(`Unknown debug subject: ${subject}`);
  }

  if (args.command === "plan" || args.command === "preview" || args.command === "apply") {
    const plan = await buildSyncPlan({
      config,
      profileName: activeProfile,
      overrides,
    });

    if (args.command === "plan") {
      return printJson(renderDebugSnapshot(plan));
    }

    if (args.command === "preview") {
      printPlanSummary(plan);
      return;
    }

    if (!args.yes) {
      throw new Error("Refusing to apply without --yes.");
    }
    const mergedProfile = {
      ...syncConfig,
      source: { ...(syncConfig.source || {}), ...(overrides.source || {}) },
      destination: { ...(syncConfig.destination || {}), ...(overrides.destination || {}) },
      selection: { ...(syncConfig.selection || {}), ...(overrides.selection || {}) },
      limits: { ...(syncConfig.limits || {}), ...(overrides.limits || {}) },
      agent: { ...(syncConfig.agent || {}), ...(overrides.agent || {}) },
    };
    const results = await applySyncPlan(plan, {
      profile: mergedProfile,
      quiet: false,
    });
    return printJson(results);
  }

  throw new Error(`Unknown sync command: ${args.command}`);
}

// Export engine functions for tests
export { applySyncPlan, buildSyncPlan, loadSourceItemsOnly };
