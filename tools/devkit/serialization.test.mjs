import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./serialization.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
	compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { createSerializer, observedClassName, observationLimits } = await import(
	`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

test('descriptor-only copies skip getters, hooks, inherited data and constructor accessors', () => {
	let calls = 0;
	class Counter {
		value = 0;
		get doubled() {
			calls++;
			return 0;
		}
	}
	const counter = new Counter();
	Object.defineProperty(counter, 'ownGetter', {
		get() {
			calls++;
			throw Error('getter');
		},
	});
	counter.toJSON = () => {
		calls++;
		throw Error('toJSON');
	};
	counter[Symbol.toPrimitive] = () => {
		calls++;
		throw Error('coercion');
	};
	const output = createSerializer()(counter);
	assert.deepEqual(output, { value: 0, ownGetter: '[Accessor]', toJSON: '[Function]' });
	assert.equal(observedClassName(counter), 'Counter');
	assert.doesNotThrow(() => JSON.stringify(output));
	Object.defineProperty(counter, 'constructor', {
		get() {
			calls++;
			return Counter;
		},
	});
	assert.equal(observedClassName(counter), null);
	assert.equal(calls, 0);
});

test('cycles, shared references, maps and sets use bounded plain representations', () => {
	const shared = { value: 1 };
	const root = { shared, again: shared };
	root.self = root;
	root.map = new Map([
		['first', shared],
		['cycle', root],
	]);
	root.set = new Set([shared, root]);
	root.map.entries = root.set.values = () => {
		throw Error('overridden method');
	};
	Object.defineProperty(root.map, 'size', {
		get() {
			throw Error('size getter');
		},
	});
	const result = createSerializer()(root);
	assert.deepEqual(result.shared, result.again);
	assert.equal(result.self, '[Circular]');
	assert.deepEqual(result.map, {
		$type: 'Map',
		entries: [
			['first', { value: 1 }],
			['cycle', '[Circular]'],
		],
		truncated: false,
	});
	assert.deepEqual(result.set, {
		$type: 'Set',
		values: [{ value: 1 }, '[Circular]'],
		truncated: false,
	});
	assert.doesNotThrow(() => JSON.stringify(result));
});

test('depth, width, strings and shared traversal budgets bound output', () => {
	const wide = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]));
	const wideResult = createSerializer()(wide);
	assert.equal(Object.keys(wideResult).length, observationLimits.entries + 1);
	assert.equal(wideResult.$truncated, true);
	assert.equal(createSerializer()(Array(100).fill(0)).length, observationLimits.entries + 1);
	assert.equal(
		createSerializer()(new Set(Array.from({ length: 100 }, (_, i) => i))).truncated,
		true
	);
	assert.equal(
		createSerializer()(new Map(Array.from({ length: 100 }, (_, i) => [i, i]))).entries.length,
		50
	);
	let deep = {};
	for (let i = 0; i < 100; i++) deep = { child: deep };
	assert.ok(JSON.stringify(createSerializer()(deep)).includes('[Truncated]'));
	assert.ok(createSerializer()('x'.repeat(100000)).length <= 2011);
	const serialize = createSerializer();
	const huge = Array.from({ length: 50 }, () =>
		Array.from({ length: 50 }, () => 'x'.repeat(10000))
	);
	const result = JSON.stringify(serialize(huge));
	assert.ok(result.length < 50000, `bounded serialized size: ${result.length}`);
	assert.equal(serialize({ another: true }), '[Truncated]');
});

test('array accessors, special values, __proto__ and revoked proxies are safe to stringify', () => {
	const array = [0, undefined, 1n, NaN, Infinity, Symbol('s')];
	Object.defineProperty(array, '0', {
		get() {
			throw Error('array getter');
		},
	});
	assert.deepEqual(createSerializer()(array), [
		'[Accessor]',
		'[Undefined]',
		'[BigInt]',
		'NaN',
		'Infinity',
		'[Symbol]',
	]);
	const source = JSON.parse('{"__proto__":{"polluted":true}}');
	const output = createSerializer()(source);
	assert.equal(Object.getPrototypeOf(output), Object.prototype);
	assert.deepEqual(output.__proto__, { polluted: true });
	assert.equal({}.polluted, undefined);
	const { proxy, revoke } = Proxy.revocable({}, {});
	revoke();
	assert.equal(createSerializer()(proxy), '[Uninspectable]');
	assert.equal(observedClassName(proxy), null);
});
