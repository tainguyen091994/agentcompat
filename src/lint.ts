import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import { statusOf } from "./data.js";
import type { Dataset, Feature, Status } from "./types.js";

export interface Warning {
  file: string;
  line: number;
  featureId: string;
  /** The literal key or variable found in the file. */
  found: string;
  agentId: string;
  status: Status;
  note?: string;
  evidence?: string;
}

export interface LintOptions {
  /** Only warn about these agents. Defaults to every agent in the dataset. */
  agents?: string[];
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  "coverage",
]);

const EXTENSION_DIRS = [".claude", ".grok", ".cursor", ".codex", "skills", "plugins", "hooks"];
const MAX_BYTES = 512 * 1024;

/**
 * Reads a project and reports every place where it relies on something an
 * agent silently ignores or does not support. The `ignored` status is the
 * whole reason this exists: nothing else warns you.
 */
export function lint(root: string, dataset: Dataset, options: LintOptions = {}): Warning[] {
  const agentIds = options.agents?.length
    ? options.agents
    : dataset.agents.map((agent) => agent.id);
  const warnings: Warning[] = [];

  for (const file of collectFiles(root)) {
    const content = read(file.abs);
    if (content === null) continue;

    for (const hit of detectAll(file.rel, content, dataset.features)) {
      for (const agentId of agentIds) {
        const status = statusOf(hit.feature, agentId);
        if (status === "supported" || status === "unknown") continue;
        const support = hit.feature.support[agentId];
        warnings.push({
          file: file.rel,
          line: hit.line,
          featureId: hit.feature.id,
          found: hit.found,
          agentId,
          status,
          note: support?.note,
          evidence: support?.evidence,
        });
      }
    }
  }

  return warnings.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.agentId.localeCompare(b.agentId),
  );
}

interface Hit {
  feature: Feature;
  found: string;
  line: number;
}

function detectAll(rel: string, content: string, features: Feature[]): Hit[] {
  const hits: Hit[] = [];
  const isSkill = basename(rel).toLowerCase() === "skill.md";
  const frontmatter = isSkill ? readFrontmatter(content) : null;

  for (const feature of features) {
    if (!feature.key) continue;

    if (feature.detect === "frontmatter" && frontmatter) {
      if (Object.prototype.hasOwnProperty.call(frontmatter.data, feature.key)) {
        hits.push({ feature, found: feature.key, line: lineOf(content, `${feature.key}:`) });
      }
    }

    if (feature.detect === "env" && content.includes(feature.key)) {
      hits.push({ feature, found: feature.key, line: lineOf(content, feature.key) });
    }

    if (feature.detect === "json-key" && rel.endsWith(".json")) {
      const quoted = `"${feature.key}"`;
      if (content.includes(quoted)) {
        hits.push({ feature, found: feature.key, line: lineOf(content, quoted) });
      }
    }

    if (feature.detect === "path" && matchesPath(rel, feature.key)) {
      hits.push({ feature, found: feature.key, line: 1 });
    }
  }

  return hits;
}

function matchesPath(rel: string, key: string): boolean {
  const path = rel.toLowerCase();
  const needle = key.toLowerCase();
  return path === needle || path.endsWith(`/${needle}`) || path.startsWith(`${needle}/`);
}

export function readFrontmatter(content: string): { data: Record<string, unknown> } | null {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end < 0) return null;
  try {
    const parsed = parseYaml(content.slice(content.indexOf("\n") + 1, end));
    return parsed && typeof parsed === "object"
      ? { data: parsed as Record<string, unknown> }
      : null;
  } catch {
    return null;
  }
}

function lineOf(content: string, needle: string): number {
  const index = content.indexOf(needle);
  return index < 0 ? 1 : content.slice(0, index).split("\n").length;
}

interface Found {
  abs: string;
  rel: string;
}

function collectFiles(root: string): Found[] {
  const found: Found[] = [];
  const rootStat = statSync(root);

  if (rootStat.isFile()) {
    return [{ abs: root, rel: basename(root) }];
  }

  const roots = [root, ...EXTENSION_DIRS.map((dir) => join(root, dir))];
  const seen = new Set<string>();

  for (const start of roots) {
    let stat;
    try {
      stat = statSync(start);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    walk(start, root, found, seen, start === root ? 1 : Infinity);
  }
  return found;
}

/** `depth` limits the scan of the project root to its top level. */
function walk(dir: string, root: string, out: Found[], seen: Set<string>, depth: number): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth <= 1 || SKIP_DIRS.has(entry.name)) continue;
      walk(abs, root, out, seen, depth - 1);
      continue;
    }
    if (!entry.isFile() || seen.has(abs)) continue;
    const ext = extname(entry.name).toLowerCase();
    if (![".md", ".json", ".yml", ".yaml", ".sh", ".bash", ".ps1", ".toml"].includes(ext)) continue;
    seen.add(abs);
    out.push({ abs, rel: relative(root, abs).split(sep).join("/") });
  }
}

function read(path: string): string | null {
  try {
    if (statSync(path).size > MAX_BYTES) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}
