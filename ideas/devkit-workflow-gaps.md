# Devkit gaps found while using it as an agent

Status: implementation underway following user approval. This document is the progress
tracker; **built** means implemented and validated against the item's stated acceptance.
**Partial** means a useful subset exists but the whole gap is not closed.
Related direction: `accepted/ai-native-dev-kit.md`.

## Build tracker

| #   | Gap                       | Status    | Delivered / remaining                                                                                                                                                                                                     |
| --- | ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Shared-page interaction   | **Built** | Accessibility tree; exact role/name click/fill/press/select; story scoping; bounded waits and explicit ambiguity/disabled-target errors. Live Build discovery and UI actions verified.                                    |
| 2   | Reproduction inputs       | Partial   | Real Monaco editing through keys/fill; fixture selection, bounded file reads, import/export and edit revision guards still needed.                                                                                        |
| 3   | Real build semantics      | **Built** | Actual Build/Rebuild UI handler, new build revision, project/generation checks, structured source diagnostics. Live valid and deliberate type-error builds verified.                                                      |
| 4   | Story control             | Partial   | Scoped play/pause/step/reset implemented. Live step/reset/play verified. Pause has unit coverage, but Counter finishes too quickly for a separate live pause command; multi-story selection and bounded run-until remain. |
| 5   | Execution/data inspection | Partial   | Bounded descriptor-only heap snapshots, Maps/Sets/cycles/accessor markers; Counter value assertions. Detailed flow stacks/waits and pagination remain.                                                                    |
| 6   | Stage waits               | Partial   | Editor initialization, build completion, heap hydration/render-token waits. These do not prove every animation/layout has settled; richer stage diagnosis remains.                                                        |
| 7   | Logs/network              | Planned   | No new log filtering or request capture in this slice.                                                                                                                                                                    |
| 8   | Graph explanation         | Partial   | Preview state/version/errors distinguished from story counts, plus story resolution and render-pending status. Visible graph identities/address mappings remain.                                                          |
| 9   | Reproduction evidence     | Partial   | Automated Counter workflow records action inputs/results, snapshots, logs, screenshots and assertions. General export/replay and source/browser provenance remain.                                                        |
| 10  | Implementation debugger   | Planned   | No breakpoint/worker debugger support added.                                                                                                                                                                              |
| 11  | HMR/recovery              | Partial   | Build/action generation checks and bridge subscription cleanup; full recovery and shared-user edit protection remain.                                                                                                     |
| 12  | Preflight                 | Planned   | Existing lifecycle remains; no doctor command added.                                                                                                                                                                      |

### First workflow validation

-   Validation: integration type-check and **44 focused tests passed**; the real Chrome
    workflow passed **12 assertions**; library build passed with existing eval warnings;
    production bundle marker check passed. Sessions cleaned up to `stopped`.

-   `yarn test:devkit:workflow` starts and cleans up its own session; refuses existing ones.
-   With installed Chrome, live assertions passed: DOM discovers Build; select-all/fill
    inserts a deliberate type error; project version and preview update; the actual Build
    rejects it with a new revision and structured file/position; restoring valid source
    builds the current version; Counter starts at 0, steps to 1, resets to 0, and plays to
    completion at 1 without story errors. Evidence is private under session artifacts.
-   Build controls needed distinct accessible names: a stale-code overlay can cover the
    toolbar and contains its own Build button. That control is now `Rebuild project` and
    uses the same existing handler. No raw store writes or direct runtime ticks were used.
-   `compiledProjectVersion` is a completion counter, not the modeled project version.
    Editor wait means initialized, not that a just-typed edit's debounce has flushed.
    The live test explicitly waits for changed project/preview versions before building.
-   Generic Monaco `fill` alone can insert text rather than replace the whole modeled
    file. Select all first and verify resulting state. Generic actions report
    `effectVerified: false`; semantic build/story commands verify their own outcomes.
-   `ok: true` for build means the operation completed. Always check `build.state`; an
    expected type error is a completed operation with `state: errored`.

## Original exercise and evidence

The task was to use the current kit as an agent working on Simulacrum and identify
what prevents a real edit/reproduce/inspect/verify loop. No application or tooling
implementation changes were made for this review.

Ran an isolated headless session with installed Chrome, inspected help/status, read
fresh snapshots, captured and viewed a screenshot, attempted a build command, attempted
error-filtered logs, and collected all available logs. Did not attach a separate
browser or secretly mutate application stores to get around missing kit capabilities.

Observed:

