const ROLES = new Set([
	'button',
	'textbox',
	'combobox',
	'checkbox',
	'radio',
	'switch',
	'tab',
	'link',
	'menuitem',
	'option',
	'spinbutton',
	'slider',
	'searchbox',
]);
const FIELDS = {
	dom: [],
	click: ['role', 'name', 'story', 'timeout'],
	fill: ['role', 'name', 'value', 'story', 'timeout'],
	press: ['role', 'name', 'value', 'story', 'timeout'],
	select: ['role', 'name', 'value', 'story', 'timeout'],
	wait: ['stage', 'story', 'timeout'],
	build: ['timeout'],
	story: ['story', 'action', 'timeout'],
};

function fail(code, message, details = {}) {
	const error = new Error(message);
	error.code = code;
	error.details = details;
	throw error;
}

function validate(input) {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		fail('INVALID_ACTION', 'Action must be a JSON object');
	}
	if (typeof input.command !== 'string' || !Object.hasOwn(FIELDS, input.command)) {
		fail('INVALID_ACTION', 'Unknown command');
	}
	const fields = FIELDS[input.command];
	for (const key of Object.keys(input)) {
		if (key !== 'command' && !fields.includes(key)) {
			fail('INVALID_ACTION', `Unknown field: ${key}`);
		}
	}
	const text = (key, max, allowEmpty = false) => {
		if (
			typeof input[key] !== 'string' ||
			input[key].length > max ||
			(!allowEmpty && !input[key].trim())
		) {
			fail(
				'INVALID_ACTION',
				`${key} must be ${allowEmpty ? 'a' : 'a nonempty'} string of at most ${max} characters`
			);
		}
	};
	if (
		Object.hasOwn(input, 'timeout') &&
		(!Number.isInteger(input.timeout) || input.timeout < 1 || input.timeout > 30000)
	) {
		fail('INVALID_ACTION', 'timeout must be an integer from 1 to 30000 milliseconds');
	}
	if (Object.hasOwn(input, 'story')) text('story', 1000);
	if (['click', 'fill', 'press', 'select'].includes(input.command)) {
		if (!ROLES.has(input.role)) fail('INVALID_ACTION', 'Unsupported accessible role');
		text('name', 1000);
		if (input.command !== 'click') {
			text('value', input.command === 'fill' ? 16000 : 1000, input.command === 'fill');
		}
	}
	if (input.command === 'wait') {
		if (!['editor', 'story'].includes(input.stage))
			fail('INVALID_ACTION', 'stage must be editor or story');
		if (input.stage === 'editor' && Object.hasOwn(input, 'story')) {
			fail('INVALID_ACTION', 'story is only valid for the story stage');
		}
	}
	if (input.command === 'story') {
		text('story', 1000);
		if (!['step', 'play', 'pause', 'reset'].includes(input.action)) {
			fail('INVALID_ACTION', 'action must be step, play, pause, or reset');
		}
	}
	return input;
}

function storyFrom(snapshot, title) {
	const stories = (snapshot.stories ?? []).filter(
		(story) => title === undefined || story.title === title
	);
	if (stories.length > 1)
		fail('AMBIGUOUS_STORY', 'Specify a unique story title', { story: title });
	if (snapshot.storiesTruncated) {
		fail('INCOMPLETE_SNAPSHOT', 'Story list is truncated; cannot establish a unique story');
	}
	return stories[0];
}

function storyPending(story) {
	if (!story) return ['story not present'];
	const pending = [];
	if (!Array.isArray(story.heap?.objects) || !story.heap.objects.length)
		pending.push('heap has no hydrated objects');
	if (story.renderPending !== false) pending.push('render completion');
	return pending;
}

function editorPending(state) {
	const pending = [];
	if (state.compilerReady !== true) pending.push('compiler readiness');
	if (state.editor?.mounted !== true) pending.push('editor mount');
	if (state.editor?.globalsReady !== true) pending.push('global declarations');
	// This is an independent compile-completion counter, not a project version.
	// A positive value establishes initialization only, not current-project freshness.
	if (!(state.editor?.compiledProjectVersion > 0)) {
		pending.push('initial compilation completion');
	}
	if (state.editor?.loadingOverlayVisible !== false) pending.push('loading overlay dismissal');
	return pending;
}

