# Agent guide: Simulacrum

## Purpose and essence

Simulacrum is the browser-based, embeddable core of **Metz**: a tool for expressing,
running, and communicating software architecture through TypeScript.

**You do not write code describing a diagram. You write code describing behavior,
and the diagram is a view of that behavior.**

A useful description is **executable design documentation**. Static diagrams can
show that a poller and a webhook share a database; an executable model can show how
their timing causes the same payment to be captured twice. Simulacrum occupies the
space between a static architecture diagram and a production implementation.

The modeled code is not intended to be production code. It should capture the
behavior relevant to a design discussion without requiring production infrastructure
or incidental implementation detail. The goal is shared understanding, not execution
for its own sake.

Preserve these product principles:

-   **Behavior before presentation:** model what a poller does, not a box labeled poller.
-   **Time is part of the design:** expose interactions between independently progressing flows.
-   **Data is first-class:** show state and how it changes, not only components and arrows.
-   **One model, multiple scenarios:** stories explore normal operation, failures, and edge cases.
-   **One model, multiple levels of detail:** let an audience inspect the appropriate resolution
    rather than requiring separately maintained diagrams.
-   **Familiar code, not a diagram DSL:** use TypeScript to express behavior. This does not mean
    every TypeScript construct is supported by the compiler.

## Repository versus product

This repository builds the Apache-2.0 React library `@metz/simulacrum`, not the entire
hosted Metz application. Compilation and simulation run in the browser; the core does
not require a backend server.

`src/index.tsx` exports:

-   `Editor`: the authoring experience, receiving project files and story setups.
-   `Playground`: the playback experience, receiving an existing build and stories.

The integration types are in `src/ui/ui-types.ts`; `src/types.ts` re-exports selected
public types. The editor exposes RxJS observables for state changes and analytics.
State-change categories include project files, story setups, build artifacts, display
settings, and notes. A host application can use these for persistence and other product
workflows. Do not assume hosted accounts, storage, billing, or deployment behavior is
implemented here, or that this checkout exactly matches the deployed product.

## Domain vocabulary

| Term             | Meaning                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Class / instance | A modeled component and its concrete instances: service, database, cache, worker, etc.    |
| Method           | An operation whose execution and interactions can be instrumented and visualized.         |
| Flow             | An independently managed execution with a generator, identity, and execution stack.       |
| Tick             | A logical scheduler step, not a millisecond or performance measurement.                   |
| Story            | A script that initializes a scenario and starts flows to demonstrate behavior.            |
| Heap             | Runtime registry of actual modeled object instances and their addresses.                  |
| Execution stack  | Explicit bookkeeping for instrumented method calls within a flow.                         |
| Keywords         | Compiler metadata about classes, methods, properties, signatures, and presentation flags. |
| Resolution       | A presentation/detail level for viewing the same model.                                   |

A **Metz story is not inherently a test**: it shows behavior rather than asserting
pass/fail. Also distinguish product stories from the **Storybook stories** used to
exercise this React library during development.

## Architecture and source map

The main pipeline is:

```text
TypeScript model + declaration libraries
    -> compiler worker and virtual TypeScript filesystem
    -> validation, class metadata, and static call relationships
    -> instrumented JavaScript containing async generators
    -> story initialization and flow creation
    -> tick-driven runtime execution
    -> heap/stack changes and execution events
    -> interactive graph, data views, and playback
```

