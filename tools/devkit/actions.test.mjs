import assert from 'node:assert/strict';
import test from 'node:test';
import { executeAction } from './actions.mjs';

function state() {
	return {
		generation: 'host-1',
		compilerReady: true,
		project: { version: 4 },
		editor: {
			mounted: true,
			globalsReady: true,
			compiledProjectVersion: 4,
			loadingOverlayVisible: false,
		},
		build: { state: 'built', revision: 2, projectVersion: 4, errors: [] },
		stories: [
			{
				id: 'one',
				title: 'Example',
				tick: 1,
				finished: false,
				playback: { mode: 'manual', speed: '1x' },
				renderPending: false,
				heap: { objects: [{ address: 'one' }] },
			},
		],
	};
}

function fixture(options = {}) {
	const calls = [];
	let current = state();
	const locator = {
		count: async () => options.count ?? 1,
		isEnabled: async () => options.enabled ?? true,
		getByRole: (role, config) => {
			calls.push(['scoped', role, config]);
			return locator;
		},
		click: async (config) => {
			calls.push(['click', config]);
			await options.onClick?.(current);
		},
		fill: async (...args) => calls.push(['fill', ...args]),
		press: async (...args) => calls.push(['press', ...args]),
		selectOption: async (...args) => calls.push(['select', ...args]),
		ariaSnapshot: async () => options.dom ?? '- button "Build"',
	};
	const page = {
		getByRole: (role, config) => {
			calls.push(['role', role, config]);
			if (options.targets?.[config.name]) return options.targets[config.name];
			if (config.name === 'Rebuild project') return { ...locator, count: async () => 0 };
			return locator;
		},
		locator: (selector) => {
			assert.equal(selector, 'body');
			return locator;
		},
		url: () => 'http://localhost/fixture',
	};
	let reads = 0;
	const snapshot = async () => {
		reads++;
		await options.onSnapshot?.(current, reads);
		return structuredClone(current);
	};
	return { page, snapshot, calls, current, locator };
}

const rejectsCode = (operation, code) =>
	assert.rejects(operation, (error) => {
		assert.equal(error.code, code, error.message);
		return true;
	});

test('schemas reject unknown fields, commands, roles, invalid bounds and missing values before reading', async () => {
	const invalid = [
		null,
		[],
		{},
		{ command: ['build'] },
		{ command: 'evaluate', value: 'alert(1)' },
		{ command: 'constructor' },
		{ command: 'dom', timeout: 10 },
		{ command: 'build', path: 'file.ts' },
		{ command: 'build', timeout: 30001 },
		{ command: 'build', timeout: 0 },
		{ command: 'build', timeout: 1.5 },
		{ command: 'build', timeout: '100' },
		{ command: 'build', timeout: undefined },
		{ command: 'click', role: 'body', name: 'X' },
		{ command: 'click', role: 'button', name: 'X', value: 'unused' },
		{ command: 'click', role: 'button', name: '' },
		{ command: 'click', role: 'button', name: 'x'.repeat(1001) },
		{ command: 'click', role: 'button', name: 'X', story: '' },
		{ command: 'click', role: 'button', name: 'X', story: 'x'.repeat(1001) },
		{ command: 'fill', role: 'textbox', name: 'Code' },
		{ command: 'fill', role: 'textbox', name: 'Code', value: 'x'.repeat(16001) },
		{ command: 'select', role: 'combobox', name: 'X', value: ['one'] },
		{ command: 'press', role: 'textbox', name: 'X', value: '' },
		{ command: 'wait', stage: 'unknown' },
		{ command: 'wait', stage: 'editor', story: 'Example' },
		{ command: 'story', story: 'Example', action: 'run' },
		{ command: 'story', action: 'step' },
	];
	for (const input of invalid) {
		await rejectsCode(
			() => executeAction({}, () => assert.fail('must validate first'), input),
			'INVALID_ACTION'
		);
	}
});

test('generic actions use exact scoped roles, bounded options and return observation metadata', async () => {
	for (const command of ['click', 'fill', 'press', 'select']) {
		const f = fixture();
		const input = { command, role: 'button', name: 'Target', story: 'Example', timeout: 500 };
		if (command !== 'click') input.value = command === 'fill' ? '' : 'Option';
		const result = await executeAction(f.page, f.snapshot, input);
		assert.deepEqual(f.calls[0], ['role', 'region', { name: 'Story Example', exact: true }]);
		assert.deepEqual(f.calls[1], ['scoped', 'button', { name: 'Target', exact: true }]);
		const action = f.calls[2];
		assert.equal(action[0], command);
		assert.ok(action.at(-1).timeout > 0 && action.at(-1).timeout <= 500);
		if (command === 'select') assert.deepEqual(action[1], { label: 'Option' });
		assert.equal(result.generationBefore, 'host-1');
		assert.equal(result.generationAfter, 'host-1');
		assert.equal(result.generationChanged, false);
		assert.equal(result.effectVerified, false);
		assert.equal(result.warning, undefined);
		assert.equal(result.url, 'http://localhost/fixture');
		assert.equal(result.snapshot.project.version, 4);
	}
});

