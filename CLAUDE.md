## Design System
Always read docs/DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Work Logging

After every significant work session, a Stop hook auto-appends to `.claude/work-logs/session-log.md`.

Log format follows [next-milestone skill](~/.claude/skills/next-milestone/SKILL.md) convention:
- Work-log dir: `.claude/work-logs/`
- Completed milestone summaries: `.claude/work-logs/YYYY-MM-DD-milestone-N-<slug>.md`
- Lessons learned: `.claude/work-logs/LESSONS_LEARNED.md`

Rules:
- Stop hook logs git commits (last 8h) automatically — no action needed for routine work
- For milestone completion: invoke `/next-milestone` — creates full work-log + next branch
- Do NOT skip worklog on non-commit sessions (design decisions, investigation findings) — write a brief note manually to `.claude/work-logs/session-log.md`
- Entry format: date, project, session ID, commits, key decisions

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