/** UI-only actions. snapshot() must return fresh bridge JSON, not a cached observation.
 * Story selectors are exact titles. Errors carry code/details and do not alter session state.
 * fill is a DOM input operation, not a Monaco model replacement API. For whole-model
 * replacement, press ControlOrMeta+A in the editor before fill and inspect the result.
 * Editor readiness establishes initialization only; it cannot flush debounced model edits.
 */
export async function executeAction(page, snapshot, rawInput) {
	const input = validate(rawInput);
	const deadline = performance.now() + (input.timeout ?? 8000);
	let pending = ['initial snapshot'];
	const timeout = () =>
		fail(
			'ACTION_TIMEOUT',
			`Timed out during ${input.command}; pending: ${pending.join(', ')}`,
			{ pending }
		);
	const remaining = () => {
		const ms = Math.ceil(deadline - performance.now());
		if (ms <= 0) timeout();
		return ms;
	};
	// Bound even a stalled bridge read. Locator operations also receive the remaining
	// budget so Playwright will not continue waiting on a target after our deadline.
	const bounded = async (operation) => {
		const ms = remaining();
		let timer;
		try {
			return await Promise.race([
				Promise.resolve().then(() => operation(ms)),
				new Promise((_, reject) => {
					timer = setTimeout(() => {
						try {
							timeout();
						} catch (error) {
							reject(error);
						}
					}, ms);
				}),
			]);
		} catch (error) {
			if (error.name === 'TimeoutError') timeout();
			throw error;
		} finally {
			clearTimeout(timer);
		}
	};
	const before = await bounded(() => snapshot());
	const checkIdentity = (state) => {
		if (
			state.generation !== before.generation ||
			state.project?.version !== before.project?.version
		) {
			fail(
				'STALE_ACTION',
				'Host generation or project version changed; take a fresh snapshot and retry',
				{
					before: {
						generation: before.generation,
						projectVersion: before.project?.version,
					},
					after: { generation: state.generation, projectVersion: state.project?.version },
				}
			);
		}
	};
	const poll = async (condition) => {
		for (;;) {
			const state = await bounded(() => snapshot());
			checkIdentity(state);
			pending = condition(state);
			if (!pending.length) return state;
			await bounded((ms) => new Promise((resolve) => setTimeout(resolve, Math.min(50, ms))));
		}
	};
	const unique = async (locator, description) => {
		pending = [`unique ${description}`];
		const count = await bounded(() => locator.count());
		if (count !== 1)
			fail(
				count ? 'AMBIGUOUS_TARGET' : 'MISSING_TARGET',
				`Expected exactly one ${description}, found ${count}; inspect dom and use a unique name/story scope`,
				{ count }
			);
		return locator;
	};
	const target = async (role, name, story) => {
		let scope = page;
		if (story !== undefined) {
			scope = await unique(
				page.getByRole('region', { name: `Story ${story}`, exact: true }),
				`story region ${JSON.stringify(story)}`
			);
		}
		return unique(
			scope.getByRole(role, { name, exact: true }),
			`${role} ${JSON.stringify(name)}`
		);
	};
	const act = async (locator, command, value, beforeAction) => {
		pending = [`enabled target for ${command}`];
		if (!(await bounded((ms) => locator.isEnabled({ timeout: ms })))) {
			fail('DISABLED_TARGET', 'Target is disabled; inspect snapshot/dom for prerequisites');
		}
		if (beforeAction) await beforeAction();
		pending = [`${command} target`];
		await bounded((ms) =>
			command === 'click'
				? locator.click({ timeout: ms })
				: command === 'select'
					? locator.selectOption({ label: value }, { timeout: ms })
					: locator[command](value, { timeout: ms })
		);
	};
	let after;
	let extra = {};
	if (input.command === 'dom') {
		pending = ['accessibility snapshot'];
		const dom = await bounded((ms) => page.locator('body').ariaSnapshot({ timeout: ms }));
		extra = { dom: dom.slice(0, 40000), truncated: dom.length > 40000 };
	} else if (input.command === 'wait') {
		after = await poll((state) =>
			input.stage === 'editor'
				? editorPending(state)
				: storyPending(storyFrom(state, input.story))
		);
	} else if (input.command === 'build') {
		if (!Number.isInteger(before.build?.revision))
			fail('INVALID_SNAPSHOT', 'Bridge must expose build.revision');
		if (before.build.state === 'processing')
			fail('BUILD_BUSY', 'A build is already processing; wait for it before building again');
		await poll(editorPending);
		pending = ['build control selection'];
		const rebuild = page.getByRole('button', { name: 'Rebuild project', exact: true });
		const locator =
			(await bounded(() => rebuild.count())) > 0
				? await unique(rebuild, 'button "Rebuild project"')
				: await target('button', 'Build');
		await act(locator, 'click', undefined, async () => {
			const current = await bounded(() => snapshot());
			checkIdentity(current);
			if (current.build?.revision !== before.build.revision) {
				fail(
					'STALE_ACTION',
					'Build changed before clicking; inspect a fresh snapshot before retrying'
				);
			}
			const reasons = editorPending(current);
			if (reasons.length) {
				fail(
					'ACTION_NOT_READY',
					'Editor readiness changed before clicking; wait for editor readiness and retry',
					{ pending: reasons }
				);
			}
		});
		after = await poll((state) => {
			const reasons = [];
			if (!(state.build?.revision > before.build.revision))
				reasons.push(`build revision greater than ${before.build.revision}`);
			if (!['built', 'errored'].includes(state.build?.state))
				reasons.push(`terminal build (currently ${state.build?.state})`);
			if (
				state.build?.state === 'built' &&
				state.build.projectVersion !== before.project.version
			) {
				reasons.push('built artifacts for current project version');
			}
			return reasons;
		});
		extra = { build: after.build };
	} else if (input.command === 'story') {
		const initial = storyFrom(before, input.story);
		if (!initial) fail('MISSING_STORY', `Story ${JSON.stringify(input.story)} is not present`);
		const expectedMode = input.action === 'pause' ? 'auto' : 'manual';
		if (initial.playback?.mode !== expectedMode)
			fail('IRRELEVANT_ACTION', `${input.action} requires ${expectedMode} playback mode`);
		if (['step', 'play'].includes(input.action) && initial.finished)
			fail('IRRELEVANT_ACTION', 'Story is finished; reset it first');
		// Pause must remain usable during auto playback, including an in-flight render.
		if (input.action !== 'pause')
			await poll((state) => storyPending(storyFrom(state, input.story)));
		const name = input.action[0].toUpperCase() + input.action.slice(1);
		const locator = await target('button', name, input.story);
		const current = await bounded(() => snapshot());
		checkIdentity(current);
		const ready = storyFrom(current, input.story);
		if (
			!ready ||
			ready.id !== initial.id ||
			ready.playback?.mode !== expectedMode ||
			(input.action !== 'pause' && storyPending(ready).length)
		) {
			fail(
				'IRRELEVANT_ACTION',
				'Story changed while locating controls; take a fresh snapshot and retry'
			);
		}
		await act(locator, 'click');
		after = await poll((state) => {
			const story = storyFrom(state, input.story);
			if (!story || story.id !== initial.id)
				fail(
					'STALE_ACTION',
					'Story was removed or replaced; take a fresh snapshot and retry'
				);
			if (input.action === 'play' || input.action === 'pause') {
				const mode = input.action === 'play' ? 'auto' : 'manual';
				return story.playback?.mode === mode ? [] : [`playback mode ${mode}`];
			}
			return storyPending(story);
		});
	} else {
		await act(await target(input.role, input.name, input.story), input.command, input.value);
	}
	after ??= await bounded(() => snapshot());
	if (['click', 'fill', 'press', 'select'].includes(input.command)) {
		const generationChanged = before.generation !== after.generation;
		extra = {
			effectVerified: false,
			generationChanged,
			...(generationChanged
				? {
						warning:
							'Host generation changed during the action; effects are unverified. Inspect the fresh snapshot before retrying; the action may already have taken effect.',
					}
				: {}),
		};
	}
	return {
		command: input.command,
		generationBefore: before.generation,
		generationAfter: after.generation,
		url: page.url(),
		snapshot: after,
		...extra,
	};
}
