import { coverage, statusOf } from "./data.js";
import type { Dataset, Status } from "./types.js";

/**
 * Words, not coloured squares or emoji. A matrix gets read in a terminal, in a
 * diff, and by screen readers, and only words survive all three.
 */
const LABEL: Record<Status, string> = {
  supported: "yes",
  unsupported: "no",
  partial: "partial",
  ignored: "ignored",
  unknown: "?",
};

export interface TableOptions {
  /** Render only this area. */
  area?: string;
  /** Include the per-cell notes section. */
  notes?: boolean;
}

export function renderTable(dataset: Dataset, options: TableOptions = {}): string {
  const areas = [...new Set(dataset.features.map((feature) => feature.area))].sort();
  const lines: string[] = [];

  lines.push(legend(), "");

  for (const area of areas) {
    if (options.area && area !== options.area) continue;
    const features = dataset.features
      .filter((feature) => feature.area === area)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (features.length === 0) continue;

    lines.push(`### ${area}`, "");
    lines.push(`| Feature | ${dataset.agents.map((agent) => agent.name).join(" | ")} |`);
    lines.push(`|---|${dataset.agents.map(() => "---").join("|")}|`);

    for (const feature of features) {
      const cells = dataset.agents.map((agent) => LABEL[statusOf(feature, agent.id)]);
      lines.push(`| \`${feature.title}\` | ${cells.join(" | ")} |`);
    }
    lines.push("");

    if (options.notes) {
      const noted = features.filter((feature) =>
        Object.values(feature.support).some((support) => support.note),
      );
      for (const feature of noted) {
        for (const [agentId, support] of Object.entries(feature.support)) {
          if (!support.note) continue;
          const agent = dataset.agents.find((a) => a.id === agentId);
          const cite = support.evidence ? ` ([evidence](${support.evidence}))` : "";
          lines.push(`- \`${feature.title}\` on ${agent?.name ?? agentId}: ${support.note}${cite}`);
        }
      }
      if (noted.length > 0) lines.push("");
    }
  }

  const stats = coverage(dataset);
  lines.push(
    `${stats.known} of ${stats.total} cells are filled in (${stats.percent}%). ` +
      `Every \`?\` is an open question, and filling one in is a pull request.`,
  );

  return lines.join("\n");
}

function legend(): string {
  return [
    "| Value | Means |",
    "|---|---|",
    "| `yes` | Works as documented |",
    "| `no` | Not implemented. The agent errors, or there is no equivalent |",
    "| `partial` | Works, but not fully or not the same way. See the note |",
    "| `ignored` | Accepted without complaint and then does nothing. No error, no warning |",
    "| `?` | Nobody has checked yet |",
  ].join("\n");
}

/** The contribution queue: every cell nobody has verified. */
export function renderMissing(dataset: Dataset): string {
  const lines: string[] = [];
  for (const feature of dataset.features) {
    const missing = dataset.agents
      .filter((agent) => statusOf(feature, agent.id) === "unknown")
      .map((agent) => agent.id);
    if (missing.length > 0) {
      lines.push(`${feature.id.padEnd(38)} ${missing.join(", ")}`);
    }
  }
  const stats = coverage(dataset);
  lines.push("", `${stats.total - stats.known} unfilled cells across ${dataset.features.length} features`);
  return lines.join("\n");
}

/** Written into README.md between the marker comments. */
export const TABLE_START = "<!-- agentcompat:table:start -->";
export const TABLE_END = "<!-- agentcompat:table:end -->";

export function injectTable(readme: string, table: string): string {
  const start = readme.indexOf(TABLE_START);
  const end = readme.indexOf(TABLE_END);
  if (start < 0 || end < 0) {
    throw new Error(`README is missing the ${TABLE_START} / ${TABLE_END} markers`);
  }
  return `${readme.slice(0, start + TABLE_START.length)}\n\n${table}\n\n${readme.slice(end)}`;
}
