# Simulacrum devkit

A small, independent Node ESM CLI that owns a detached daemon, a development-only
Storybook server, and a dedicated Playwright Chromium instance (headless by default). It is a
local observation and UI-control tool, not yet an implementation debugger.
The implementation lives in `tools/devkit/`, with root `devkit` and `test:devkit`
Yarn scripts and an explicitly gated Storybook integration.

## Setup

Use an active Node LTS release and install the project dependencies and full Chromium:

```sh
yarn install
yarn playwright install chromium --no-shell
```

Playwright is pinned to `1.58.2` in the development dependencies. The daemon launches
headless Chromium with `channel: 'chromium'`, so it needs the **full Chromium** download,
not the separate headless-shell package. `--no-shell` skips that unused package. The
browser download requires network access; Linux may also need system libraries.
An incomplete browser download is not a working installation, even if the executable
exists. Reinstall/repair it before trying a real session.

If Google Chrome is already installed, select it explicitly instead:

```sh
SIMULACRUM_DEVKIT_BROWSER=chrome yarn devkit start
SIMULACRUM_DEVKIT_BROWSER=chrome yarn test:devkit:live
```

The only supported values are `chromium` (default) and `chrome`. Chrome uses an
isolated temporary profile, not your personal browser session. There is no automatic
fallback; installed Chrome versions can vary, unlike Playwright's pinned Chromium.

The integration is already wired:

-   `.simulacrum-dev/` is ignored by Git.
-   `.storybook` config includes `session.stories.tsx` and `storybook-plugin.ts` only
    when `SIMULACRUM_DEVKIT=1`. The daemon sets this on its owned Storybook child;
    there is no need to set it globally or start Storybook separately.
-   The plugin instruments the development host to register `bridge.ts`, exposing
    `window.__SIMULACRUM_DEVKIT__.snapshot()` without adding hooks to published source.
-   The `devkit/session` fixture opens an Editor with a small Counter model and one
    Increment counter story setup. The bridge returns compiler readiness, a per-host generation ID,
    project/build summaries, and bounded story/runtime summaries. `compilerReady`
    describes compiler-service readiness, **not** successful compilation or model correctness;
    inspect `build.state` and `build.errors` separately.

The gated fixture serves Monaco from the installed `monaco-editor/min` files instead
of its default CDN. The gated Storybook configuration also removes the inherited
library declaration plugin and disables static bundle sourcemaps to keep its build
within the tested Node heap limit. Ungated Storybook and library builds are unchanged.
This does not establish source-mapped debugger support: host instrumentation currently
returns no source map and needs attention before original-source breakpoints ship.

The bridge result is JSON-serializable, with a boolean `compilerReady` and nonempty
string `generation`. Reading it does not compile, step simulation, or mutate state.

The CLI resolves the installed `storybook` package's declared `bin.storybook`
(falling back to `@storybook/cli`), verifies the file exists, and runs it with Node.
It does not assume that `node_modules/@storybook/cli/bin/index.js` exists and does
not shell out through Yarn. The existing package manifest targets Storybook 7.

## Visible shared session

```sh
SIMULACRUM_DEVKIT_BROWSER=chrome yarn devkit start --headed
```

`--headed` opens the owned fixture in a visible browser window. You can edit and use
the UI normally; CLI snapshots, screenshots, and logs observe that same page. This
uses an isolated temporary profile, not your personal Chrome tabs. Agent actions and
human interactions affect the same page; coordinate edits rather than racing each other.

Headless remains the default. `start` and `status` report `headed: true` or `false`.
Mode is chosen at startup; stop the existing session before switching modes. Closing
the owned fixture tab triggers cleanup, or use `yarn devkit stop`. Treat fixture edits
as ephemeral; do not rely on them surviving a stop/restart. A visible session requires
a desktop display. The automated live smoke check remains headless and self-cleaning.

## Commands

Run from the repository root (paths are internally anchored to the CLI location):

```sh
yarn devkit --help
yarn devkit start
yarn devkit start --timeout 120000
yarn devkit start --headed
yarn devkit status
yarn devkit snapshot
yarn devkit screenshot
yarn devkit logs --after 0 --limit 100
yarn devkit stop
```

