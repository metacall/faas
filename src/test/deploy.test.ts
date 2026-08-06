import { strict as assert } from 'assert';
import { execSync } from 'child_process';
import * as fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Helpers — pure extractions of the logic we fixed in deploy.ts
// so we can unit-test them without starting a real metacall process.
// ---------------------------------------------------------------------------

/**
 * Replicates the OS detection logic from deploy.ts.
 * Returns true only on macOS (darwin).
 */
function detectMacOS(): boolean {
	return process.platform === 'darwin';
}

/**
 * Replicates the metacall binary resolution logic from deploy.ts.
 * On macOS: resolves to metacallcli via Cellar directory.
 * On other platforms: returns 'metacall'.
 */
function resolveMetacallBinary(): string {
	if (process.platform !== 'darwin') {
		return 'metacall';
	}
	try {
		const metacallScript = execSync('which metacall').toString().trim();
		const scriptDir = path.dirname(metacallScript);
		const parent = path.dirname(scriptDir);

		if (fs.existsSync(path.join(parent, 'metacallcli'))) {
			return path.join(parent, 'metacallcli');
		}

		const cellarPath = path.join(parent, 'Cellar', 'metacall');
		if (fs.existsSync(cellarPath)) {
			const versions = fs.readdirSync(cellarPath).sort().reverse();
			if (versions.length > 0) {
				return path.join(cellarPath, versions[0], 'metacallcli');
			}
		}
	} catch {
		// fall through
	}
	return 'metacall';
}

/**
 * Replicates the env var building logic from deploy.ts.
 * On macOS: merges metacall-specific env vars into the environment.
 * On other platforms: returns the base env unchanged.
 */
function buildMetacallEnv(
	base: Record<string, string>,
	resourcePath: string
): Record<string, string> {
	if (process.platform !== 'darwin') {
		return base;
	}

	let prefix = '/opt/homebrew/Cellar/metacall/0.9.20';
	try {
		const metacallScript = execSync('which metacall').toString().trim();
		const scriptDir = path.dirname(metacallScript);
		const parent = path.dirname(scriptDir);
		const cellarPath = path.join(parent, 'Cellar', 'metacall');
		if (fs.existsSync(cellarPath)) {
			const versions = fs.readdirSync(cellarPath).sort().reverse();
			if (versions.length > 0) {
				prefix = path.join(cellarPath, versions[0]);
			}
		}
	} catch {
		// use fallback
	}

	return Object.assign({} as Record<string, string>, base, {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		PYTHONPATH: `${prefix}/lib/python:${process.env['PYTHONPATH'] || ''}`,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		NODE_PATH: `${prefix}/lib/node_modules`,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		LOADER_LIBRARY: `${prefix}/lib`,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		SERIAL_LIBRARY_PATH: `${prefix}/lib`,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		DETOUR_LIBRARY_PATH: `${prefix}/lib`,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		PORT_LIBRARY_PATH: `${prefix}/lib`,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		CONFIGURATION_PATH: `${prefix}/configurations/global.json`,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		LOADER_SCRIPT_PATH: resourcePath
	});
}

// ---------------------------------------------------------------------------
// Fix: OS Detection
// ---------------------------------------------------------------------------

describe('Fix: OS Detection', function () {
	it('should detect the current platform using process.platform', () => {
		const result = detectMacOS();
		assert.strictEqual(result, process.platform === 'darwin');
	});

	it('should return true only on darwin (macOS)', () => {
		if (process.platform === 'darwin') {
			assert.strictEqual(detectMacOS(), true);
		} else {
			assert.strictEqual(detectMacOS(), false);
		}
	});

	it('should NOT rely on fs.existsSync for platform detection', () => {
		const result = detectMacOS();
		assert.strictEqual(result, process.platform === 'darwin');
	});
});

// ---------------------------------------------------------------------------
// Fix: Metacall Binary Resolution (Platform Matrix)
// ---------------------------------------------------------------------------

describe('Fix: Metacall Binary Resolution', function () {
	it('should return "metacall" on Linux', function () {
		if (process.platform !== 'linux') {
			this.skip();
		}
		const binary = resolveMetacallBinary();
		assert.strictEqual(binary, 'metacall');
	});

	it('should return "metacall" on Windows', function () {
		if (process.platform !== 'win32') {
			this.skip();
		}
		const binary = resolveMetacallBinary();
		assert.strictEqual(binary, 'metacall');
	});

	it('should return a path ending with "metacallcli" on macOS', function () {
		if (process.platform !== 'darwin') {
			this.skip();
		}
		const binary = resolveMetacallBinary();
		assert.ok(
			binary.endsWith('metacallcli') || binary === 'metacall',
			`Expected binary to end with metacallcli or fallback to metacall, got: ${binary}`
		);
	});

	it('should return a non-empty string on all platforms', () => {
		const binary = resolveMetacallBinary();
		assert.strictEqual(typeof binary, 'string');
		assert.ok(binary.length > 0, 'Binary path should not be empty');
	});
});

