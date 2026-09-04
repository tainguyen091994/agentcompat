import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { STATUSES, type Agent, type Dataset, type Feature, type Status } from "./types.js";

const DETECTS = ["frontmatter", "env", "json-key", "path", "none"];
const METHODS = ["docs", "tested", "source"];

/** The `data/` directory that ships with the package. */
export function bundledDataDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "data");
}

export function loadDataset(dataDir: string): Dataset {
  const agents = loadAgents(join(dataDir, "agents.yml"));
  const features = loadFeatures(join(dataDir, "features"), agents);
  return { agents, features };
}

function loadAgents(path: string): Agent[] {
  const agents = parseYaml(readFileSync(path, "utf8")) as Agent[];
  if (!Array.isArray(agents) || agents.length === 0) {
    throw new Error("agents.yml must be a non-empty list");
  }
  const seen = new Set<string>();
  for (const agent of agents) {
    for (const field of ["id", "name", "vendor", "docs"] as const) {
      if (!agent[field]) throw new Error(`agents.yml: an entry is missing \`${field}\``);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(agent.id)) {
      throw new Error(`agents.yml: \`${agent.id}\` must be kebab-case`);
    }
    if (seen.has(agent.id)) throw new Error(`agents.yml: duplicate id \`${agent.id}\``);
    seen.add(agent.id);
  }
  return agents;
}

function loadFeatures(dir: string, agents: Agent[]): Feature[] {
  const known = new Set(agents.map((agent) => agent.id));
  const features: Feature[] = [];

  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".yml")) continue;
    const path = join(dir, name);
    const feature = parseYaml(readFileSync(path, "utf8")) as Feature;
    validateFeature(feature, name, known);
    feature.file = path;
    features.push(feature);
  }

  const seen = new Set<string>();
  for (const feature of features) {
    if (seen.has(feature.id)) throw new Error(`duplicate feature id \`${feature.id}\``);
    seen.add(feature.id);
  }
  return features;
}

/**
 * Validation is strict on purpose. This is a data project, so the schema is
 * the only thing standing between it and a matrix nobody trusts.
 */
export function validateFeature(feature: Feature, source: string, agents: Set<string>): void {
  // Annotated on the variable, not the arrow, so TypeScript treats a call to it
  // as terminating and narrows the checks that follow.
  const bad: (message: string) => never = (message) => {
    throw new Error(`${source}: ${message}`);
  };

  if (!feature || typeof feature !== "object") bad("did not parse to an object");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(feature.id ?? "")) bad("`id` must be kebab-case");
  if (`${feature.id}.yml` !== source) bad(`file should be named ${feature.id}.yml`);
  if (!feature.title) bad("`title` is required");
  if (!feature.area) bad("`area` is required");
  if (!feature.summary) bad("`summary` is required");
  if (!DETECTS.includes(feature.detect)) {
    bad(`\`detect\` must be one of ${DETECTS.join(", ")}`);
  }
  if (feature.detect !== "none" && !feature.key) {
    bad("`key` is required unless `detect` is none");
  }
  if (!feature.support || typeof feature.support !== "object") bad("`support` is required");

  for (const [agentId, support] of Object.entries(feature.support)) {
    if (!agents.has(agentId)) bad(`unknown agent \`${agentId}\` in support`);
    if (!STATUSES.includes(support.status)) {
      bad(`${agentId}: status must be one of ${STATUSES.join(", ")}`);
    }
    if (support.status === "unknown") continue;

    if (!support.evidence) bad(`${agentId}: a claim needs \`evidence\`, a URL backing it`);
    if (!/^https?:\/\//.test(support.evidence)) bad(`${agentId}: \`evidence\` must be a URL`);
    if (!support.checked || !/^\d{4}-\d{2}-\d{2}$/.test(support.checked)) {
      bad(`${agentId}: \`checked\` must be an ISO date, e.g. 2026-09-04`);
    }
    if (support.method && !METHODS.includes(support.method)) {
      bad(`${agentId}: \`method\` must be one of ${METHODS.join(", ")}`);
    }
    if (["partial", "ignored", "unsupported"].includes(support.status) && !support.note) {
      bad(`${agentId}: status \`${support.status}\` needs a \`note\` saying what happens`);
    }
  }
}

/** Missing agents are treated as unknown, so adding an agent does not break every file. */
export function statusOf(feature: Feature, agentId: string): Status {
  return feature.support[agentId]?.status ?? "unknown";
}

export interface Coverage {
  total: number;
  known: number;
  percent: number;
  byAgent: Record<string, { known: number; total: number }>;
}

export function coverage(dataset: Dataset): Coverage {
  const byAgent: Record<string, { known: number; total: number }> = {};
  let total = 0;
  let known = 0;

  for (const agent of dataset.agents) {
    byAgent[agent.id] = { known: 0, total: 0 };
    for (const feature of dataset.features) {
      total += 1;
      byAgent[agent.id].total += 1;
      if (statusOf(feature, agent.id) !== "unknown") {
        known += 1;
        byAgent[agent.id].known += 1;
      }
    }
  }

  return { total, known, percent: total === 0 ? 0 : Math.round((known / total) * 100), byAgent };
}