The underlying CLI prints one JSON value to stdout. For machine-readable output
without Yarn's command banners, use `node tools/devkit/cli.mjs <command>` directly.
Success includes `ok: true`; failure
includes `ok: false`, an `error`, and exit code 1. Startup failures include buffered
logs when available. `--help` and no arguments return JSON help. Unsupported commands,
options, duplicate options, and invalid integers fail. `--headed` is a valueless flag; other options use separate values,
not `--option=value`. There is no arbitrary eval, CSS selector, or navigation endpoint.
UI actions can mutate the modeled project and story state through existing controls.

-   **start** acquires an exclusive session lock, starts the daemon, launches Storybook
    on a randomly allocated loopback port, and opens
    `/iframe.html?id=devkit-session--default&viewMode=story`. It returns only after the
    bridge reports `compilerReady: true` and the authenticated endpoint confirms the
    daemon's `running` lifecycle phase. This is a startup observation, not a continuous
    compiler-readiness guarantee.
    The startup timeout defaults to 90 seconds (range 1–180 seconds). Failure cleanup
    can add approximately 12 seconds. Concurrent/repeated starts fail instead of replacing
    an existing session. The manifest becomes available during startup so another CLI
    can inspect logs/status or stop it.
-   **status** reports daemon lifecycle `phase`: `starting`, `running`, or `failed`
    after a post-start browser operation failed. **`running` does not mean the compiler
    is currently ready.** `readiness.live` is always `false`; `readiness.lastObservation`
    contains the latest snapshot attempt's `observedAt`, `compilerReady`, `generation`,
    and `error`. It is `null` before any attempt completes. Failed attempts record
    `compilerReady: null` and `generation: null` rather than retaining a successful
    observation. Status does not poll the browser: observations may be stale after
    reloads, HMR, or compiler changes. This keeps status/stop usable with a hung page.
    Use **snapshot** for a fresh observation. Missing session state returns `stopped`
    or `locked`. An unreachable or identity-mismatched endpoint is an error, not proof
    a recorded process is dead. This replaces the earlier ambiguous `phase: "ready"`.
-   **snapshot** returns `{ ok, session, snapshot }`; `snapshot` is the fixture's JSON
    state. It uses one fixed bridge call. The CLI never accepts executable JavaScript.
    Each call reads the bridge afresh and updates the readiness observation returned
    by subsequent status calls. `compilerReady: false` is valid snapshot data, not a
    daemon failure. Neither `ok: true` nor compiler readiness asserts that a build succeeded.
-   **screenshot** saves a 1440×1000 viewport PNG and returns its absolute `path` under
    `.simulacrum-dev/artifacts/<session>/`. Paths and names are generated by the daemon;
    callers cannot choose a destination. Artifacts persist after stop.
-   **logs** reads up to 500 bounded entries from an in-memory ring. Each has a cursor,
    timestamp, source, and text. Pass `nextCursor` as the next `--after` value.
    `truncated: true` means older entries have been evicted. Cursors are session-local,
    not reusable after restart. Default page size: 100. Capacity: 500 entries, each
    truncated to 4,000 characters. Storybook output is recorded in chunks rather than
    guaranteed complete lines. Browser console/page errors are included. Logs are not
    persisted after shutdown and are not automatically redacted.
-   **stop** authenticates the daemon, asks it to close Chromium and terminate its owned
    Storybook child, and waits for session cleanup. Missing sessions are a no-op.
    It never signals a process based on a manifest PID or a port lookup.

## Shared-page actions and builds

```sh
yarn devkit wait --stage editor --timeout 30000
yarn devkit dom
yarn devkit click --role button --name Build
yarn devkit build --timeout 30000
yarn devkit wait --stage story --story 'Increment counter'
yarn devkit story --story 'Increment counter' --action step
yarn devkit story --story 'Increment counter' --action reset
yarn devkit story --story 'Increment counter' --action play
yarn devkit story --story 'Increment counter' --action pause
```