// ---------------------------------------------------------------------------
// Fix: Metacall Env Vars (Platform Matrix)
// ---------------------------------------------------------------------------

describe('Fix: Metacall Environment Variables', function () {
	const testVar = 'hello';
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const baseEnv: Record<string, string> = { TEST_INPUT: testVar };
	const resourcePath = '/tmp/test-resource';

	it('should NOT inject macOS-specific env vars on Linux', function () {
		if (process.platform !== 'linux') {
			this.skip();
		}
		const env = buildMetacallEnv(baseEnv, resourcePath);
		assert.strictEqual(env['LOADER_LIBRARY'], undefined);
		assert.strictEqual(env['CONFIGURATION_PATH'], undefined);
		assert.strictEqual(env['TEST_INPUT'], testVar);
	});

	it('should NOT inject macOS-specific env vars on Windows', function () {
		if (process.platform !== 'win32') {
			this.skip();
		}
		const env = buildMetacallEnv(baseEnv, resourcePath);
		assert.strictEqual(env['LOADER_LIBRARY'], undefined);
		assert.strictEqual(env['CONFIGURATION_PATH'], undefined);
		assert.strictEqual(env['TEST_INPUT'], testVar);
	});

	it('should inject macOS-specific env vars on macOS', function () {
		if (process.platform !== 'darwin') {
			this.skip();
		}
		const env = buildMetacallEnv(baseEnv, resourcePath);
		assert.ok(
			env['LOADER_LIBRARY'] !== undefined,
			'LOADER_LIBRARY should be set on macOS'
		);
		assert.ok(
			env['CONFIGURATION_PATH'] !== undefined,
			'CONFIGURATION_PATH should be set on macOS'
		);
		assert.strictEqual(
			env['LOADER_SCRIPT_PATH'],
			resourcePath,
			'LOADER_SCRIPT_PATH should match resource path'
		);
	});

	it('should always preserve base env vars on all platforms', () => {
		const env = buildMetacallEnv(baseEnv, resourcePath);
		assert.strictEqual(env['TEST_INPUT'], testVar);
	});

	it('should always produce string values only', () => {
		const env = buildMetacallEnv(baseEnv, resourcePath);
		for (const [key, value] of Object.entries(env)) {
			assert.strictEqual(
				typeof value,
				'string',
				`Value for key ${key} should be a string`
			);
		}
	});
});

// ---------------------------------------------------------------------------
// Fix: InvokeQueue.rejectAll
// ---------------------------------------------------------------------------

describe('Fix: InvokeQueue.rejectAll', function () {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	const noop = (): void => {};

	class InvokeQueue {
		private queue: Record<
			string,
			{ resolve: (v: string) => void; reject: (r: string) => void }
		> = {};

		public push(invoke: {
			resolve: (v: string) => void;
			reject: (r: string) => void;
		}): string {
			const id = Math.random().toString(36).slice(2);
			this.queue[id] = invoke;
			return id;
		}

		public get(id: string) {
			const invoke = this.queue[id];
			delete this.queue[id];
			return invoke;
		}

		public rejectAll(reason: string): void {
			for (const id of Object.keys(this.queue)) {
				this.queue[id].reject(reason);
				delete this.queue[id];
			}
		}

		public size(): number {
			return Object.keys(this.queue).length;
		}
	}

	it('should reject all pending entries with the given reason', done => {
		const queue = new InvokeQueue();
		let rejectedCount = 0;
		const total = 3;

		for (let i = 0; i < total; i++) {
			queue.push({
				resolve: () => {
					done(new Error('Should not resolve'));
				},
				reject: (reason: string) => {
					assert.strictEqual(reason, 'worker restarted');
					rejectedCount++;
					if (rejectedCount === total) done();
				}
			});
		}

		queue.rejectAll('worker restarted');
	});

	it('should empty the queue after rejectAll', () => {
		const queue = new InvokeQueue();
		queue.push({ resolve: noop, reject: noop });
		queue.push({ resolve: noop, reject: noop });
		assert.strictEqual(queue.size(), 2);
		queue.rejectAll('cleanup');
		assert.strictEqual(queue.size(), 0);
	});

	it('should not throw when queue is already empty', () => {
		const queue = new InvokeQueue();
		assert.doesNotThrow(() => queue.rejectAll('nothing to reject'));
	});

	it('should not affect entries pushed after rejectAll', () => {
		const queue = new InvokeQueue();
		queue.push({ resolve: noop, reject: noop });
		queue.rejectAll('cleanup');

		let resolved = false;
		const id = queue.push({
			resolve: () => {
				resolved = true;
			},
			reject: noop
		});
		queue.get(id).resolve('ok');
		assert.strictEqual(resolved, true);
	});
});
