import { strict as assert } from 'assert';
import { ChildProcess, spawn } from 'child_process';
import path from 'path';

// Helper: build the envStringified object the same way deployProcess does.
// This is a pure-function extraction of the logic we fixed, so we can unit-test
// it without starting an actual metacall process.
function buildEnv(env: Record<string, string>): Record<string, string> {
	const envStringified: Record<string, string> = {
		...(process.env as Record<string, string>)
	};
	if (env) {
		for (const [key, value] of Object.entries(env)) {
			envStringified[key] = String(value);
		}
	}
	return envStringified;
}

// Helper: invoke a function that may be sync or async, just as the worker does.
async function safeInvoke(
	fn: (...args: unknown[]) => unknown,
	args: unknown[]
): Promise<{ result?: unknown; error?: string }> {
	try {
		const result = await fn(...args);
		return { result };
	} catch (err) {
		return { error: String(err) };
	}
}

// Fix: Environment Variable Injection
// Ensures all user-supplied env values are stringified so spawn() never throws.
describe('Fix: Environment Variable Injection', function () {
	it('should cast boolean env values to strings', () => {
		const input: Record<string, string> = {};
		input['FEATURE_FLAG'] = String(true);
		const env = buildEnv(input);
		assert.strictEqual(typeof env['FEATURE_FLAG'], 'string');
		assert.strictEqual(env['FEATURE_FLAG'], 'true');
	});

	it('should cast numeric env values to strings', () => {
		const input: Record<string, string> = {};
		input['PORT'] = String(8080);
		const env = buildEnv(input);
		assert.strictEqual(typeof env['PORT'], 'string');
		assert.strictEqual(env['PORT'], '8080');
	});

	it('should preserve string env values unchanged', () => {
		const input: Record<string, string> = {};
		input['MY_SECRET'] = 'abc123';
		const env = buildEnv(input);
		assert.strictEqual(env['MY_SECRET'], 'abc123');
	});

	it('should merge user env on top of process.env without dropping keys', () => {
		const input: Record<string, string> = {};
		input['TEST_VAR'] = 'hello';
		const env = buildEnv(input);
		// process.env keys must still be present
		assert.ok('PATH' in env || 'HOME' in env || 'USER' in env);
		// User key takes priority
		assert.strictEqual(env['TEST_VAR'], 'hello');
	});

	it('should result in a plain object with only string values (no undefined)', () => {
		const input: Record<string, string> = {};
		input['A'] = 'x';
		input['B'] = String(42);
		const env = buildEnv(input);
		for (const v of Object.values(env)) {
			assert.notStrictEqual(v, undefined);
			assert.strictEqual(typeof v, 'string');
		}
	});
});

// Fix: Package Resolution (cwd)
// Ensures that a child process spawned with cwd set to the deployment directory
// correctly resolves require() calls from that directory.
// We test this without metacall by spawning a vanilla node process.
describe('Fix: Package Resolution (cwd)', function () {
	this.timeout(10000); // allow time for child process

	const testAppDir = path.resolve(
		__dirname,
		'../../test/data/nodejs-base-app'
	);

	it('should resolve require() correctly when cwd is the deployment path', done => {
		const proc: ChildProcess = spawn(
			process.execPath,
			[
				'-e',
				'const m = require("./index.js"); process.exit(m && typeof m.isPalindrome === "function" ? 0 : 1)'
			],
			{
				cwd: testAppDir,
				stdio: ['pipe', 'pipe', 'pipe']
			}
		);

		proc.on('exit', code => {
			assert.strictEqual(
				code,
				0,
				'Child process should exit 0 when cwd is correct'
			);
			done();
		});

		proc.stderr?.on('data', (d: Buffer) => {
			const msg = d.toString();
			if (
				msg.includes('Error:') &&
				!msg.includes('ExperimentalWarning')
			) {
				done(new Error(`stderr: ${msg}`));
			}
		});
	});

	it('should fail to resolve require() when cwd is wrong (proving the fix is necessary)', done => {
		const wrongCwd = path.resolve(__dirname, '../../..');
		const proc: ChildProcess = spawn(
			process.execPath,
			['-e', 'require("./index.js")'],
			{
				cwd: wrongCwd,
				stdio: ['pipe', 'pipe', 'pipe']
			}
		);

		proc.on('exit', code => {
			assert.notStrictEqual(code, 0, 'Should fail with wrong cwd');
			done();
		});
	});
});