`dom` returns the shared page's accessibility tree (capped at 40,000 characters).
Generic `click`, `fill`, `press`, and `select` use exact `--role` and `--name`; optional
`--story` scopes to a uniquely titled story region. Missing, ambiguous, or disabled
targets fail explicitly. `fill` accepts `--value` or `--value-file`; `press` accepts
`--value` such as `ControlOrMeta+A`; `select` chooses an option by its label in `--value`.
Timeout defaults to 8 seconds, capped at 30 seconds. Actions return session, URL,
generation identity, and a fresh snapshot. Generic actions have `effectVerified: false`:
input delivery is not proof that the app completed its intended effect. Do not blindly
retry mutations after a timeout; inspect state because the action may have taken effect.

Monaco's textarea is not the whole modeled file: `fill` alone may insert at the cursor.
Discover its accessible name with `dom`, select all with `press`, then fill and verify
the resulting project/preview state. There is no revision-guarded import/export API yet.
Input values are capped; files are read by the local CLI, never by an HTTP path endpoint.

`build` clicks the actual Build button (or `Rebuild project` in the stale-code overlay),
including Monaco preflight checks. It observes a newer `build.revision` and terminal
state for the same generation/project version. **`ok: true` means the operation completed,
not that compilation succeeded: check `build.state` and structured `build.errors`.**
Errors preserve source file and position. A processing build or changed input/generation
is rejected rather than claiming an old artifact succeeded.

`wait --stage editor` checks initialization, not the flush of a just-typed edit.
`compiledProjectVersion` counts completions and is not a project revision. Before building
an edit, verify `project.version` advanced and preview corresponds to that version.
`wait --stage story` checks hydrated heap objects and an available render token; it does
not guarantee all animations/layout are visually settled. Empty-heap stories need a
more general readiness contract in a later slice.

Story controls invoke the actual accessible Play/Pause/Step/Reset controls, scoped by
exact **title**, not ID. They preserve the render-engine path. A step is a rendered
step, not a promise of exactly one scheduler tick. Pause requires auto mode; short
stories may finish before a subsequent pause command arrives. Snapshot story entries
now include playback mode, resolution, render-pending state, and bounded heap objects.
Heap serialization skips accessors, marks cycles/truncation, and represents Maps/Sets
explicitly; it is not a complete object dump. Full flow-stack inspection is pending.

### Live workflow regression

```sh
SIMULACRUM_DEVKIT_BROWSER=chrome yarn test:devkit:workflow
```

This separate opt-in check refuses existing sessions and owns cleanup. It tests a
real Monaco type error, a failed Build with structured source diagnostics, restoration
and successful Build, then Counter value 0 → step → 1 → reset → 0 → play → completed 1.
It saves `workflow-evidence.json`, action inputs/results, logs, snapshots, and screenshots
under the ignored artifact directory. This is a regression test for the fixed fixture,
not a general reproduction/replay system. The older `test:devkit:live` remains a smaller
observation-only check. Follow `ideas/devkit-workflow-gaps.md` for built/partial/planned scope.

## Ownership, bounds, and security

The control HTTP server binds only `127.0.0.1` on a random OS-assigned port. Every
route requires a random 256-bit bearer token and a separate random session identity.
Clients verify response protocol/session headers, do not follow redirects, cap response
size at 4 MiB, and enforce request deadlines. Browser operations are serialized with a
busy response rather than an unbounded queue. Read observations have an 8-second budget;
actions have a shared deadline capped at 30 seconds. Expected action errors preserve the
session; failed standalone snapshot/screenshot operations mark it failed. The only body
endpoint is authenticated `POST /action`, accepting schema-validated JSON capped at 64 KiB
with a bounded body-read time. No chunked bodies or browser Origin headers are accepted,
and the Host must exactly match the bound loopback endpoint.

The runtime manifest is `.simulacrum-dev/session.json`; it contains credentials, not
process-kill authority. New session directories are mode 0700 and manifest files mode 0600. Do not share this file. `status` and `start` do not print the bearer token.
The separate Storybook development server is loopback-only but **not authenticated**.
Do not expose it through a proxy, tunnel, or public bind. Neither this kit nor the
modeled-code runtime is a security sandbox; use trusted repository code only. Other
processes running as the same user can read credentials and interfere with files.
Screenshot/state/log content may contain modeled data or secrets supplied by the fixture.

