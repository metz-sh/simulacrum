# AI-native debug/dev kit

Status: accepted direction; observation and first shared-page build/playback workflow
implemented and live-validated using installed Chrome. Detailed progress is tracked in
`../devkit-workflow-gaps.md`; the remaining gaps are not implicitly marked complete.

## First interactive workflow

Shared-page DOM/action commands, real Build/Rebuild handling with revision checks and
structured diagnostics, scoped story controls, bounded heap data, and editor/story waits
are implemented. The live workflow test verifies deliberate type error → valid build →
Counter step/reset/play and expected heap values, with saved evidence and owned cleanup.
44 focused tests and integration type-check passed; the live workflow passed 12 assertions;
the library build passed with existing eval warnings and no debug-bridge bundle marker.
The gap tracker marks shared-page interaction and build semantics **built**; broader
inputs/replay, detailed execution inspection, debugger, and recovery remain partial/planned.

## Visible collaboration

The user wanted to see the running application, not only receive reports from a
headless session. Added `start --headed`: a visible isolated browser whose page is
also the CLI's observation target. Headless remains the default for unattended checks.
Start/status identify the chosen mode; closing the fixture tab triggers owned cleanup.
Headed Chrome startup and a fresh editor-ready snapshot were verified. Agent-driven UI
interaction remains future work, but the user can interact with the visible page now.

## Initial implementation

-   `tools/devkit/`: authenticated session daemon and JSON CLI, bounded logs, screenshots,
    read-only snapshots, ownership-aware stop, and tests.
-   `.storybook/main.ts`: explicitly gated minimal Counter fixture and host instrumentation.
    No library source hooks or public API changes; a build marker check confirmed the
    inspection bridge is absent from `dist/index.js`.
-   `yarn test:devkit`: integration TypeScript check and 12 passing tests covering bridge
    snapshots and mocked process/browser orchestration.
-   `yarn build` passed with existing eval warnings. `git diff --check` passed.
-   Pinned Chromium installation remains incomplete after another five-minute timeout.
    Added explicit `SIMULACRUM_DEVKIT_BROWSER=chrome` selection (no automatic fallback),
    which launches installed Chrome with an isolated temporary profile.
-   Real start/snapshot/screenshot/logs/stop worked. Added `yarn test:devkit:live` to
    validate the observation loop and cleanup without touching an existing session;
    repeated runs passed with Chrome. Evidence is under ignored session artifacts.
-   Visual inspection exposed a gap in the initial smoke check: compiler readiness can
    precede editor initialization, so its PNG could show only a loading spinner. Snapshots
    now expose editor/global-declaration/compilation and loading-overlay state; the smoke
    check waits for those before capture. The tightened check passed and its screenshot
    was visually confirmed to contain the editor and Counter preview.
-   The first live smoke check caught a flaky Monaco CDN worker request. The fixture now
    serves Monaco from the installed package, making that dependency local and reproducible.
-   Gated Storybook initially exhausted the approximately 4 GB Node heap. Removing its
    inherited vite:dts plugin alone did not fix it; additionally disabling static bundle
    sourcemaps did. The gated static build now passes without raising the heap limit.
    These settings do not change normal Storybook or the library build.
-   Source-mapped debugging remains unvalidated; the host instrumentation plugin returns
    map: null. Fix that before promising original-source breakpoints. Static observation
    bundle maps and development debugger mappings are distinct concerns.
-   The live smoke check validates startup and observation only: it does not build/run
    the model, interact with controls, test reload recovery, or attach debugger targets.

## Decision

Build an independent Simulacrum debug/dev kit. Use arcd's general observation/control
approach as inspiration, not its Arc-specific source. The user agreed to pursue this
direction. Acceptance does not imply approval of every proposed command or milestone.

## Intent

Give agents a reliable live development loop: boot the project, reproduce behavior,
observe the UI and internal state, debug the implementation, make a change, and verify
it against the running application. AGENTS.md supplies context; this kit supplies
observation and control.

Reference: `work/arcdlike.md`, describing the user's arcd toolkit for Arc.

## What carries over from arcd

-   Complementary surfaces: browser automation for UI observation/interaction and a
    persistent debugger connection for breakpoints, paused scopes, stacks, and logs.
-   A CLI usable by different agents; optional MCP and skill integrations rather than
    tying the implementation to one editor or agent.
-   Explicit session/target selection, bounded waits, readiness checks, reconnects,
    and safe lifecycle ownership. Do not silently reload a session on attachment.
-   Structured, bounded output and evidence from the live application.

Arc-specific backend, Electron, Redux, authentication, and sync tooling do not carry
across automatically.

## Verified local starting points

-   `package.json` provides Storybook development on port 6006; it does not currently
    declare Playwright or a debug-kit command.
-   `.storybook/main.ts` uses the React/Vite integration.
-   `src/compiler/compiler.service.ts` creates a module worker for compilation.
-   `src/ui/services/layout-engine/layout-engine-worker.ts` creates an ELK worker.
-   `src/ui/state-managers/story/story.store.ts` creates a Runtime per story store.
-   `src/runtime/runtime.ts` exposes `entities()`, `getCurrentTick()`, and `getHeap()`;
    these are useful inspection entry points, not an existing serialized debug API.
-   State uses Zustand stores, not Arc's single exposed Redux store.
-   No prior decisions were present in ideas/accepted or ideas/rejected when inspected.