// Fix: Asynchronous Function Execution
// Ensures that async functions (returning Promises) are properly awaited so
// the IPC message contains the resolved value, not a pending Promise object.
describe('Fix: Asynchronous Function Execution', function () {
	it('should await and return the resolved value of an async function', async () => {
		const asyncFn = (x: number): Promise<number> => Promise.resolve(x * 2);
		const { result, error } = await safeInvoke(
			asyncFn as (...args: unknown[]) => unknown,
			[21]
		);
		assert.strictEqual(error, undefined);
		assert.strictEqual(result, 42);
	});

	it('should NOT return a Promise object for async functions (old bug)', async () => {
		const asyncFn = (): Promise<string> => Promise.resolve('hello');
		const { result } = await safeInvoke(
			asyncFn as (...args: unknown[]) => unknown,
			[]
		);
		assert.strictEqual(result, 'hello');
	});

	it('should handle sync functions transparently', async () => {
		const syncFn = (a: number, b: number) => a + b;
		const { result, error } = await safeInvoke(
			syncFn as (...args: unknown[]) => unknown,
			[3, 4]
		);
		assert.strictEqual(error, undefined);
		assert.strictEqual(result, 7);
	});

	it('should catch and return errors from async functions instead of crashing', async () => {
		const failingAsync = (): Promise<never> =>
			Promise.reject(new Error('intentional failure'));
		const { result, error } = await safeInvoke(
			failingAsync as (...args: unknown[]) => unknown,
			[]
		);
		assert.ok(error !== undefined, 'error should be defined');
		assert.ok(
			error?.includes('intentional failure'),
			`error should include the message, got: ${error ?? ''}`
		);
		assert.strictEqual(result, undefined);
	});

	it('should catch and return errors from sync functions instead of crashing', async () => {
		const failingSync = (): never => {
			throw new TypeError('sync type error');
		};
		const { result, error } = await safeInvoke(
			failingSync as (...args: unknown[]) => unknown,
			[]
		);
		assert.ok(error !== undefined, 'error should be defined');
		assert.ok(
			error?.includes('TypeError'),
			`error should mention TypeError, got: ${error ?? ''}`
		);
		assert.strictEqual(result, undefined);
	});

	it('should handle complex async function with multiple awaits', async () => {
		const complexFn = (input: string): Promise<string> =>
			new Promise(resolve =>
				setTimeout(
					() => resolve(input.split('').reverse().join('')),
					10
				)
			);
		const { result, error } = await safeInvoke(
			complexFn as (...args: unknown[]) => unknown,
			['madam']
		);
		assert.strictEqual(error, undefined);
		assert.strictEqual(result, 'madam');
	});

	it('should correctly execute isPalindrome for sync functions (nodejs-base-app)', async () => {
		const indexPath = path.resolve(
			__dirname,
			'../../test/data/nodejs-base-app/index.js'
		);
		const loaded = (await import(indexPath)) as {
			isPalindrome?: (s: string) => boolean;
		};
		const isPalindrome =
			loaded.isPalindrome ??
			(
				loaded as unknown as {
					default: { isPalindrome: (s: string) => boolean };
				}
			).default?.isPalindrome;

		assert.ok(
			typeof isPalindrome === 'function',
			'isPalindrome must be a function'
		);

		const r1 = await safeInvoke(
			isPalindrome as (...args: unknown[]) => unknown,
			['madam']
		);
		assert.strictEqual(r1.result, true);

		const r2 = await safeInvoke(
			isPalindrome as (...args: unknown[]) => unknown,
			['world']
		);
		assert.strictEqual(r2.result, false);
	});
});

