/** How well an agent supports a feature. */
export type Status =
  /** Works as documented. */
  | "supported"
  /** Not implemented. The agent errors, or the feature has no equivalent. */
  | "unsupported"
  /** Works, but not fully or not the same way. See the note. */
  | "partial"
  /**
   * The dangerous one. The agent accepts the field or file without complaint
   * and then does nothing with it. No error, no warning, no effect.
   */
  | "ignored"
  /** Nobody has checked yet. Every one of these is an open contribution. */
  | "unknown";

export const STATUSES: Status[] = [
  "supported",
  "unsupported",
  "partial",
  "ignored",
  "unknown",
];

/** Where a claim came from. Docs can be wrong; a test on a real version cannot. */
export type Method = "docs" | "tested" | "source";

export interface Agent {
  id: string;
  name: string;
  vendor: string;
  docs: string;
}

export interface Support {
  status: Status;
  /** Version the claim was checked against, when known. */
  version?: string;
  /** One sentence. Required for partial, ignored, and unsupported. */
  note?: string;
  /** A URL backing the claim. Required for anything except unknown. */
  evidence?: string;
  /** ISO date the claim was last confirmed. */
  checked?: string;
  method?: Method;
}

/**
 * How `agentcompat lint` finds this feature in a real project.
 * `none` means the feature exists in the matrix but cannot be detected by
 * reading files, so lint ignores it.
 */
export type Detect = "frontmatter" | "env" | "json-key" | "path" | "none";

export interface Feature {
  id: string;
  title: string;
  /** Grouping in the rendered table, e.g. `skill-frontmatter`. */
  area: string;
  summary: string;
  detect: Detect;
  /** The literal key, variable, or path that `detect` looks for. */
  key?: string;
  spec?: string;
  support: Record<string, Support>;
  /** Set by the loader. */
  file?: string;
}

export interface Dataset {
  agents: Agent[];
  features: Feature[];
}

export interface Cell {
  feature: Feature;
  agentId: string;
  support: Support;
}

export function isKnown(status: Status): boolean {
  return status !== "unknown";
}