| Path                                           | Responsibility                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/compiler/`                                | Worker communication, virtual compiler host, metadata extraction, validation, and AST transforms. |
| `src/compiler/command-handlers/build-command/` | Executable build, call hierarchy, source validation, and instrumentation transforms.              |
| `src/runtime/`                                 | Heap, flow lifecycle, execution stacks, scheduling, dependency injection, and event channels.     |
| `src/std/`                                     | Modeled-code standard library, coordination helpers, and completion templates.                    |
| `src/ui/components/`                           | Authoring, playback, graph nodes, controls, and other React components.                           |
| `src/ui/commands/`                             | UI operations, story hydration, and state subscriptions.                                          |
| `src/ui/state-managers/`                       | Zustand stores for host, project, compiler state, stories, display, notes, and related UI state.  |
| `src/ui/services/bootloader/`                  | Bridge from compiled artifacts to executable classes and runtime initialization.                  |
| `src/ui/services/render-engine/`               | Execution visualization and signal handling.                                                      |
| `src/ui/services/layout-engine/`               | Graph layout and its worker.                                                                      |
| `src/stories/`                                 | Storybook examples and development fixtures.                                                      |
| `tests/`                                       | Existing compiler test fixtures and typings.                                                      |

### Compiler/runtime contract

Start with `src/compiler/compiler.service.ts`, `src/compiler/compiler.worker.ts`,
`src/compiler/command-handlers/build-command/build-command-handler.ts`, and
`src/runtime/runtime-types.ts` when tracing execution.

The compiler uses TypeScript and `@typescript/vfs` in a web worker. Supported methods
are rewritten into async generators that yield a runtime protocol:

-   `LOAD`: enter an instrumented method.
-   `UNLOAD`: leave a method and carry its return value.
-   `LOG`: expose a modeled log operation.
-   `HALT`: suspend progress for sleep behavior.
-   `AWAIT_FLOW`: suspend a caller pending other flows.
-   `NO_OP`: a no-op instruction.

Constructors are instrumented to register instances. Transformed calls propagate
hidden flow context; the runtime maintains explicit stacks alongside the generators'
actual JavaScript control flow.

Compiler command names are not interchangeable: `COMPILE` generates metadata-derived
global declarations; `BUILD_PREVIEW` produces validated preview metadata and call
relationships; `BUILD` also emits instrumented executable JavaScript. Check the
handlers rather than assuming every command performs a full TypeScript diagnostic pass.

**The static call graph is metadata, not the execution engine.** The runtime executes
JavaScript, and visualization reflects actual modeled execution and state changes.

### Runtime and standard library

Key entry points are `src/runtime/runtime.ts`, `src/runtime/flow-manager.ts`,
`src/runtime/execution-stack.ts`, `src/runtime/heap.ts`, and `src/std/std.ts`.

The runtime advances eligible flows on logical ticks. Nested instrumented method calls
normally remain within the same flow; creating another flow is explicit. The standard
library supports flow creation, awaiting flows individually or in groups/races, sleep,
timers, intervals, event channels, logging, and dependency resolution.

Some `std` operations rely on compiler rewriting, rather than being ordinary standalone
JavaScript functions. Inspect both the transform and runtime adapter when changing them.

### Presentation and host integration

The main stack is React + TypeScript, Monaco for editing, React Flow for the graph,
ELK for layout, Zustand for state, RxJS for event streams, and Mantine for UI.

Decorators such as `@Show` expose instance data; `@Table`, `@Collection`, and `@KeyValue`
select specialized views. These represent modeled state, not connections to actual
Postgres, MongoDB, or Redis services. `@Injectable` participates in runtime initialization
and dependency resolution.

Presentation combines static metadata with live runtime information. When changing
resolution, collapsed nodes, or signal rendering, check their interaction with runtime
address translation and stepping rather than assuming they are isolated cosmetic changes.

## Boundaries and safety

-   **Supported TypeScript subset:** the compiler is class-oriented and has explicit source
    restrictions. Top-level declarations, imports/exports, inheritance, callbacks, and method
    references have special rules. Inspect `build-validator.ts` and the relevant transforms
    before extending support or promising arbitrary TypeScript compatibility.
-   **Cooperative stepping:** this is not statement-by-statement execution. Computation between
    yields runs as JavaScript; a loop without a suspension point can monopolize execution.
-   **Logical time:** ticks do not inherently represent CPU time, network latency, or database
    isolation. Do not describe the scheduler as a real-world performance simulator or assume
    deterministic ordering with arbitrary native asynchronous work.
-   **Not formal verification:** scenarios demonstrate modeled behavior; they do not prove all
    possible executions correct or establish production-system correctness.
-   **Not a security sandbox:** the bootloader evaluates compiled JavaScript. A compiler worker
    does not make execution isolated or make untrusted code safe. Browser-local execution alone
    is not a security guarantee.

## Revival and idea workflow

This project is being revived after a period of inactivity. Existing implementation
choices are context to understand, not assumptions that every old decision must remain.

The user will add idea files to `ideas/`. These are starting points for collaborative
exploration, not automatically approved implementation tasks. Pull on each thread:
clarify the problem and intent, inspect relevant code, question assumptions, explore
alternatives, and work through tradeoffs until a decision can be made.

-   `ideas/`: active ideas and unresolved questions under discussion.
-   `ideas/accepted/`: ideas we have decided to pursue.
-   `ideas/rejected/`: ideas we have decided not to pursue, retaining the reasoning.

Keep discoveries, open questions, and decision rationale in the relevant idea file so
future sessions can continue the discussion without reconstructing it. Keep unresolved
ideas in `ideas/`; do not force a premature verdict. Once a decision is agreed with the
user, update the file with the outcome and rationale and move it into `accepted/` or
`rejected/`. Acceptance records a direction, not proof that implementation is complete.
Consult relevant prior decisions before revisiting an idea or implementing related work.

## Working on this codebase

-   Keep changes focused and consistent with existing patterns; avoid unrelated refactors.
-   Preserve the separation between modeled behavior, story setup, runtime execution, and
    presentation. Avoid requiring manual diagram construction for behavior the engine can derive.
-   Treat the generator instruction protocol as a cross-layer contract. Changes to calls,
    returns, suspension, or flow context should be traced through compiler, runtime, and renderer.
-   When adding modeled-language features, consider validation, metadata, transforms, declaration
    tooling/completions, runtime support, visualization, and examples—not only parsing.
-   Preserve the distinction between authoring (`Editor`) and built-artifact playback (`Playground`).
    Changes to props, artifacts, or host events can affect external consumers and persisted data.
-   For execution bugs, isolate a small model and story. Check return propagation, stack balance,
    tick progression, and observable data changes, not just whether a bundle was emitted.
-   Use existing dependencies and abstractions when practical. Read `CONTRIBUTING.md` for project
    contribution expectations; do not create commits or branches unless asked.
-   Follow `.prettierrc.json`: tabs, width 4, semicolons, single quotes, ES5 trailing commas,
    parenthesized arrow parameters, and print width 100. Code and comments should be in English.

## Development and validation

Use Yarn, consistent with `yarn.lock` and the README:

```sh
yarn install
yarn storybook        # Interactive development on port 6006
yarn build            # TypeScript check followed by Vite library build
yarn test             # Jest through ts-jest
yarn build-storybook  # Build the component development/demo site
yarn lint             # Declared lint script; verify tooling availability
```

`vite.config.ts` builds an ES-module library from `src/index.tsx`, externalizes React
and React DOM, and emits declarations. Do not assume `yarn dev` launches the complete
Metz product; Storybook is the documented local development entry point.

Validation caveats from the initial repository inspection:

-   The discovered automated test is a shallow compiler smoke test in
    `tests/call-expression-transformer/transformer.test.ts`, with outdated import paths and
    API usage. Recheck its current state before relying on it.
-   Runtime behavior does not have an established comprehensive automated safety net in the
    inspected checkout. Add targeted behavioral coverage when changing execution semantics.
-   `tsconfig.json` includes `src` and excludes `tests`; a successful library build alone does
    not validate test sources or simulation behavior.
-   The package declares a lint command, but ESLint is not declared in its dependency lists.
    Check the environment before treating lint as an available or passing validation gate.
-   Report exactly which checks ran and their outcomes. Distinguish pre-existing tooling failures
    from regressions introduced by a change; never claim validation based solely on inspection.

## Local agent devkit

`tools/devkit/README.md` documents the observation and shared-page UI kit. Use
`yarn devkit start`, `status`, `snapshot`, `screenshot`, `logs`, and `stop`.
`dom`, `click`, `fill`, `press`, and `select` operate on the same page using exact
accessible role/name selectors. `build` invokes the real UI build handler; check
`build.state`, since a completed operation may report compiler errors. `story` supports
scoped play/pause/step/reset through UI controls, not direct runtime mutation.
See `ideas/devkit-workflow-gaps.md` for built/partial/planned scope.
Install its browser with `yarn playwright install chromium --no-shell` first, or explicitly
select installed Chrome with `SIMULACRUM_DEVKIT_BROWSER=chrome yarn devkit start`.
`yarn test:devkit` type-checks the integration and runs focused tests without a browser.
`yarn test:devkit:live` runs a real observation smoke check and cleans up its own session;
it refuses existing sessions. It also accepts `SIMULACRUM_DEVKIT_BROWSER=chrome`.
`yarn test:devkit:workflow` tests editing, failed/successful builds, step/reset/play,
and heap values against the real fixture, saving evidence and cleaning up its session.

Use `yarn devkit start --headed` for a visible shared browser window; headless is the
default. It also works with the Chrome environment option above. CLI observations
refer to the same page the user sees. Leave a headed session open when requested.

The kit owns a gated Storybook fixture and isolated Chromium session. Its
bridge is not part of the published library. `status` reports lifecycle and historical
readiness; `snapshot` makes a fresh observation. Startup waits for compiler readiness,
not a successful model build. Keep `.simulacrum-dev/` private and ignored; it contains
session credentials and evidence. Never recover stale sessions by killing arbitrary
PIDs or processes occupying a port. Implementation breakpoints, full reproduction
import/export, detailed flow stacks, and automatic recovery remain unimplemented.
Generic actions do not prove application effects and must not be blindly retried after
a timeout. Monaco fill may insert at the cursor: select all before whole-file replacement
and verify the resulting project version/preview. Consult the README for current limits.

## Further context

-   `Readme.md`: purpose, mental model, implementation overview, examples, and setup.
-   `CONTRIBUTING.md`: contribution and style guidance.
-   https://metz.sh: product positioning and interactive demonstrations.
-   https://docs.metz.sh: modeled-language concepts and user-facing behavior.
-   https://docs.metz.sh/llms.txt: documentation page index.
-   https://try.metz.sh: hosted playground.

Use the local source as the authority for this checkout's implementation. Website and
documentation descriptions explain intent but may differ from the checked-out version.