test('generic actions report changed generations without promising effects or automatically retrying', async () => {
	for (const command of ['click', 'fill', 'press', 'select']) {
		const f = fixture({
			onSnapshot: (s, reads) => {
				if (reads === 2) s.generation = 'host-2';
			},
		});
		const input = { command, role: 'button', name: 'Target' };
		if (command !== 'click') input.value = 'Value';
		const result = await executeAction(f.page, f.snapshot, input);
		assert.equal(result.generationBefore, 'host-1');
		assert.equal(result.generationAfter, 'host-2');
		assert.equal(result.snapshot.generation, 'host-2');
		assert.equal(result.generationChanged, true);
		assert.equal(result.effectVerified, false);
		assert.match(result.warning, /Inspect the fresh snapshot before retrying/);
		assert.equal(f.calls.filter(([kind]) => kind === command).length, 1);
	}
});

test('missing, ambiguous and disabled targets are action errors; never click first match', async () => {
	for (const [options, code] of [
		[{ count: 0 }, 'MISSING_TARGET'],
		[{ count: 2 }, 'AMBIGUOUS_TARGET'],
		[{ enabled: false }, 'DISABLED_TARGET'],
	]) {
		const f = fixture(options);
		await rejectsCode(
			() =>
				executeAction(f.page, f.snapshot, {
					command: 'click',
					role: 'button',
					name: 'Build',
				}),
			code
		);
		assert.ok(!f.calls.some(([kind]) => kind === 'click'));
	}
	const f = fixture({ count: 2 });
	await rejectsCode(
		() =>
			executeAction(f.page, f.snapshot, {
				command: 'click',
				role: 'button',
				name: 'Step',
				story: 'Example',
			}),
		'AMBIGUOUS_TARGET'
	);
	assert.equal(f.calls.length, 1);
});

test('dom is a bounded aria snapshot', async () => {
	const f = fixture({ dom: 'a'.repeat(40001) });
	const result = await executeAction(f.page, f.snapshot, { command: 'dom' });
	assert.equal(result.dom.length, 40000);
	assert.equal(result.truncated, true);
});

test('wait editor checks all readiness fields and reports pending details', async () => {
	const f = fixture();
	f.current.compilerReady = false;
	f.current.editor = {};
	await assert.rejects(
		() => executeAction(f.page, f.snapshot, { command: 'wait', stage: 'editor', timeout: 15 }),
		(error) => {
			assert.equal(error.code, 'ACTION_TIMEOUT');
			assert.deepEqual(error.details.pending, [
				'compiler readiness',
				'editor mount',
				'global declarations',
				'initial compilation completion',
				'loading overlay dismissal',
			]);
			return true;
		}
	);
	const ready = fixture();
	ready.current.project.version = 0;
	ready.current.editor.compiledProjectVersion = 1;
	const result = await executeAction(ready.page, ready.snapshot, {
		command: 'wait',
		stage: 'editor',
	});
	assert.equal(result.snapshot.project.version, 0);
	assert.equal(result.snapshot.editor.compiledProjectVersion, 1);
});

test('editor wait requires initial compilation, not a counter matching the project version', async () => {
	const f = fixture();
	f.current.project.version = 0;
	f.current.editor.compiledProjectVersion = 0;
	await assert.rejects(
		() => executeAction(f.page, f.snapshot, { command: 'wait', stage: 'editor', timeout: 15 }),
		(error) => {
			assert.equal(error.code, 'ACTION_TIMEOUT');
			assert.deepEqual(error.details.pending, ['initial compilation completion']);
			return true;
		}
	);
	f.current.project.version = 9;
	f.current.editor.compiledProjectVersion = 1;
	await executeAction(f.page, f.snapshot, { command: 'wait', stage: 'editor' });
});

test('story wait requires hydrated objects and no pending render; rejects ambiguous stories', async () => {
	for (const edit of [
		(s) => {
			s.stories[0].heap.objects = [];
		},
		(s) => {
			s.stories[0].renderPending = true;
		},
		(s) => {
			s.stories = [];
		},
	]) {
		const f = fixture();
		edit(f.current);
		await rejectsCode(
			() =>
				executeAction(f.page, f.snapshot, { command: 'wait', stage: 'story', timeout: 10 }),
			'ACTION_TIMEOUT'
		);
	}
	const f = fixture();
	await executeAction(f.page, f.snapshot, { command: 'wait', stage: 'story' });
	f.current.stories.push(structuredClone(f.current.stories[0]));
	await rejectsCode(
		() =>
			executeAction(f.page, f.snapshot, {
				command: 'wait',
				stage: 'story',
				story: 'Example',
			}),
		'AMBIGUOUS_STORY'
	);
});

