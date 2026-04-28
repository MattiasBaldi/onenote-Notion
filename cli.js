#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { run as runOnenote } from "./src/services/onenote/index.js";
import { run as runSync } from "./src/core/index.js";
import { loadConfig, getOrchestrationConfig } from "./src/lib/config-loader.js";
import { loadEnvFile } from "./src/services/onenote/auth.js";

// Simple flag parser
function parseFlags(args) {
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("-")) {
      const isLong = arg.startsWith("--");
      const key = isLong ? arg.slice(2) : arg.slice(1);

      // Flags that take values
      if (["profile", "p"].includes(key) && i + 1 < args.length && !args[i + 1].startsWith("-")) {
        flags[key === "p" ? "profile" : key] = args[++i];
      } else {
        // Boolean flags
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

function showHelp() {
  console.log(`
o2n – OneNote to Notion Sync

Usage:
  o2n <command> [options]

Commands:
  auth login              Sign in to Microsoft OneNote
  auth logout             Sign out and clear session

  list notebooks          List all notebooks
  list sections <id>      List sections in a notebook
  list pages <id>         List pages in a section

  sync preview            Preview pages matching your config
  sync plan               Generate an AI sync plan
  sync apply              Execute the sync

  config                  Show active configuration

Flags:
  -p, --profile <name>    Use a specific sync profile (default: work)
  -y, --yes               Skip confirmation prompts
  -j, --json              Output as JSON
  -v, --verbose           Detailed output
  -h, --help              Show this message

Examples:
  o2n auth login
  o2n list notebooks
  o2n sync preview --profile personal
  o2n sync apply -y
  o2n list notebooks --json
`.trim());
}

export async function run(argv = process.argv.slice(2)) {
  await loadEnvFile();
  const config = await loadConfig();
  const orchestration = getOrchestrationConfig(config);

  const { flags, positional } = parseFlags(argv);
  const [command, subcommand, ...rest] = positional;

  if (!command || flags.h || flags.help) {
    showHelp();
    return;
  }

  // Reconstruct args with flags for downstream services
  const reconstructedArgs = [
    command,
    ...(subcommand ? [subcommand] : []),
    ...rest,
    ...(flags.profile ? ["--profile", flags.profile] : []),
    ...(flags.p ? ["--profile", flags.p] : []),
    ...(flags.yes || flags.y ? ["--yes"] : []),
    ...(flags.json || flags.j ? ["--json"] : []),
    ...(flags.verbose || flags.v ? ["--verbose"] : []),
  ];

  // Action-based routing
  switch (command) {
    case "auth":
      return runOnenote([subcommand, ...rest]);
    case "list":
      return runOnenote(["list", subcommand, ...rest, ...(flags.json || flags.j ? ["--json"] : [])]);
    case "sync":
      return runSync(reconstructedArgs.slice(1));
    case "config":
      return runSync(["debug", "config", ...rest]);

    // Legacy/Internal compatibility
    case "onenote":
      return runOnenote([subcommand, ...rest]);
    case "notion":
      const { run: runNotion } = await import("./src/services/notion/index.js");
      return runNotion([subcommand, ...rest]);

    default:
      console.error(`Unknown command: ${command}. Run with --help for usage.`);
      process.exit(1);
  }
}

const mainPath = process.argv[1] ? (process.argv[1].startsWith("/") ? process.argv[1] : fileURLToPath(new URL(process.argv[1], `file://${process.cwd()}/`))) : null;
const currentPath = fileURLToPath(import.meta.url);

if (mainPath === currentPath) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