The daemon is detached from the initiating terminal. On normal stop, SIGINT/SIGTERM,
or startup failure, it closes its own browser through Playwright and signals only
its live Storybook `ChildProcess` (its private process group on POSIX), escalating
TERM to KILL after a grace period. No persisted PID is ever used. Shutdown itself is
bounded. macOS/Linux are the intended platforms; Windows process-tree cleanup has
not been validated. A killed/unresponsive daemon, SIGKILL, machine crash, or descendant
that escapes the owned process group can leave orphan resources. There is no automatic
PID-based recovery, idle expiration, or OS-level supervisor in this MVP.

### Stale-lock recovery

1. Run `status`, then `stop` if the authenticated endpoint is available.
2. If unavailable, independently confirm the old devkit session is no longer active.
   Do **not** infer process ownership from a reused PID or occupied port. Inspect and
   clean up any orphan you can independently identify through your OS tools.
3. Only once you know it is safe, remove `.simulacrum-dev/lock/` and
   `.simulacrum-dev/session.json` manually, then run `start` again. Preserve
   `.simulacrum-dev/artifacts/` if its captures are useful.

The kit deliberately refuses to steal stale locks: safe refusal is preferable to
terminating an unrelated service. Removing a live session's lock manually defeats
its ownership guarantees and can leave resources behind.

## Tests and current limitations

The interactive workflow additionally passed 12 live assertions using installed Chrome.
The library build passed after the accessibility-label changes, with existing eval
warnings; the generated library still contains no debug-bridge marker.

```sh
yarn test:devkit
node --check tools/devkit/cli.mjs
node --check tools/devkit/daemon.mjs
node --check tools/devkit/core.mjs
```

The tests require installed project dependencies but no downloaded browser. The test
script also type-checks the fixture, bridge, and Storybook configuration. Bridge tests
cover fresh snapshots, generation changes, editor/overlay state, build errors, and output bounds. They exercise log bounds/cursors,
integer/auth validation, authenticated client identity checks, oversized/slow responses,
owned-child termination, JSON CLI behavior, lock exclusion, startup readiness/deadline
cleanup, historical versus fresh readiness (including false/unavailable states),
snapshots, artifact confinement, and stop. Lifecycle tests copy this kit into
temporary directories **under `tools/devkit/`** with explicitly fake Storybook and
Playwright packages; they do not touch the root session. These tests validate
orchestration, not Chromium rendering or the real compiler bridge. Temporary test
directories are removed on normal completion.

### Real-browser smoke check

```sh
yarn test:devkit:live
# Or use explicitly installed Google Chrome:
SIMULACRUM_DEVKIT_BROWSER=chrome yarn test:devkit:live
```

The smoke check refuses an existing session, starts its own real fixture, verifies
compiler readiness and story identity, waits for Monaco/global declarations and the
initial compilation with no visible Mantine loading overlay, reads fresh snapshots, captures a PNG,
checks captured browser errors, and confirms owned-session cleanup. It saves
`smoke-evidence.json` and the screenshot in the session artifact directory. This
validates observation and startup, not a model build, playback, UI interaction,
reload recovery, or debugger behavior. The expected initial build state is uninitiated.

Validation on macOS with Node 26.11.0: integration type-check and 44 focused tests
passed; repeated live smoke checks passed using installed Chrome (including the tightened
editor-readiness check, whose screenshot was visually inspected); the gated
Storybook static build passed without raising the heap limit. Earlier library-build
and production marker checks also passed. The original full Chromium installation
still needs repair: a five-minute retry completed the download but not installation.
Chrome is an explicit workaround, not a claim that the pinned Chromium path was tested.

There is a small port allocation-to-bind race for Storybook; collisions cause startup
failure, never takeover of another server.
Headed Chrome startup and a live snapshot were also verified: compiler ready, editor
mounted, globals initialized, and no visible loading overlay.

The screenshot is viewport-only. There is no persistent log store, source breakpoint
support, automatic session restart, or remote control support.