test('build waits for newer revision, not the old terminal state', async () => {
	let clicked = false;
	let polls = 0;
	const f = fixture({
		onClick: () => {
			clicked = true;
		},
		onSnapshot: (s) => {
			if (clicked && ++polls === 2)
				s.build = { ...s.build, revision: 3, state: 'processing' };
			if (clicked && polls === 3) s.build = { ...s.build, revision: 4, state: 'built' };
		},
	});
	const result = await executeAction(f.page, f.snapshot, { command: 'build', timeout: 1000 });
	assert.equal(polls, 3);
	assert.equal(result.build.revision, 4);
	assert.deepEqual(f.calls[0], ['role', 'button', { name: 'Rebuild project', exact: true }]);
	assert.deepEqual(f.calls[1], ['role', 'button', { name: 'Build', exact: true }]);
});

test('build prefers the unique rebuild control and never clicks the covered toolbar', async () => {
	const targets = {};
	const f = fixture({
		targets,
		onClick: (s) => {
			s.build.revision++;
		},
	});
	targets['Rebuild project'] = f.locator;
	targets.Build = { ...f.locator, click: async () => assert.fail('covered toolbar') };
	await executeAction(f.page, f.snapshot, { command: 'build' });
	assert.deepEqual(
		f.calls.filter(([kind]) => kind === 'role'),
		[['role', 'button', { name: 'Rebuild project', exact: true }]]
	);
	assert.equal(f.calls.filter(([kind]) => kind === 'click').length, 1);
});

test('build rejects ambiguous rebuild or fallback Build controls without choosing first', async () => {
	for (const name of ['Rebuild project', 'Build']) {
		const targets = {};
		const f = fixture({ targets });
		targets[name] = { ...f.locator, count: async () => 2 };
		await rejectsCode(
			() => executeAction(f.page, f.snapshot, { command: 'build' }),
			'AMBIGUOUS_TARGET'
		);
		assert.ok(!f.calls.some(([kind]) => kind === 'click'));
	}
});

test('disabled rebuild control does not fall back to the toolbar', async () => {
	const targets = {};
	const f = fixture({ targets });
	targets['Rebuild project'] = { ...f.locator, isEnabled: async () => false };
	await rejectsCode(
		() => executeAction(f.page, f.snapshot, { command: 'build' }),
		'DISABLED_TARGET'
	);
	assert.equal(f.calls.length, 1);
});

test('build waits for editor readiness before choosing a control', async () => {
	let ready = false;
	const targets = {};
	const f = fixture({
		targets,
		onSnapshot: (s, reads) => {
			if (reads === 3) {
				ready = true;
				s.editor.loadingOverlayVisible = false;
			}
		},
		onClick: (s) => {
			s.build.revision++;
		},
	});
	f.current.editor.loadingOverlayVisible = true;
	targets['Rebuild project'] = {
		...f.locator,
		count: async () => {
			assert.equal(ready, true);
			return 1;
		},
	};
	await executeAction(f.page, f.snapshot, { command: 'build', timeout: 500 });
});

test('build detects project changes while waiting and immediately before click', async () => {
	for (const phase of ['waiting', 'click']) {
		const f = fixture({
			onSnapshot: (s, reads) => {
				if (phase === 'waiting' && reads === 2) s.project.version++;
			},
		});
		if (phase === 'waiting') f.current.editor.loadingOverlayVisible = true;
		else
			f.locator.isEnabled = async () => {
				f.current.project.version++;
				return true;
			};
		await rejectsCode(
			() => executeAction(f.page, f.snapshot, { command: 'build' }),
			'STALE_ACTION'
		);
		assert.ok(!f.calls.some(([kind]) => kind === 'click'));
	}
});

test('build rechecks readiness after target selection before clicking', async () => {
	const f = fixture();
	f.locator.isEnabled = async () => {
		f.current.editor.loadingOverlayVisible = true;
		return true;
	};
	await rejectsCode(
		() => executeAction(f.page, f.snapshot, { command: 'build' }),
		'ACTION_NOT_READY'
	);
	assert.ok(!f.calls.some(([kind]) => kind === 'click'));
});

