#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { bundledDataDir, coverage, loadDataset } from "./data.js";
import { lint } from "./lint.js";
import { injectTable, renderMissing, renderTable } from "./table.js";

const USAGE = `agentcompat: which agent extension features actually work on which agent

Usage:
  agentcompat lint [path]     Warn where a project relies on something an agent ignores
  agentcompat table           Print the compatibility matrix as markdown
  agentcompat missing         List every cell nobody has verified yet
  agentcompat agents          List the agents in the dataset
  agentcompat check           Validate the data files, then verify README is current

Options:
  --agent <id,id>             Limit lint to these agents
  --area <name>               Limit the table to one area
  --notes                     Include per-cell notes under each table
  --write <file>              Write the table into a file between its markers
  --json                      Machine-readable output
  --data <dir>                Use a different data directory
  -h, --help                  This text
`;

interface Options {
  command: string;
  target: string;
  agents: string[];
  area?: string;
  notes: boolean;
  write?: string;
  json: boolean;
  dataDir: string;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    command: "lint",
    target: ".",
    agents: [],
    notes: false,
    json: false,
    dataDir: bundledDataDir(),
  };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        process.stdout.write(USAGE);
        process.exit(0);
        break;
      case "--json":
        options.json = true;
        break;
      case "--notes":
        options.notes = true;
        break;
      case "--agent":
        options.agents = (argv[++i] ?? "").split(",").map((id) => id.trim()).filter(Boolean);
        break;
      case "--area":
        options.area = argv[++i];
        break;
      case "--write":
        options.write = argv[++i];
        break;
      case "--data":
        options.dataDir = resolve(argv[++i]);
        break;
      default:
        if (arg.startsWith("-")) {
          process.stderr.write(`agentcompat: unknown option ${arg}\n\n${USAGE}`);
          process.exit(2);
        }
        positional.push(arg);
    }
  }

  const commands = ["lint", "table", "missing", "agents", "check"];
  if (positional.length > 0 && commands.includes(positional[0])) {
    options.command = positional.shift()!;
  }
  if (positional.length > 0) options.target = positional[0];
  return options;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const dataset = loadDataset(options.dataDir);

  if (options.command === "agents") {
    for (const agent of dataset.agents) {
      process.stdout.write(`${agent.id.padEnd(14)} ${agent.name.padEnd(16)} ${agent.docs}\n`);
    }
    return;
  }

  if (options.command === "table") {
    const table = renderTable(dataset, { area: options.area, notes: options.notes });
    if (options.write) {
      const file = resolve(options.write);
      writeFileSync(file, injectTable(readFileSync(file, "utf8"), table), "utf8");
      process.stdout.write(`wrote the matrix into ${options.write}\n`);
      return;
    }
    process.stdout.write(`${table}\n`);
    return;
  }

  if (options.command === "missing") {
    process.stdout.write(`${renderMissing(dataset)}\n`);
    return;
  }

  if (options.command === "check") {
    // loadDataset already validated every file, so reaching here means the data is sound.
    const stats = coverage(dataset);
    process.stdout.write(
      `${dataset.features.length} features across ${dataset.agents.length} agents, ` +
        `${stats.known} of ${stats.total} cells filled in (${stats.percent}%)\n`,
    );
    if (options.write) {
      const file = resolve(options.write);
      const current = readFileSync(file, "utf8");
      const updated = injectTable(current, renderTable(dataset, { notes: true }));
      if (current !== updated) {
        process.stderr.write(
          `${options.write} is out of date. Run: agentcompat table --notes --write ${options.write}\n`,
        );
        process.exit(1);
      }
      process.stdout.write(`${options.write} is up to date\n`);
    }
    return;
  }

  const warnings = lint(resolve(options.target), dataset, { agents: options.agents });

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ warnings }, null, 2)}\n`);
  } else if (warnings.length === 0) {
    process.stdout.write("agentcompat: nothing here behaves differently across agents.\n");
  } else {
    let currentFile = "";
    for (const warning of warnings) {
      if (warning.file !== currentFile) {
        currentFile = warning.file;
        process.stdout.write(`\n${currentFile}\n`);
      }
      const agent = dataset.agents.find((a) => a.id === warning.agentId);
      process.stdout.write(
        `  ${String(warning.line).padStart(4)}  ${warning.status.padEnd(11)} ` +
          `\`${warning.found}\` on ${agent?.name ?? warning.agentId}\n`,
      );
      if (warning.note) process.stdout.write(`        ${warning.note}\n`);
    }
    const ignored = warnings.filter((warning) => warning.status === "ignored").length;
    process.stdout.write(
      `\n${warnings.length} warning(s), ${ignored} of them silently ignored at run time\n`,
    );
  }

  process.exit(warnings.some((warning) => warning.status === "ignored") ? 1 : 0);
}

try {
  main();
} catch (error) {
  process.stderr.write(`agentcompat: ${(error as Error).message}\n`);
  process.exit(2);
}
