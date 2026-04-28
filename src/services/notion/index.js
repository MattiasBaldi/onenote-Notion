function printUsage() {
  console.log(`
Usage:
  onenote-exporter notion <command>

Notion namespace is a scaffold for the future Notion SDK integration.
Available commands:
  --help
`.trim());
}

export async function run(argv = []) {
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    printUsage();
    return;
  }

  throw new Error(
    `Notion commands are not implemented yet. Received: ${argv.join(" ")}`,
  );
}