## Proposed direction

Start with the real browser application, initially through a known Storybook fixture,
plus a local CLI and persistent session owner. Reuse browser automation for screenshots,
DOM observation, and interactions rather than building a second UI automation system.
A dedicated harness is an alternative if Storybook framing becomes an obstacle.

Keep two kinds of control explicitly separate:

1. Implementation debugging: JavaScript breakpoints, scopes, stacks, worker targets.
2. Model inspection/control: selected story, logical ticks, flows, heap, modeled state,
   and execution events. A simulation pause is not a JavaScript debugger pause.

A dev-only bridge should identify the host and story explicitly and expose bounded
snapshots and selected existing application operations. Avoid arbitrary store mutation
as the primary control surface. Trace the existing playback/render path before adding
step commands; directly ticking Runtime could bypass presentation bookkeeping.

The first vertical slice should boot an owned browser session, select a known fixture,
report actual application readiness, capture UI and error evidence, inspect selected
story state, and stop only processes it owns. Then add source-mapped debugger control
and deeper model inspection. No production-library debug exposure by default.

## Open decisions and risks

-   Proposed default: a dedicated, minimal debug fixture within Storybook, opened directly
    through its preview page. Validate that this avoids manager/frame ambiguity before
    introducing a separate application harness.
-   How much implementation-debugger support must ship in the first slice?
-   Worker discovery/reconnection and original-TypeScript breakpoint mapping need
    validation; the reference's served-JavaScript line-number limitation is not a goal.
-   Browser automation and debugger must address the same page/frame/session.
-   Readiness must distinguish server, page, compiler, build, and story initialization.
-   Loopback-only control, dedicated browser profiles, session authorization, and
    worktree isolation matter because debugging/evaluation grants code execution.
-   Bounded tick counts are not a hard timeout for JavaScript that never yields; any
    watchdog for that case must operate outside the blocked page.

## Implementation outline (proposed)

### Session owner and transports

A local Node process owns an isolated Chromium session and persistent CDP connections.
A thin CLI talks to it through an authenticated loopback endpoint. Playwright supplies
browser automation; an optional MCP adapter can share the same browser session. The
CLI should remain usable without MCP, including evidence capture.

Use a worktree-local, ignored session manifest with endpoint, session ID, project path,
and owned process metadata. Allocate available ports rather than assuming a hash is
collision-free. Refuse ambiguous/stale sessions; never kill processes merely because
something occupies the expected port. Attach is non-destructive; reset is explicit.

### First slice: reliable observation

-   A minimal fixed-input Editor fixture, distinct from large illustrative examples.
-   Lifecycle commands: start, status, stop; start returns after bounded readiness checks.
-   Session identity and readiness: server reachable, page loaded, bridge registered,
    compiler initialized. Build completion is a separate requested condition, not a
    prerequisite for inspecting a build failure.
-   Bounded logs with a cursor and explicit indication when older entries were dropped.
-   Screenshot and DOM evidence from the selected page.
-   Read-only snapshots: project/build version and state, story IDs, selected story's
    logical tick, flow summary, errors, and graph node/edge counts.
-   JSON responses with session identity, success/error status, and actionable errors.
-   Reconnection reports a new page/bridge generation rather than returning stale data.

The fixture/bridge should be enabled explicitly for this tooling, not merely whenever
an external consumer runs the library in Vite development mode. Keep tooling outside
published exports and verify the production bundle does not contain its debug surface.

### Second slice: implementation debugger

Page breakpoints, pause/wait/resume, scopes, stack inspection, and explicit evaluation.
Validate original-source mapping with an actual TypeScript breakpoint and inspect worker
attachment/recreation early. Separate debugger pause status from app health; operations
requiring the paused page must fail clearly rather than pretending it is disconnected.

### Third slice: model-aware control and regression evidence

Add build/run/reset/step through existing application paths, then bounded heap and
execution-event inspection. Capture fixture/input identity, build version, actions,
logs, snapshots, and screenshots into a reproducible evidence bundle. A saved scenario
becomes a regression test only when explicit assertions are added.

### Additional findings from code inspection

-   `code-daemon.store.ts` already distinguishes compiler readiness from build states
    (`uninitiated`, `processing`, `errored`, and successful builds), including versions.
-   `host.store.ts` creates the code-daemon store per host but references shared stories
    and display stores. Initial tooling should support one mounted host per fixture;
    host IDs alone would not establish multi-host isolation.
-   The Step control in `player-controls.tsx` consumes a render token and invokes
    `RenderEngine.render()`. Reset also coordinates rendering, bootstrapping, and story
    hydration. Neither should be replaced with a raw Runtime call in the debug bridge.

### Validation gates

Exercise successful boot and bounded boot failure; inspect a compiler error without
losing the session; verify evidence and bridge target the same fixture; test page reload
without stale snapshots; confirm stop leaves unrelated processes alone. Verify the
production build excludes the bridge. Later debugger validation must include an actual
breakpoint hit, scope inspection, resume, and worker recreation—not just CDP attachment.

## Acceptance example (proposed)

An agent can open a known model, build and run a story, capture its visible result and
selected internal state, reproduce an implementation failure, inspect the relevant
paused code, resume, and repeat verification after an edit without asking a human to
operate DevTools or copy console output. Captured evidence distinguishes model behavior
from implementation errors. Stories remain scenarios, not automatically tests.
