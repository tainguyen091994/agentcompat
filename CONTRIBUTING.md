# Contributing

The data is the project. Most pull requests should fill in a `?`.

## Fill in one cell

1. `npx agentcompat missing` lists every unverified cell.
2. Pick one. Open `data/features/<feature-id>.yml`.
3. Replace the `status: unknown` block for your agent:

```yaml
  cursor:
    status: ignored
    note: "Accepted by the parser and never applied."
    evidence: https://docs.cursor.com/context/rules
    checked: 2026-09-04
    method: tested
```

4. Run `npm test`. It validates every file and checks the README table is current.
5. If the table changed, run `npm run table` and commit the result.
6. Open the pull request. One agent per pull request is ideal, one feature per pull request is fine.

## What the statuses mean

| Status | Use it when |
|---|---|
| `supported` | The feature works as documented |
| `unsupported` | The agent errors, or there is no equivalent at all |
| `partial` | It works, but not fully or not the same way. Say how in the note |
| `ignored` | The agent accepts it without complaint and does nothing. No error, no warning |
| `unknown` | Nobody has checked. The default |

`ignored` is the one that matters most. If you find one, that finding is worth more than ten `supported` rows.

## Evidence

Every claim other than `unknown` needs a URL. In order of preference:

1. **`method: tested`** with a link to a gist, a test repo, or an issue showing the run. Beats everything else, because documentation lags behind releases.
2. **`method: docs`** with a deep link to the exact page, not a docs homepage.
3. **`method: source`** with a permalink to a line of code in the agent's repository.

Put the version in the `version` field when you know it. `checked` is the date you confirmed it, not the date the feature shipped.

Do not fill in a cell from memory or from a blog post that paraphrases the docs. A wrong `supported` is worse than an honest `?`, because it stops anyone else from looking.

## Add a feature

Create `data/features/<id>.yml`. The filename must match the `id`.

```yaml
id: skill-frontmatter-icon
title: icon
area: skill-frontmatter
summary: >
  Icon shown next to the skill in a picker.
detect: frontmatter
key: icon
support:
  claude-code:
    status: unknown
  grok-build:
    status: unknown
```

`detect` tells the linter how to find the feature in a real project:

| `detect` | Looks for |
|---|---|
| `frontmatter` | A key in a `SKILL.md` YAML header |
| `env` | An environment variable name appearing in a hook script |
| `json-key` | A key in a JSON config file |
| `path` | A file or directory path |
| `none` | Nothing. The feature is in the matrix but cannot be found by reading files |

Leave every agent at `unknown` if you have not checked them. Adding the row is a contribution on its own.

## Add an agent

Add an entry to `data/agents.yml` with `id`, `name`, `vendor`, and `docs`. Every feature immediately gains a `?` for it. No feature file needs editing.

## Development

```bash
npm install
npm run build
npm test          # validate data, check the README table is current
npm run table     # regenerate the README table
node dist/cli.js lint /some/project
```

Node 20 or newer. One runtime dependency, `yaml`, and it should stay that way.

## Ground rules

Report what the agent does, not what you think of it. No vendor comparisons, no "X is better than Y" in a note. A note says what happens when the field is present, in one sentence.

By contributing you agree your work is licensed under Apache-2.0.
