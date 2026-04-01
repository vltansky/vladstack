# Brainstorm

Collaborative design skill that turns rough ideas into validated specs before any code is written. Asks clarifying questions one at a time, proposes approaches with trade-offs, and produces a design document for approval.

## Prerequisites

- None required (works with any project)
- Optionally enhanced by [octocode MCP](https://github.com/nicholasgriffintn/octocode) for prior art research

## Usage

Triggers automatically before creative work — creating features, building components, adding functionality, or modifying behavior.

You can also invoke it explicitly:

- "brainstorm this feature"
- "let's design this before building"
- "I want to build X" (triggers brainstorming flow)
- `/brainstorm`

## What it does

1. Explores project context (files, docs, recent commits)
2. Asks clarifying questions one at a time
3. Researches prior art from GitHub (when scope warrants it)
4. Proposes 2-3 approaches with trade-offs, a recommendation, and real-world evidence
5. Presents design in sections, getting approval after each
6. Writes a design doc and commits it
7. Self-reviews the spec for completeness
8. Waits for user approval before transitioning to implementation

## License

MIT
