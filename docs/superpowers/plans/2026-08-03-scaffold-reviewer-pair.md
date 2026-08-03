# Scaffold reviewer pair implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every scaffold inherits the rules reviewer and the security reviewer through the ket plugin's Stop hooks.

**Architecture:** Two reviewer definitions join the plugin's `agents/` directory. Two entries of type `agent` join the plugin's Stop hooks beside the turn gate, mirroring the repository's own pair with scaffold-aimed prompts and independent markers.

**Tech Stack:** Claude Code plugin hooks of type `agent`, the ket harness.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-03-scaffold-reviewer-pair-design.md`.
- Work stays on the branch `feat/scaffold-reviewer-pair`; it lands through its own pull request.
- Every commit message follows the caveman-commit skill and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `harness/**` markdown is exempt from the Microsoft Vale rules but not from the house rules: no em dash anywhere.
- The hook response contract stays the verified yes-or-no JSON answer (`ok`, `reason`) the repository's own reviewers use.

---

### Task 1: The pair enters the plugin

**Files:**

- Create: `harness/agents/rules-reviewer.md`
- Create: `harness/agents/security-reviewer.md`
- Modify: `harness/hooks/hooks.json`

- [ ] Read the repository's own pair first (`.claude/agents/rules-reviewer.md`, `.claude/agents/security-reviewer.md`, and the two Stop entries in `.claude/settings.json`) and the plugin's existing definitions under `harness/agents/` for frontmatter conventions.
- [ ] Write the plugin pair, re-aimed at a scaffold: the rules reviewer reads the scaffolded project's `CLAUDE.md` and installed skills for its rules (never ket's own); the security reviewer keeps the danger-only scope and its refusal to duplicate the rules beat. Both report and never edit. Names stay `rules-reviewer` and `security-reviewer` (the plugin scopes them).
- [ ] Add two Stop entries of type `agent` beside the turn gate, each with its own marker file name (`.git/claude-reviewed`, `.git/claude-security-reviewed`), status messages in the plugin's voice, and timeouts matching the repository's own entries.
- [ ] Validate the JSON (`bun -e` parse or equivalent) and prove each prompt the way task 9 of the remainder plan did: hand-run it against a scratch diff with a planted violation, confirm a `false` verdict names the finding, then a clean diff yields `true`. Revert every scratch.
- [ ] Scaffold proof: create a scratch project, confirm `.claude/settings.json` registers the plugin (the hooks arrive with it), and search the installed plugin cache if reachable; otherwise record that the hooks ship with the marketplace clone and the structural check suffices.
- [ ] Commit: `feat(harness): ship the reviewer pair to every scaffold`.

---

### Task 2: The chain and the pull request

- [ ] Full repository chain (`bun run lint && bun run check-types && bun run test && bun run lint:spell && bun run lint:prose`).
- [ ] Push the branch and open the pull request against main, titled `feat(harness): ship the reviewer pair to every scaffold`, body naming the spec and the verified hook contract. End the body with the standard generated-with line.

---

## Self-review notes

- Spec coverage: the pair (Task 1), the contract verification recorded in the spec itself, out of scope respected (no repository-side reviewer changes, no other hook touched).
- The markers match the repository's pair by name, which is correct: they live in the scaffolded project's own `.git`, not ket's.
