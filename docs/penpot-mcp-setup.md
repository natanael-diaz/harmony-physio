# Penpot MCP — Setup Guide

How to connect Claude Code to Penpot via `@penpot/mcp`.

> **Read this first:** the configuration that looks obvious — and that the package
> README implies — does not work. See [Why the obvious config fails](#why-the-obvious-config-fails).

---

## TL;DR

Penpot MCP is an **HTTP server you run yourself**, not a stdio server Claude Code
can spawn. Three steps:

1. Start the **server** (port 4401) — this is what Claude Code talks to.
2. Start the **plugin** (port 4400) and install it into Penpot — this is what
   reaches your actual designs. Without it, `execute_code` fails.
3. Point `.mcp.json` at the server over HTTP.

```jsonc
// .mcp.json
{
  "mcpServers": {
    "penpot": {
      "type": "http",
      "url": "http://127.0.0.1:4401/mcp"
    }
  }
}
```

---

## Why the obvious config fails

The natural thing to write is a stdio entry:

```jsonc
// ✗ DOES NOT WORK
{
  "mcpServers": {
    "penpot": {
      "command": "npx",
      "args": ["-y", "@penpot/mcp@latest"],
      "env": { "PENPOT_API_TOKEN": "..." }
    }
  }
}
```

`npx -y @penpot/mcp@latest` is **not** a stdio MCP server. It runs:

```
pnpm -r install && pnpm run build && pnpm run start
```

That builds a workspace and launches an **HTTP** server. Claude Code spawns it
expecting JSON-RPC on stdout, receives pnpm build logs instead, and drops the
connection:

```
Failed to reconnect to penpot: CONNECTION_CLOSED
```

The server announces its real endpoint on startup:

```
Modern Streamable HTTP endpoint: http://127.0.0.1:4401/mcp
Legacy SSE endpoint:             http://127.0.0.1:4401/sse
```

So the transport must be `http`, and the server must already be running.

---

## Architecture

Three moving parts. Getting only the first one running is a common half-broken
state — Claude Code connects happily but cannot see any design.

```
Claude Code  --HTTP :4401-->  MCP server  <--WebSocket :4402-->  Plugin (in your browser)
                                                                      ^
                                                    installed from :4400/manifest.json
```

| Component | Port | Serves | Needed for |
|-----------|------|--------|-----------|
| MCP server | 4401 | Streamable HTTP MCP endpoint | Claude Code connection |
| Plugin bridge | 4402 | WebSocket, started by the server | Server ↔ plugin link |
| Plugin dev server | 4400 | `manifest.json`, `plugin.js` | Installing the plugin into Penpot |

Which tools work without the plugin connected:

| Tool | Needs plugin? |
|------|---------------|
| `high_level_overview` | No |
| `penpot_api_info` | No |
| `execute_code` | **Yes** |
| `export_shape` | **Yes** |
| `import_image` | **Yes** |

If the plugin is not connected, design tools fail with:

```
No Penpot plugin instances are currently connected.
Please ensure the plugin is running and connected.
```

That is an **application-level** error, not a transport problem — it proves the
MCP connection itself is healthy.

---

## Prerequisites

- Node.js >= 20, `pnpm` >= 9
- A Penpot account on <https://design.penpot.app> (or your self-hosted instance)

## 1. Get a Penpot API token

Penpot → **Profile → Settings → Access tokens → Generate new token**.
Copy it immediately; it is shown only once.

## 2. Store the token

`.mcp.json` is gitignored in this repo, so it is a safe place for the token.
Keep it out of anything tracked by git.

> **Never paste the token as a literal shell argument** — it lands in
> `~/.zsh_history` in plaintext. Read it from the file instead (see step 3).

## 3. Start the server

Start the server as its **own process**, rather than via the bundled
`npx @penpot/mcp` stack — that stack runs server and plugin under one parallel
runner, where either crashing kills both. See [Known pitfalls](#known-pitfalls).
The plugin is started separately in step 4.

Locate the installed server (the npx cache hash varies per machine):

```bash
SRV=$(find ~/.npm/_npx -type f -path '*@penpot/mcp/packages/server/dist/index.js' \
      2>/dev/null | head -1 | xargs -r dirname | xargs -r dirname)
echo "$SRV"
```

> Match on `dist/index.js`, not on the directory name. npx often holds **several**
> `@penpot/mcp` cache entries and most are unbuilt — matching the directory alone
> will happily return one with no `dist/`, and the server then fails to start.

If that returns nothing, prime the cache once — let it build, then `Ctrl-C`:

```bash
npx -y @penpot/mcp@latest
```

Then start it, reading the token from `.mcp.json` so it never touches your shell history:

```bash
SRV=$(find ~/.npm/_npx -type f -path '*@penpot/mcp/packages/server/dist/index.js' \
      2>/dev/null | head -1 | xargs -r dirname | xargs -r dirname)
TOKEN=$(python3 -c "import json;print(json.load(open('.mcp.json'))['mcpServers']['penpot']['env']['PENPOT_API_TOKEN'])")

cd "$SRV"
PENPOT_MCP_SERVER_HOST=127.0.0.1 \
PENPOT_BASEURL=https://design.penpot.app \
PENPOT_API_TOKEN="$TOKEN" \
nohup node dist/index.js > /tmp/penpot-mcp.log 2>&1 &
```

Confirm it came up:

```bash
tail -5 /tmp/penpot-mcp.log
```

## 4. Start the plugin server

Required for `execute_code`, `export_shape` and `import_image`. Bind it to IPv4
to avoid the `::1:4400` conflict:

```bash
PLG=$(dirname "$SRV")/plugin
cd "$PLG"
PENPOT_MCP_PLUGIN_SERVER_HOST=127.0.0.1 \
WS_URI=http://127.0.0.1:4402 \
nohup npx vite build --watch --config vite.config.ts > /tmp/penpot-plugin.log 2>&1 &
```

Verify the manifest is being served:

```bash
curl -s http://127.0.0.1:4400/manifest.json
```

## 5. Install the plugin into Penpot

This step is manual and cannot be scripted — it happens in your browser.

1. Open your design at <https://design.penpot.app>.
2. Open the plugin manager (**Ctrl/Cmd + Alt + P**).
3. Enter the manifest URL:

   ```
   http://127.0.0.1:4400/manifest.json
   ```

4. Install, then launch **Penpot MCP Plugin** with the design file open.

The plugin connects back to the server over `ws://127.0.0.1:4402`. It must stay
open — closing the file or the plugin panel drops the bridge, and design tools
start failing again.

## 6. Configure `.mcp.json`

```jsonc
{
  "mcpServers": {
    "penpot": {
      "type": "http",
      "url": "http://127.0.0.1:4401/mcp",
      "env": {
        "PENPOT_BASEURL": "https://design.penpot.app",
        "PENPOT_API_TOKEN": "<your-token>"
      }
    }
  }
}
```

`env` is **ignored** for `http` transport — the running server owns those values.
It is kept here only so the token has one canonical home for restarts.

## 7. Connect

Run `/mcp` in Claude Code. No restart needed. Expect:

```
Reconnected to penpot.
```

Five tools become available: `high_level_overview`, `penpot_api_info`,
`execute_code`, `export_shape`, `import_image`.

Sanity-check the full path with a tool that needs the plugin:

```
execute_code:  return penpotUtils.getPages();
```

If that returns your pages, everything is wired. If it reports no plugin
instances connected, the MCP link is fine but steps 4-5 are incomplete.

Call `high_level_overview` first — the server's own instructions ask for it
before any other Penpot work.

---

## Verify manually

If `/mcp` fails, test the endpoint directly. A healthy server returns HTTP 200
and an `mcp-session-id` header:

```bash
curl -s -i --max-time 8 -X POST http://127.0.0.1:4401/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1.0"}}}'
```

Both headers are required. A bare `GET` returns
`Not Acceptable: Client must accept text/event-stream` — that is **normal** and
is *not* evidence the server wants the `sse` transport. Streamable HTTP servers
emit it too. Use `type: http`.

---

## Ports

| Port | Purpose | Notes |
|------|---------|-------|
| 4401 | Streamable HTTP MCP endpoint | The only one Claude Code needs |
| 4402 | WebSocket plugin bridge | Started by the server |
| 4403 | REPL interface | Started by the server |
| 4400 | Plugin vite dev server | **Only** in the full `npx` stack; source of conflicts |

---

## Known pitfalls

### Use `127.0.0.1`, never `[::1]` or `localhost`

`PENPOT_MCP_SERVER_HOST=127.0.0.1` binds **IPv4 only**:

```
LISTEN  127.0.0.1:4401     <- no [::1] listener
```

`/etc/hosts` maps `localhost` to both `127.0.0.1` and `::1`, so `localhost` is a
coin flip that intermittently resolves to IPv6 and fails. A `[::1]` URL fails
every time. Always use the IPv4 literal.

### The full `npx` stack is fragile — start the two parts separately

`npx -y @penpot/mcp@latest` ends in `pnpm -r --parallel run start`, launching the
plugin *and* the server together. The plugin binds `::1:4400` by default. If
anything already holds that port, the plugin dies — and pnpm's parallel runner
takes the **server down with it**:

```
Error: listen EADDRINUSE: address already in use ::1:4400
packages/plugin start: Failed
packages/server start: Failed
```

One crashed child kills both. Starting server and plugin as independent
processes (as in step 3) isolates that failure, and setting
`PENPOT_MCP_PLUGIN_SERVER_HOST=127.0.0.1` avoids the IPv6 bind that causes the
conflict in the first place.

> **Do not "fix" this by skipping the plugin.** Running only the server looks
> like it works — Claude Code connects, `/mcp` reports success, and
> `penpot_api_info` responds — but every design tool fails, because the plugin is
> the only path to your actual Penpot file.

### Orphaned watchers squat on port 4400

A crashed `npx` run can leave a `vite build --watch` orphan holding `::1:4400`
indefinitely, blocking every later start. Inspect what is listening, then kill
that exact PID:

```bash
ss -tlnp | grep -E ':(4400|4401|4402|4403)\b'          # see the squatter
PID=$(ss -tlnp | grep ':4400 ' | grep -oP 'pid=\K[0-9]+')
ps -o pid,etime,cmd -p "$PID"                          # confirm before killing
kill "$PID"
```

> Do **not** use `pkill -f '@penpot/mcp.*vite'`. `pkill -f` matches against full
> command lines, so it also matches any shell whose command line happens to
> contain that pattern — including the terminal you typed it in. Always resolve
> the PID from the port and confirm with `ps` first.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `CONNECTION_CLOSED` | `.mcp.json` uses stdio (`command`/`args`) | Switch to `type: http` |
| `ConnectionRefused` | Server not running | Start it (step 3) |
| `EADDRINUSE ::1:4400` | Orphaned plugin watcher | Kill the PID on 4400 ([details](#orphaned-watchers-squat-on-port-4400)) |
| Connects, no tools | Bad or expired API token | Regenerate in Penpot, restart server |
| Works then dies | Ran the full `npx` stack; plugin crash | Start server and plugin separately |
| `No Penpot plugin instances are currently connected` | Plugin not running or not open in Penpot | Steps 4-5; keep the plugin panel open |

### Config precedence

Claude Code reads MCP servers from **`.mcp.json`** (project root), not from
`.claude/settings.json`. An `mcpServers` block in `.claude/settings.json` is
silently ignored — a genuinely confusing failure mode, since the file looks
authoritative. If penpot config changes appear to have no effect, check you are
editing the right file.

---

## Persistence

The server is a plain background process and **does not survive a reboot**.
Re-run step 3 after restarting, or install a systemd user unit:

```ini
# ~/.config/systemd/user/penpot-mcp.service
[Unit]
Description=Penpot MCP Server
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/.npm/_npx/<hash>/node_modules/@penpot/mcp/packages/server
Environment=PENPOT_MCP_SERVER_HOST=127.0.0.1
Environment=PENPOT_BASEURL=https://design.penpot.app
EnvironmentFile=%h/.config/penpot-mcp.env
ExecStart=/usr/bin/env node dist/index.js
Restart=on-failure

[Install]
WantedBy=default.target
```

Put `PENPOT_API_TOKEN=<token>` in `~/.config/penpot-mcp.env` with mode `600`, so
the token stays out of the unit file. Fill in `<hash>` from the `find` in step 3,
then:

```bash
systemctl --user daemon-reload
systemctl --user enable --now penpot-mcp
```

> The npx cache path contains a content hash that changes when the package
> updates. If the unit fails after a Penpot MCP upgrade, re-run the `find` and
> update `WorkingDirectory`.

---

## Security notes

- `.mcp.json` is gitignored — verify with `git check-ignore -v .mcp.json` before
  committing anything nearby.
- The token grants full API access to your Penpot account. Rotate it if it ever
  reaches shell history, a log, or a tracked file.
- Keep the server bound to `127.0.0.1`. Binding to `0.0.0.0` exposes an
  unauthenticated `execute_code` tool to your whole network.