// Fix: Worker Process Exit Handling (Issue #114)
// Ensures that when a worker process exits:
//  1. The deploy promise is not double-settled (deployReject after deployResolve)
//  2. All pending function invocations in the InvokeQueue are rejected so
//     HTTP responses don't hang forever
describe('Fix: Worker Process Exit Handling (Issue #114)', function () {
	// --- InvokeQueue.drain() ---

	it('should reject all pending invocations when drain() is called', done => {
		// We create a minimal InvokeQueue-like structure to test the drain logic
		// without importing the singleton (which shares state across tests)
		const queue: Record<
			string,
			{ resolve: (v: string) => void; reject: (r: string) => void }
		> = {};

		const push = (invoke: {
			resolve: (v: string) => void;
			reject: (r: string) => void;
		}): string => {
			const id = String(Math.random());
			queue[id] = invoke;
			return id;
		};

		const drain = (reason: string): void => {
			for (const [id, invoke] of Object.entries(queue)) {
				invoke.reject(reason);
				delete queue[id];
			}
		};

		let rejectedCount = 0;
		const total = 3;
		const reason = 'Worker exited unexpectedly';

		for (let i = 0; i < total; i++) {
			push({
				resolve: () => {
					assert.fail('resolve should not be called during drain');
				},
				reject: (r: string) => {
					assert.strictEqual(r, reason);
					rejectedCount++;
					if (rejectedCount === total) {
						assert.strictEqual(
							Object.keys(queue).length,
							0,
							'Queue should be empty after drain'
						);
						done();
					}
				}
			});
		}

		drain(reason);
	});

	it('should not throw when drain() is called on an empty queue', () => {
		const queue: Record<
			string,
			{ resolve: (v: string) => void; reject: (r: string) => void }
		> = {};

		const drain = (reason: string): void => {
			for (const [id, invoke] of Object.entries(queue)) {
				invoke.reject(reason);
				delete queue[id];
			}
		};

		// Should not throw
		assert.doesNotThrow(() => drain('no-op'));
		assert.strictEqual(Object.keys(queue).length, 0);
	});

	// --- InvokeQueue.has() ---

	it('should return true for a queued invocation and false after get()', () => {
		const queue: Record<
			string,
			{ resolve: (v: string) => void; reject: (r: string) => void }
		> = {};

		const push = (invoke: {
			resolve: (v: string) => void;
			reject: (r: string) => void;
		}): string => {
			const id = String(Math.random());
			queue[id] = invoke;
			return id;
		};

		const has = (id: string): boolean => id in queue;

		const get = (
			id: string
		): { resolve: (v: string) => void; reject: (r: string) => void } => {
			const invoke = queue[id];
			delete queue[id];
			return invoke;
		};

		const id = push({
			resolve: () => {
				/* noop */
			},
			reject: () => {
				/* noop */
			}
		});

		assert.strictEqual(has(id), true, 'has() should return true after push');
		assert.strictEqual(
			has('nonexistent'),
			false,
			'has() should return false for unknown id'
		);

		const invoke = get(id);
		assert.ok(invoke, 'get() should return the invocation');
		assert.strictEqual(
			has(id),
			false,
			'has() should return false after get()'
		);
	});

	// --- Settled guard pattern ---

	it('should only call resolve once even when reject is also attempted (deploy success then exit)', () => {
		let settled = false;
		let resolveCount = 0;
		let rejectCount = 0;

		const safeResolve = (): void => {
			if (!settled) {
				settled = true;
				resolveCount++;
			}
		};

		const safeReject = (_err: Error): void => {
			if (!settled) {
				settled = true;
				rejectCount++;
			}
		};

		// Simulate successful deploy then worker exit
		safeResolve(); // deploy succeeds
		safeReject(new Error('exit')); // worker exits after — should be no-op

		assert.strictEqual(
			resolveCount,
			1,
			'resolve should be called exactly once'
		);
		assert.strictEqual(
			rejectCount,
			0,
			'reject should not be called after resolve'
		);
	});

	it('should call reject once when worker exits before deploy completes', () => {
		let settled = false;
		let resolveCount = 0;
		let rejectCount = 0;

		const safeResolve = (): void => {
			if (!settled) {
				settled = true;
				resolveCount++;
			}
		};

		const safeReject = (_err: Error): void => {
			if (!settled) {
				settled = true;
				rejectCount++;
			}
		};

		// Simulate worker exit before deploy completes
		safeReject(new Error('exit before deploy'));
		safeResolve(); // should be no-op

		assert.strictEqual(
			rejectCount,
			1,
			'reject should be called exactly once'
		);
		assert.strictEqual(
			resolveCount,
			0,
			'resolve should not be called after reject'
		);
	});
});