-   The editor and Counter preview were visible; compiler and editor initialization
    were ready. The model build was `uninitiated`; the story was at tick 0.
-   `yarn devkit build` failed with `Unknown command: build`. There is no UI-action
    command or shared browser automation attachment surface in the current CLI.
    Consequently a build/run/debug workflow could not be completed with the kit.
-   The screenshot showed Counter and Increment in the preview. Snapshot story node
    and edge counts were both zero. This is not proof of a rendering defect: preview
    and story graphs are different views, and the snapshot only summarizes the latter.
-   `yarn devkit logs --level error` rejected the option.
-   The log buffer contained 23 entries: 8 bridge, 6 Storybook stdout, 3 daemon,
    2 navigation, 2 browser debug, 1 browser info, and 1 browser error. The browser
    error was `Failed to load resource: the server responded with a status of 404
(Not Found)`. It had no resource URL or request information. Its cause and impact
    were not established; do not label it harmless or a compiler failure.
-   Complete snapshot/log evidence and the viewed screenshot were saved under the
    ignored artifact directory for session
    `e43a928cc40ab6fe829f08e59b9cdc151194205d610500bfec2d2d4a4bc27dbf`.

Source inspection supplemented the exercise: build button, player controls, bridge,
smoke check, heap, and explicit execution stack. Findings below distinguish direct
observations from code-informed requirements. In particular, no running story,
reload recovery, or actual implementation breakpoint was tested during this review.

## Priority 0: close the development loop

### 1. Interact with the same page we observe — **built**

**Observed blocker.** I can see Build but cannot press it. Need semantic DOM/accessibility
observations plus bounded click, fill, key, select, and wait operations, either through
a shared Playwright adapter or a deliberately small CLI surface. Do not launch a second
page that only looks similar. Report target/session identity and ambiguous locators.

Acceptance: discover Build by role/name, click it, and verify the result in the same
session. Inspect icon-only playback controls for accessible names: current source
shows tooltips and icons, not explicit button labels. Coordinate labels with the UI,
rather than making screenshot coordinates the primary automation API.

### 2. Supply, inspect, change, and preserve a reproduction

**Observed limit + source-informed scope.** Startup only opens the fixed Counter
fixture; snapshots do not expose virtual model files or story source. Editing library
source on disk is not the same as editing the modeled project held inside Monaco.
Need fixture selection, bounded file/story reads, explicit import/update, and export
of the current reproduction. Preserve the real project/Monaco synchronization path.

Acceptance: load a two-service reproduction without editing the kit's own story file,
change one modeled method, read it back, and save the current model/story before restart.
Do not silently replace a human's edits; use revision checks or explicit reset.

### 3. Build with the same semantics as the real Build button — **built**

**Observed blocker and inspected contract.** A direct `sendBuildCommand()` wrapper
would omit the Build button's `getErrorsFromMonacoWorker()` preflight. Need a shared
application build operation or a UI click, a project revision/build identity, bounded
completion waits, and structured diagnostics with source file/range/severity.

Acceptance: a successful model builds; a deliberate type error reports its location;
neither a preview success nor an old successful build is mistaken for the requested
build. No general raw-store mutation as a substitute.

### 4. Control stories through the actual playback path

**Code-informed next blocker; not exercised live.** Need story selection, play/pause,
reset, and explicit stepping. Player controls acquire render tokens and invoke
`RenderEngine.render()`; raw `Runtime.tick()` would bypass part of the behavior we
are trying to verify. Distinguish a rendered step from an exact scheduler tick.

Acceptance: build Counter, run its story, pause/step/reset, and inspect the resulting
state. Bounded run-until operations should report why they stopped. A main-thread loop
without a yield needs an external watchdog, not just a tick limit.

## Priority 1: make observations explain failures

### 5. Inspect actual execution and data, not just counts

**Observed snapshot omission; runtime requirements inferred from source.** Flow counts
cannot explain which call is suspended, what it awaits, what was returned, or whether
Counter.value changed. Need paginated flow IDs/names/status, modeled execution stacks,
wait dependencies, scheduled tasks/channels, heap addresses and bounded object data.

Acceptance: read Counter.value before/after increment, and diagnose a sleeping or
awaiting flow by ID. Support Maps, cycles, and truncation explicitly; do not invoke
arbitrary getters during inspection. These are modeled stacks, not V8 debugger stacks.

### 6. Stage-specific readiness and waits