test('build accepts direct errored preflight and returns structured diagnostics', async () => {
	const errors = [{ message: 'Type mismatch', code: 123, fileName: 'model.ts' }];
	const f = fixture({
		onClick: (s) => {
			s.build = { state: 'errored', revision: 3, projectVersion: null, errors };
		},
	});
	const result = await executeAction(f.page, f.snapshot, { command: 'build' });
	assert.equal(result.build.state, 'errored');
	assert.deepEqual(result.build.errors, errors);
});

test('unchanged revisions, processing, and wrong artifact versions do not complete a build', async () => {
	for (const build of [
		{ state: 'built', revision: 2, projectVersion: 4 },
		{ state: 'processing', revision: 3 },
		{ state: 'built', revision: 3, projectVersion: 3 },
	]) {
		const f = fixture({
			onClick: (s) => {
				s.build = build;
			},
		});
		await rejectsCode(
			() => executeAction(f.page, f.snapshot, { command: 'build', timeout: 15 }),
			'ACTION_TIMEOUT'
		);
	}
});

test('generation and project changes fail builds with actionable stale error', async () => {
	for (const change of [
		(s) => {
			s.generation = 'host-2';
		},
		(s) => {
			s.project.version++;
		},
	]) {
		const f = fixture({ onClick: change });
		await assert.rejects(
			() => executeAction(f.page, f.snapshot, { command: 'build' }),
			(error) => {
				assert.equal(error.code, 'STALE_ACTION');
				assert.match(error.message, /fresh snapshot and retry/);
				return true;
			}
		);
	}
});

test('build refuses an already processing build or missing revision', async () => {
	for (const [build, code] of [
		[{ state: 'processing', revision: 1 }, 'BUILD_BUSY'],
		[{ state: 'built' }, 'INVALID_SNAPSHOT'],
	]) {
		const f = fixture();
		f.current.build = build;
		await rejectsCode(() => executeAction(f.page, f.snapshot, { command: 'build' }), code);
		assert.equal(f.calls.length, 0);
	}
});

test('story play/pause click the actual scoped control and wait for auto/manual mode', async () => {
	for (const action of ['play', 'pause']) {
		const f = fixture({
			onClick: (s) => {
				s.stories[0].playback.mode = action === 'play' ? 'auto' : 'manual';
			},
		});
		f.current.stories[0].playback.mode = action === 'play' ? 'manual' : 'auto';
		if (action === 'pause') f.current.stories[0].renderPending = true;
		const result = await executeAction(f.page, f.snapshot, {
			command: 'story',
			story: 'Example',
			action,
		});
		assert.deepEqual(f.calls[1], [
			'scoped',
			'button',
			{ name: action === 'play' ? 'Play' : 'Pause', exact: true },
		]);
		assert.equal(
			result.snapshot.stories[0].playback.mode,
			action === 'play' ? 'auto' : 'manual'
		);
	}
});

test('step/reset wait through rendering and allow synchronous render completion', async () => {
	for (const action of ['step', 'reset']) {
		for (const synchronous of [false, true]) {
			let clicked = false;
			let polls = 0;
			const f = fixture({
				onClick: (s) => {
					clicked = true;
					s.stories[0].renderPending = !synchronous;
				},
				onSnapshot: (s) => {
					if (clicked && ++polls === 2) s.stories[0].renderPending = false;
				},
			});
			await executeAction(f.page, f.snapshot, {
				command: 'story',
				story: 'Example',
				action,
				timeout: 500,
			});
			assert.equal(polls, synchronous ? 1 : 2);
		}
	}
});

test('story rejects irrelevant modes and finished step instead of silently succeeding', async () => {
	const f = fixture();
	await rejectsCode(
		() =>
			executeAction(f.page, f.snapshot, {
				command: 'story',
				story: 'Example',
				action: 'pause',
			}),
		'IRRELEVANT_ACTION'
	);
	f.current.stories[0].finished = true;
	await rejectsCode(
		() =>
			executeAction(f.page, f.snapshot, {
				command: 'story',
				story: 'Example',
				action: 'step',
			}),
		'IRRELEVANT_ACTION'
	);
	assert.equal(f.calls.length, 0);
});

test('one shared deadline bounds stalled snapshots and passes only remaining time to clicks', async () => {
	const f = fixture();
	await rejectsCode(
		() => executeAction(f.page, () => new Promise(() => {}), { command: 'build', timeout: 15 }),
		'ACTION_TIMEOUT'
	);
	const delayed = fixture({
		onSnapshot: async () => new Promise((resolve) => setTimeout(resolve, 15)),
	});
	await executeAction(delayed.page, delayed.snapshot, {
		command: 'click',
		role: 'button',
		name: 'X',
		timeout: 100,
	});
	assert.ok(delayed.calls.find(([kind]) => kind === 'click')[1].timeout < 95);
});
