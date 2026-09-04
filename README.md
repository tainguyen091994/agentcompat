# agentcompat

Which agent extension features actually work on which agent.

Your `SKILL.md` sets `model: opus`. On Claude Code that switches the model. On Grok Build the field parses fine, does nothing at all, and nobody tells you. Your `allowed-tools` list pre-approves tools on one agent and grants nothing on the other, which is a security difference, not a cosmetic one.

Spec linters cannot catch this. The file is valid. It just does not do what you think on the agent someone else is running.

```bash
npx agentcompat lint .
```

```
.claude/skills/demo/SKILL.md
     4  ignored     `model` on Grok Build
        Accepted by the parser and never applied. The session model is used instead, with no warning.
     5  ignored     `allowed-tools` on Grok Build
        Parsed, but it neither grants nor restricts tools. A skill relying on it for a permission grant silently gets nothing.

.claude/hooks/start.sh
     2  unsupported `CLAUDE_PROJECT_DIR` on Grok Build
        Not set. The nearest equivalent carries a GROK_ prefix, so a hook written for one agent reads an empty value on the other.
```

## Usage

```bash
agentcompat lint .                    # warn where this project relies on ignored behaviour
agentcompat lint . --agent grok-build # only care about one agent
agentcompat lint . --json             # machine-readable
agentcompat table                     # print the matrix as markdown
agentcompat missing                   # every cell nobody has verified
agentcompat agents                    # the agents being tracked
agentcompat check                     # validate the data files
```

`lint` exits 1 when it finds something an agent silently ignores, so it can gate a pull request.

## The matrix

<!-- agentcompat:table:start -->

| Value | Means |
|---|---|
| `yes` | Works as documented |
| `no` | Not implemented. The agent errors, or there is no equivalent |
| `partial` | Works, but not fully or not the same way. See the note |
| `ignored` | Accepted without complaint and then does nothing. No error, no warning |
| `?` | Nobody has checked yet |

### discovery

| Feature | Claude Code | Grok Build | Cursor | Codex CLI | Gemini CLI |
|---|---|---|---|---|---|
| `AGENTS.md` | ? | ? | ? | ? | ? |
| `.claude/ extensions` | yes | yes | ? | ? | ? |
| `CLAUDE.md` | yes | yes | ? | ? | ? |
| `.claude/rules/` | yes | yes | ? | ? | ? |

