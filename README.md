# ConvertPolo 3.0 — Webflow

The site itself is built in Webflow (`convertpolo-3-0`). This repo holds what Webflow cannot:
the custom GSAP animation scripts. The repo is private; Cloudflare Pages publishes `scripts/`
on every push to `main`, and Webflow loads the files from the Pages URL.

- `scripts/` — one file per custom animation (infinity sequence, circle sequence, intro loader)
- `CLAUDE.md` — build conventions for developers and Claude Code
- `.mcp.json` — connects Claude Code to the Webflow MCP server

## Setup

1. Open this folder in VS Code and start Claude Code.
2. Approve the `webflow` MCP server when prompted, then run `/mcp` and log in to Webflow.
3. In the Webflow Designer press **E** and launch **Webflow MCP Bridge App**.
