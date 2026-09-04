export { loadDataset, bundledDataDir, validateFeature, statusOf, coverage } from "./data.js";
export { lint, readFrontmatter } from "./lint.js";
export { renderTable, renderMissing, injectTable, TABLE_START, TABLE_END } from "./table.js";
export type {
  Agent,
  Cell,
  Dataset,
  Detect,
  Feature,
  Method,
  Status,
  Support,
} from "./types.js";
export type { Warning, LintOptions } from "./lint.js";
export type { Coverage } from "./data.js";