- `.claude/ extensions` on Claude Code: Its own directory. ([evidence](https://code.claude.com/docs/en/memory))
- `.claude/ extensions` on Grok Build: Auto-discovers Claude Code marketplaces, plugins, skills, MCP servers, agents and hooks with zero configuration. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `CLAUDE.md` on Grok Build: Read alongside Grok's own files, with no configuration. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))

### hook-environment

| Feature | Claude Code | Grok Build | Cursor | Codex CLI | Gemini CLI |
|---|---|---|---|---|---|
| `CLAUDE_EFFORT` | yes | ? | ? | ? | ? |
| `CLAUDE_PLUGIN_DATA` | yes | no | ? | ? | ? |
| `CLAUDE_PLUGIN_ROOT` | yes | no | ? | ? | ? |
| `CLAUDE_PROJECT_DIR` | yes | no | ? | ? | ? |
| `GROK_HOOK_EVENT` | no | yes | ? | ? | ? |
| `GROK_HOOK_NAME` | no | yes | ? | ? | ? |
| `GROK_PLUGIN_DATA` | no | yes | ? | ? | ? |
| `GROK_PLUGIN_ROOT` | no | yes | ? | ? | ? |
| `GROK_SESSION_ID` | no | yes | ? | ? | ? |
| `GROK_WORKSPACE_ROOT` | no | yes | ? | ? | ? |

- `CLAUDE_PLUGIN_DATA` on Grok Build: Not set. The nearest equivalent carries a GROK_ prefix, so a hook written for one agent reads an empty value on the other. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `CLAUDE_PLUGIN_ROOT` on Grok Build: Not set. The nearest equivalent carries a GROK_ prefix, so a hook written for one agent reads an empty value on the other. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `CLAUDE_PROJECT_DIR` on Grok Build: Not set. The nearest equivalent carries a GROK_ prefix, so a hook written for one agent reads an empty value on the other. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `GROK_HOOK_EVENT` on Claude Code: Not in the documented environment. Claude Code passes the same information as JSON on stdin instead. ([evidence](https://code.claude.com/docs/en/hooks))
- `GROK_HOOK_NAME` on Claude Code: Not in the documented environment. Claude Code passes the same information as JSON on stdin instead. ([evidence](https://code.claude.com/docs/en/hooks))
- `GROK_PLUGIN_DATA` on Claude Code: Not in the documented environment. Claude Code passes the same information as JSON on stdin instead. ([evidence](https://code.claude.com/docs/en/hooks))
- `GROK_PLUGIN_ROOT` on Claude Code: Not in the documented environment. Claude Code passes the same information as JSON on stdin instead. ([evidence](https://code.claude.com/docs/en/hooks))
- `GROK_SESSION_ID` on Claude Code: Not in the documented environment. Claude Code passes the same information as JSON on stdin instead. ([evidence](https://code.claude.com/docs/en/hooks))
- `GROK_WORKSPACE_ROOT` on Claude Code: Not in the documented environment. Claude Code passes the same information as JSON on stdin instead. ([evidence](https://code.claude.com/docs/en/hooks))

### hook-input

| Feature | Claude Code | Grok Build | Cursor | Codex CLI | Gemini CLI |
|---|---|---|---|---|---|
| `JSON payload on stdin` | yes | ? | ? | ? | ? |

- `JSON payload on stdin` on Claude Code: Every command hook receives a JSON object on stdin with session_id, cwd, hook_event_name, tool_name and tool_input. ([evidence](https://code.claude.com/docs/en/hooks))

### marketplace

| Feature | Claude Code | Grok Build | Cursor | Codex CLI | Gemini CLI |
|---|---|---|---|---|---|
| `source commit pinning` | ? | yes | ? | ? | ? |

- `source commit pinning` on Grok Build: The official marketplace requires a pinned commit SHA for remote sources. ([evidence](https://github.com/xai-org/plugin-marketplace))

### skill-frontmatter

| Feature | Claude Code | Grok Build | Cursor | Codex CLI | Gemini CLI |
|---|---|---|---|---|---|
| `agent` | yes | ? | ? | ? | ? |
| `allowed-tools` | yes | ignored | ? | ? | ? |
| `argument-hint` | yes | yes | ? | ? | ? |
| `arguments` | yes | ? | ? | ? | ? |
| `background` | yes | ? | ? | ? | ? |
| `compatibility` | ignored | ignored | ? | ? | ? |
| `context` | yes | ? | ? | ? | ? |
| `description` | yes | yes | ? | ? | ? |
| `disable-model-invocation` | yes | yes | ? | ? | ? |
| `disallowed-tools` | yes | ? | ? | ? | ? |
| `effort` | yes | ignored | ? | ? | ? |
| `hooks` | yes | ? | ? | ? | ? |
| `license` | ignored | ignored | ? | ? | ? |
| `metadata` | partial | partial | ? | ? | ? |
| `model` | yes | ignored | ? | ? | ? |
| `name` | yes | yes | ? | ? | ? |
| `paths` | yes | yes | ? | ? | ? |
| `shell` | yes | ? | ? | ? | ? |
| `user-invocable` | yes | partial | ? | ? | ? |
| `when_to_use` | yes | yes | ? | ? | ? |

- `allowed-tools` on Claude Code: Pre-approves the listed tools for the turn that invokes the skill. ([evidence](https://code.claude.com/docs/en/skills))
- `allowed-tools` on Grok Build: Parsed, but it neither grants nor restricts tools. A skill relying on it for a permission grant silently gets nothing. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `compatibility` on Claude Code: Accepted, capped at 500 characters, and never acted on. ([evidence](https://code.claude.com/docs/en/skills))
- `compatibility` on Grok Build: Accepted and never applied. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `effort` on Claude Code: Overrides the session effort level. ([evidence](https://code.claude.com/docs/en/skills))
- `effort` on Grok Build: Accepted and never applied. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `license` on Claude Code: Accepted, and the documentation states Claude Code does not act on it. ([evidence](https://code.claude.com/docs/en/skills))
- `license` on Grok Build: Accepted and never applied. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `metadata` on Claude Code: Stored for your own tooling to read. Claude Code does not act on the contents and drops a value that is not a map. ([evidence](https://code.claude.com/docs/en/skills))
- `metadata` on Grok Build: Reads author and short-description out of it. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `model` on Claude Code: Overrides the model for the rest of the turn. ([evidence](https://code.claude.com/docs/en/skills))
- `model` on Grok Build: Accepted by the parser and never applied. The session model is used instead, with no warning. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))
- `user-invocable` on Grok Build: Only the literal value true counts. Other truthy values are not recognised. ([evidence](https://docs.x.ai/build/features/skills-plugins-marketplaces))

60 of 180 cells are filled in (33%). Every `?` is an open question, and filling one in is a pull request.

<!-- agentcompat:table:end -->

## Filling in a `?`

Most of this table is unknown, and that is the honest state of it. Nobody has systematically checked Cursor, Codex, or Gemini CLI, and doing so is the entire project.

One cell is one small pull request. Edit the `support` block for your agent in `data/features/<id>.yml`:

```yaml
  cursor:
    status: ignored
    note: "Accepted by the parser and never applied."
    evidence: https://docs.cursor.com/some/page
    checked: 2026-09-04
    method: tested
```

Rules the validator enforces, so you cannot get them wrong quietly:

- Any status other than `unknown` needs `evidence`, a URL somebody can open.
- `partial`, `ignored`, and `unsupported` need a `note` saying what actually happens.
- `checked` is the date you confirmed it, because these agents change monthly.
- `method` is `docs`, `tested`, or `source`. `tested` beats `docs`, since documentation is often behind.

Run `agentcompat missing` for the full list of open cells, or read [CONTRIBUTING.md](CONTRIBUTING.md).

## Why `ignored` is its own status

Most compatibility tables have yes and no. The interesting failure here is neither.

An agent that rejects an unknown field teaches you something immediately. An agent that accepts it and does nothing teaches you nothing, and your skill quietly behaves differently for every user on the other agent. Four fields already behave this way, and the count will grow as each vendor extends the format.

That is why the status exists, and why `lint` exits 1 only for `ignored`.

## Adding an agent

Add an entry to `data/agents.yml` and every feature gains a `?` for it. Nothing else needs editing, and no feature file has to be touched:

```yaml
- id: windsurf
  name: Windsurf
  vendor: Codeium
  docs: https://docs.windsurf.com
```

## Related

- [agentguard](https://github.com/tainguyen091994/agentguard) asks whether an extension is safe. This asks whether it works the same everywhere.
- [Agent Skills](https://agentskills.io) is the shared spec several of these agents follow, and the reason fields like `license` and `compatibility` appear in agents that ignore them.

## What this is not

It is not a test suite. Every claim here comes from documentation or from someone running the thing and writing down what happened. Documentation lies, versions move, and a cell marked `checked: 2026-09-04` may already be wrong. The `checked` date and the `evidence` link are there so you can see how much to trust a row.

## License

Apache-2.0