**Observed distinction and existing smoke implementation.** `start` establishes
compiler readiness, while smoke has its own editor-initialization polling. Need
reusable bounded waits for editor readiness, requested build completion, story
hydration, and rendering settling, with failed/pending stage details.

Acceptance: take a screenshot after the requested state, not a spinner; a timeout
says what was still pending. Preserve cheap historical `status` for a hung page rather
than turning every status request into blocking browser evaluation.

### 7. Actionable errors, network evidence, and filtered logs

**Directly observed.** A URL-less 404 and unsupported severity filter forced ad hoc
JSON processing without identifying the resource. Need separate source/level fields,
console source locations, error stacks, worker identity where available, failed requests
and HTTP error responses with URL/status, and filters/cursors. Correlate actions with
build/story/tick where possible. Deduplicate routine startup bridge-wait noise.

Acceptance: identify the observed 404's URL and impact, and retrieve errors from only
the latest action. Preserve errors, but do not automatically equate any browser console
error (e.g. an ancillary resource) with a failed model. Avoid collecting request bodies,
credentials, or secrets by default.

### 8. Explain the currently displayed graph

**Directly observed ambiguity.** Preview boxes can be visible while story node counts
are zero. Need view identity (preview versus story), preview state/errors, selected
story, resolution, collapsed nodes, visible node/edge identities, and runtime-address
mapping where appropriate. Add viewport/node-focused screenshot options as needed.

Acceptance: answer whether a missing edge is absent from metadata, hidden by resolution,
not yet reached in execution, or awaiting rendering. Do not infer graph connectivity
solely from screenshot pixels or treat static relationships as execution events.

### 9. Reproduction and regression evidence as one operation

**Observed limit + inspected smoke coverage.** I manually joined logs and snapshots;
current smoke verifies startup/observation, not building or behavior. Need a bounded
capture bundle: input files/story, code revision plus dirty-state identity, browser
version, build/generation IDs, ordered actions, relevant logs, snapshots, and images.

Acceptance: export a failure, reopen its inputs, reproduce it, and verify a fix with
explicit assertions (e.g. Counter.value changes as expected). Stories remain scenarios;
assertions are a separate test layer. Never claim deterministic replay of arbitrary
native async work. Restrict artifact sharing and redact secrets deliberately.

## Priority 2: investigate deeper defects and stay reliable across edits

### 10. Real implementation debugger and worker targets

**Code-informed need; no live debugger trial.** Need source-mapped breakpoints,
pause/wait/resume, scopes, and stacks for page and compiler worker, then layout worker
when needed. Account for generated model JavaScript separately from library TypeScript.
The host instrumentation currently returns no source map; fix that before promising
original-source breakpoints. UI automation may block at a JavaScript pause.

Acceptance: hit a known TypeScript breakpoint in compiler/runtime code, inspect locals,
resume, and still operate the same session. Keep simulation pause and V8 pause distinct.

### 11. HMR/reload recovery with provenance and explicit ownership

**Code-informed risk; not live-tested.** Generation IDs exist, but there is no complete
reload/reconnect workflow. Snapshot failures mark the session failed, even when a bridge
may only be temporarily absent. Need clear transient-versus-terminal reporting, explicit
reload, worker reattachment, input preservation, and generation-aware pending commands.
Human and agent actions need unambiguous outcomes when sharing a headed page.

Acceptance: edit implementation code, distinguish HMR from remount, reacquire the current
bridge/worker, and never report a prior-generation result as fresh. Do not silently reload
or discard user work to make recovery easier.

### 12. Preflight and useful startup-failure evidence

**Motivated by earlier installation failures, not a new failure in this exercise.** Need
a bounded doctor/preflight check for actual browser launchability, versions, dependencies,
fixture configuration, and owned-session state. An executable existing on disk was not
sufficient during Chromium installation. Keep startup evidence after failed cleanup.

Acceptance: explain an incomplete browser install before starting the rest of the stack;
identify Chrome as an explicit alternative; retain safe stale-session refusal. Do not
solve recovery by killing arbitrary PIDs or whatever occupies a port.

## Recommended next slice

Not twelve independent command families at once. Build one complete vertical workflow:

1. Discover and click Build on the shared page.
2. Await that build and return structured errors or its versioned artifact identity.
3. Select/run/step Counter through real controls.
4. Observe Counter.value and relevant graph state before/after.
5. Save evidence and an explicit regression assertion.
6. Repeat with a deliberate source error and confirm failure is actionable.

This delivers practical utility earlier than expanding passive screenshots or building
a full debugger before agents can trigger the behavior they want to debug.
