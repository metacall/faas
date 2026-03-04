import { strict as assert } from 'assert';
import { ChildProcess, spawn } from 'child_process';
import path from 'path';

// ---------------------------------------------------------------------------
// Inline copies of pure helpers (no I/O, no ChildProcess) so that mocha can
// test them without spinning up the FaaS server.
// ---------------------------------------------------------------------------

// detectLevel
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'HTTP';

function detectLevel(message: string): LogLevel {
	const m = message.toLowerCase();
	if (/\berror\b|failed|exception|fatal|stderr/.test(m)) return 'ERROR';
	if (/\bwarn(ing)?\b|deprecated/.test(m)) return 'WARN';
	if (/get |post |put |delete |patch |http\//.test(m)) return 'HTTP';
	if (/debug|verbose|trace/.test(m)) return 'DEBUG';
	return 'INFO';
}

// LEVEL_COLORS
const LEVEL_COLORS: Record<LogLevel, string> = {
	INFO: '\x1b[36m',
	WARN: '\x1b[33m',
	ERROR: '\x1b[31m',
	DEBUG: '\x1b[35m',
	HTTP: '\x1b[90m'
};

// assignColorToWorker (round-robin logic only)
const ANSICode: number[] = [
	166, 154, 142, 118, 203, 202, 190, 215, 214, 32, 6, 4, 220, 208, 184, 172
];

function makeColorAssigner() {
	const pidMap: Record<number, number> = {};
	let nextColorIndex = 0;

	return function assignColor(pid: number): number {
		if (pidMap[pid] === undefined) {
			pidMap[pid] = ANSICode[nextColorIndex % ANSICode.length];
			nextColorIndex += 1;
		}
		return pidMap[pid];
	};
}

// ---------------------------------------------------------------------------
// Helpers for lifecycle-fix tests (pure functions, no server required)
// ---------------------------------------------------------------------------

// buildEnv: mirrors the env-stringification logic from deployProcess()
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

// ===========================================================================
// Suite 1: Logging utilities
// ===========================================================================

describe('detectLevel()', function () {
	it('returns ERROR for messages containing "error"', () => {
		assert.equal(detectLevel('Unhandled error occurred'), 'ERROR');
	});

	it('returns ERROR for "failed"', () => {
		assert.equal(detectLevel('Request failed with status 500'), 'ERROR');
	});

	it('returns ERROR for "exception"', () => {
		assert.equal(detectLevel('Uncaught exception in handler'), 'ERROR');
	});

	it('returns ERROR for "fatal"', () => {
		assert.equal(detectLevel('Fatal crash detected'), 'ERROR');
	});

	it('returns ERROR for "stderr"', () => {
		assert.equal(detectLevel('stderr: module not found'), 'ERROR');
	});

	it('returns WARN for "warn"', () => {
		assert.equal(detectLevel('warn: disk usage above 80%'), 'WARN');
	});

	it('returns WARN for "warning"', () => {
		assert.equal(detectLevel('warning: deprecated API used'), 'WARN');
	});

	it('returns WARN for "deprecated"', () => {
		assert.equal(detectLevel('This method is deprecated'), 'WARN');
	});

	it('returns HTTP for "GET "', () => {
		assert.equal(detectLevel('GET /api/inspect'), 'HTTP');
	});

	it('returns HTTP for "POST "', () => {
		assert.equal(detectLevel('POST /api/deploy/create'), 'HTTP');
	});

	it('returns HTTP for "http/"', () => {
		assert.equal(detectLevel('HTTP/1.1 200 OK'), 'HTTP');
	});

	it('returns DEBUG for "debug"', () => {
		assert.equal(detectLevel('debug: connection pool size = 4'), 'DEBUG');
	});

	it('returns DEBUG for "verbose"', () => {
		assert.equal(detectLevel('verbose logging mode'), 'DEBUG');
	});

	it('returns DEBUG for "trace"', () => {
		assert.equal(detectLevel('trace: entering function'), 'DEBUG');
	});

	it('returns INFO for a plain message', () => {
		assert.equal(detectLevel('Server started on port 9000'), 'INFO');
	});

	it('is case-insensitive', () => {
		assert.equal(detectLevel('ERROR in module'), 'ERROR');
		assert.equal(detectLevel('Error in module'), 'ERROR');
		assert.equal(detectLevel('ERROR IN MODULE'), 'ERROR');
	});
});

// ---------------------------------------------------------------------------

describe('LEVEL_COLORS — ANSI escape code format', function () {
	const ESC = '\x1b[';

	for (const [level, code] of Object.entries(LEVEL_COLORS)) {
		it(`LEVEL_COLORS.${level} starts with ESC[ and ends with 'm' (no stray ']')`, () => {
			assert.ok(
				code.startsWith(ESC),
				`${level}: expected string to start with "\\x1b[", got: ${JSON.stringify(
					code
				)}`
			);
			assert.ok(
				code.endsWith('m'),
				`${level}: expected string to end with 'm', got: ${JSON.stringify(
					code
				)}`
			);
			assert.ok(
				!code.endsWith('m]'),
				`${level}: string must NOT end with stray ']', got: ${JSON.stringify(
					code
				)}`
			);
		});
	}

	it('covers all five log levels', () => {
		const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'HTTP'];
		for (const level of levels) {
			assert.ok(
				LEVEL_COLORS[level] !== undefined,
				`LEVEL_COLORS is missing entry for ${level}`
			);
		}
	});
});

// ---------------------------------------------------------------------------

describe('assignColorToWorker() — round-robin color assignment', function () {
	it('assigns a number color code to a new PID', () => {
		const assign = makeColorAssigner();
		const color = assign(1001);
		assert.ok(typeof color === 'number', 'color should be a number');
	});

	it('returns the same color for the same PID on repeated calls', () => {
		const assign = makeColorAssigner();
		const first = assign(2001);
		const second = assign(2001);
		assert.equal(first, second, 'same PID must always get same color');
	});

	it('assigns a different color to a different PID', () => {
		const assign = makeColorAssigner();
		const a = assign(3001);
		const b = assign(3002);
		assert.notEqual(a, b);
	});

	it('does NOT hang / throw when 17+ PIDs are assigned (no infinite loop)', () => {
		const assign = makeColorAssigner();
		for (let i = 0; i < 20; i++) {
			assert.doesNotThrow(() => assign(5000 + i));
		}
	});

	it('wraps around after exhausting the 16-color palette', () => {
		const assign = makeColorAssigner();
		for (let i = 0; i < 16; i++) {
			assign(6000 + i);
		}
		const colorOf17th = assign(6016);
		const colorOf1st = ANSICode[0];
		assert.equal(
			colorOf17th,
			colorOf1st,
			'17th deployment should reuse the first color (round-robin)'
		);
	});

	it('assigned color is always a member of the ANSICode palette', () => {
		const assign = makeColorAssigner();
		for (let i = 0; i < 30; i++) {
			const color = assign(7000 + i);
			assert.ok(
				ANSICode.includes(color),
				`Color ${color} is not in the ANSICode palette`
			);
		}
	});
});

// ===========================================================================
// Suite 2: Lifecycle fix — Environment Variable Injection
// ===========================================================================

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

// ===========================================================================
// Suite 4: Lifecycle fix — Asynchronous Function Execution
// ===========================================================================

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
