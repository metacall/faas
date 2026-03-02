import { strict as assert } from 'assert';
import { ChildProcess, execSync, spawn } from 'child_process';
import * as fsSync from 'fs';
import os from 'os';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { initializeAPI } from '../api';
import { Applications } from '../app';
import { catchAsync } from '../controller/catch';
import AppError from '../utils/appError';
import { configDir } from '../utils/config';
import { invokeQueue } from '../utils/invoke';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

// Check once at module load whether the metacall binary is on PATH.
// Integration suites that spawn workers skip themselves when it isn't.
let _metacallAvailable: boolean | undefined;
function hasMetacall(): boolean {
	if (_metacallAvailable === undefined) {
		try {
			execSync('which metacall', { stdio: 'pipe' });
			_metacallAvailable = true;
		} catch (_e) {
			_metacallAvailable = false;
		}
	}
	return _metacallAvailable;
}

// Helper: build the envStringified object the same way deployProcess does.
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

describe('AppError', function () {
	it('should set message correctly', function () {
		const err = new AppError('Not found', 404);
		assert.strictEqual(err.message, 'Not found');
	});

	it('should set statusCode correctly', function () {
		const err = new AppError('Not found', 404);
		assert.strictEqual(err.statusCode, 404);
	});

	it('should set status to "fail" for 4xx errors', function () {
		const err4xx = new AppError('Bad request', 400);
		assert.strictEqual(err4xx.status, 'fail');

		const err4xxAlt = new AppError('Unauthorized', 401);
		assert.strictEqual(err4xxAlt.status, 'fail');
	});

	it('should set status to "error" for 5xx errors', function () {
		const err5xx = new AppError('Internal error', 500);
		assert.strictEqual(err5xx.status, 'error');

		const err5xxAlt = new AppError('Bad gateway', 502);
		assert.strictEqual(err5xxAlt.status, 'error');
	});

	it('should be an instance of Error', function () {
		const err = new AppError('Bad request', 400);
		assert.ok(err instanceof Error);
	});

	it('should capture a stack trace', function () {
		const err = new AppError('Test error', 400);
		assert.ok(err.stack !== undefined);
	});
});

describe('InvokeQueue', function () {
	it('should push an invocation and return a non-empty hex string ID', function () {
		const id = invokeQueue.push({ resolve: noop, reject: noop });
		assert.strictEqual(typeof id, 'string');
		assert.ok(id.length > 0);
		assert.match(id, /^[0-9a-f]+$/);
		invokeQueue.get(id); // clean up
	});

	it('should generate unique IDs for different pushes', function () {
		const id1 = invokeQueue.push({ resolve: noop, reject: noop });
		const id2 = invokeQueue.push({ resolve: noop, reject: noop });
		assert.notStrictEqual(id1, id2);
		invokeQueue.get(id1);
		invokeQueue.get(id2); // clean up
	});

	it('should retrieve the same invocation that was pushed', function () {
		const invocation = { resolve: noop, reject: noop };
		const id = invokeQueue.push(invocation);
		const retrieved = invokeQueue.get(id);
		assert.strictEqual(retrieved, invocation);
	});

	it('should return undefined after the invocation is consumed', function () {
		const id = invokeQueue.push({ resolve: noop, reject: noop });
		invokeQueue.get(id);
		const result = invokeQueue.get(id);
		assert.strictEqual(result, undefined);
	});
});

describe('catchAsync', function () {
	it('should pass errors to next() when the handler rejects', function (done) {
		const error = new Error('async error');
		const handler = catchAsync((_req, _res, _next) =>
			Promise.reject(error)
		);

		const mockNext: NextFunction = (err?: unknown) => {
			assert.strictEqual(err, error);
			done();
		};

		handler({} as Request, {} as Response, mockNext);
	});

	it('should not call next() when the async handler resolves successfully', async function () {
		let nextCalled = false;
		const handler = catchAsync((_req, _res, _next) => Promise.resolve());

		const mockNext: NextFunction = () => {
			nextCalled = true;
		};

		handler({} as Request, {} as Response, mockNext);
		await new Promise(resolve => setTimeout(resolve, 20));
		assert.strictEqual(nextCalled, false);
	});
});

describe('configDir', function () {
	it('should return a path that contains the given name', function () {
		const result = configDir('testapp');
		assert.ok(
			result.includes('testapp'),
			'Path should include the app name'
		);
	});

	it('should prefix with a dot on Unix', function () {
		if (process.platform !== 'win32') {
			const result = configDir('testapp');
			assert.ok(
				result.includes('.testapp'),
				'Unix path should use dotted directory'
			);
		}
	});

	it('should build path from HOME on Unix', function () {
		if (process.platform !== 'win32' && process.env.HOME) {
			const result = configDir('testapp');
			assert.ok(
				result.startsWith(process.env.HOME),
				'Path should start with HOME'
			);
		}
	});

	it('should throw when HOME is missing on Unix', function () {
		if (process.platform !== 'win32') {
			const originalHome = process.env.HOME;
			delete process.env.HOME;
			try {
				assert.throws(() => configDir('testapp'), /HOME/);
			} finally {
				if (originalHome !== undefined) {
					process.env.HOME = originalHome;
				}
			}
		}
	});
});

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
		assert.ok('PATH' in env || 'HOME' in env || 'USER' in env);
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

describe('Fix: Package Resolution (cwd)', function () {
	this.timeout(10000);

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

// ─── Supertest API & Integration Tests ───────────────────────────────────────
//
// These tests mirror the shell-script integration suite (test/test.sh) but run
// directly against the Express app via supertest, without needing a live server
// or the metacall-deploy CLI.  Integration suites that spawn metacall workers
// (nodejs-*) require metacall to be installed and work as-is inside Docker.

const app = initializeAPI();

// Creates a zip archive of srcDir at destZip using the system zip command.
function makeZip(srcDir: string, destZip: string): void {
	execSync(`cd "${srcDir}" && zip -r "${destZip}" .`, { stdio: 'pipe' });
}

// Deletes a deployed app via the API if it still exists in Applications.
async function cleanupApp(suffix: string, prefix: string): Promise<void> {
	if (!Applications[suffix]) return;
	await request(app)
		.post('/api/deploy/delete')
		.send({ suffix, prefix, version: 'v1' });
}

// Uploads a zip and deploys the app, returning the hostname prefix.
async function deployApp(
	suffix: string,
	zipPath: string,
	metacallJson: Record<string, unknown>,
	env: { name: string; value: string }[] = []
): Promise<string> {
	await request(app)
		.post('/api/package/create')
		.field('id', suffix)
		.field('runners', JSON.stringify(['node']))
		.field('jsons', JSON.stringify([metacallJson]))
		.attach('file', zipPath, { contentType: 'application/zip' })
		.expect(201);

	const res = await request(app)
		.post('/api/deploy/create')
		.send({
			suffix,
			resourceType: 'Package',
			release: 'v1',
			env,
			plan: 'Essential',
			version: 'v1'
		})
		.expect(200);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	return res.body.prefix as string;
}

// ── Core route tests (no metacall required) ───────────────────────────────────

describe('API Routes: Core Endpoints', function () {
	it('GET /api/readiness → 200', async function () {
		await request(app).get('/api/readiness').expect(200);
	});

	it('GET /validate → 200 with success body', async function () {
		await request(app)
			.get('/validate')
			.expect(200)
			.expect({ status: 'success', data: true });
	});

	it('GET /api/account/deploy-enabled → 200 with success body', async function () {
		await request(app)
			.get('/api/account/deploy-enabled')
			.expect(200)
			.expect({ status: 'success', data: true });
	});

	it('GET /api/inspect → 200 with an array', async function () {
		const res = await request(app).get('/api/inspect').expect(200);
		assert.ok(Array.isArray(res.body as unknown[]));
	});

	it('GET /api/billing/list-subscriptions → ["Essential","Essential"]', async function () {
		await request(app)
			.get('/api/billing/list-subscriptions')
			.expect(200)
			.expect(['Essential', 'Essential']);
	});

	it('POST /api/billing/list-subscriptions → ["Essential","Essential"]', async function () {
		await request(app)
			.post('/api/billing/list-subscriptions')
			.expect(200)
			.expect(['Essential', 'Essential']);
	});

	it('GET /api/billing/list-subscriptions-deploys → []', async function () {
		await request(app)
			.get('/api/billing/list-subscriptions-deploys')
			.expect(200)
			.expect([]);
	});

	it('POST /api/billing/list-subscriptions-deploys → []', async function () {
		await request(app)
			.post('/api/billing/list-subscriptions-deploys')
			.expect(200)
			.expect([]);
	});

	it('GET unknown route → 404', async function () {
		await request(app).get('/api/this-does-not-exist').expect(404);
	});
});

describe('API Routes: Call & Delete for non-existent apps', function () {
	const host = os.hostname();

	it('POST call on non-existent app → 404 with descriptive message', async function () {
		const res = await request(app)
			.post(`/${host}/no-such-app/v1/call/anyFn`)
			.send({ params: [] })
			.expect(404);
		assert.ok(
			res.text.includes('no-such-app'),
			'response should mention the app name'
		);
	});

	it('POST /api/deploy/delete for non-existent app → informative message', async function () {
		const res = await request(app)
			.post('/api/deploy/delete')
			.send({ suffix: 'non-existent', prefix: host, version: 'v1' })
			.expect(200);
		assert.ok(
			res.text.length > 0,
			'response should contain an informative message'
		);
	});
});

// ── Integration: nodejs-base-app ─────────────────────────────────────────────
// Mirrors test_nodejs_app() + inspect/delete blocks from test/test.sh

describe('Integration: nodejs-base-app', function () {
	this.timeout(30000);

	const suffix = 'nodejs-base-app';
	const testDir = path.resolve(__dirname, '../../test/data/nodejs-base-app');
	const zipPath = path.join(os.tmpdir(), `${suffix}-test.zip`);
	let prefix = '';

	before(function () {
		if (!hasMetacall()) return this.skip();
		makeZip(testDir, zipPath);
	});

	after(async function () {
		try {
			fsSync.unlinkSync(zipPath);
		} catch (_e) {
			// ignore missing file
		}
		await cleanupApp(suffix, prefix);
	});

	it('upload package → 201 with correct id', async function () {
		const res = await request(app)
			.post('/api/package/create')
			.field('id', suffix)
			.field('runners', JSON.stringify(['node']))
			.field(
				'jsons',
				JSON.stringify([
					// eslint-disable-next-line @typescript-eslint/naming-convention
					{ language_id: 'node', path: '.', scripts: ['index.js'] }
				])
			)
			.attach('file', zipPath, { contentType: 'application/zip' })
			.expect(201);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		assert.strictEqual(res.body.id as string, suffix);
	});

	it('deploy package → 200 with prefix, suffix, version', async function () {
		const res = await request(app)
			.post('/api/deploy/create')
			.send({
				suffix,
				resourceType: 'Package',
				release: 'v1',
				env: [],
				plan: 'Essential',
				version: 'v1'
			})
			.expect(200);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		prefix = res.body.prefix as string;
		assert.ok(prefix.length > 0, 'prefix must be non-empty');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		assert.strictEqual(res.body.suffix as string, suffix);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		assert.strictEqual(res.body.version as string, 'v1');
	});

	it('GET /api/inspect → response contains prefix and packages field', async function () {
		const res = await request(app).get('/api/inspect').expect(200);
		const body = JSON.stringify(res.body);
		assert.ok(
			body.includes(prefix),
			'inspect response should include the deployment prefix'
		);
		assert.ok(
			body.includes('packages'),
			'inspect response should include a packages field'
		);
	});

	it('isPalindrome("madam") → true', async function () {
		const res = await request(app)
			.post(`/${prefix}/${suffix}/v1/call/isPalindrome`)
			.send({ params: ['madam'] })
			.expect(200);
		assert.strictEqual(res.text, 'true');
	});

	it('isPalindrome("world") → false', async function () {
		const res = await request(app)
			.post(`/${prefix}/${suffix}/v1/call/isPalindrome`)
			.send({ params: ['world'] })
			.expect(200);
		assert.strictEqual(res.text, 'false');
	});

	it('delete deployment → success response', async function () {
		await request(app)
			.post('/api/deploy/delete')
			.send({ suffix, prefix, version: 'v1' })
			.expect(200);
	});

	it('call after deletion → 404', async function () {
		const res = await request(app)
			.post(`/${prefix}/${suffix}/v1/call/isPalindrome`)
			.send({ params: ['madam'] })
			.expect(404);
		assert.ok(
			res.text.includes('not been deployed'),
			'should indicate the app is not deployed'
		);
	});
});

// ── Integration: nodejs-env-app ───────────────────────────────────────────────
// Mirrors test_nodejs_env_app() from test/test.sh

describe('Integration: nodejs-env-app', function () {
	this.timeout(30000);

	const suffix = 'nodejs-env-app';
	const testDir = path.resolve(__dirname, '../../test/data/nodejs-env-app');
	const zipPath = path.join(os.tmpdir(), `${suffix}-test.zip`);
	let prefix = '';

	before(function () {
		if (!hasMetacall()) return this.skip();
		makeZip(testDir, zipPath);
	});

	after(async function () {
		try {
			fsSync.unlinkSync(zipPath);
		} catch (_e) {
			// ignore
		}
		await cleanupApp(suffix, prefix);
	});

	it('upload package → 201', async function () {
		const res = await request(app)
			.post('/api/package/create')
			.field('id', suffix)
			.field('runners', JSON.stringify(['node']))
			.field(
				'jsons',
				JSON.stringify([
					// eslint-disable-next-line @typescript-eslint/naming-convention
					{ language_id: 'node', path: '.', scripts: ['env.js'] }
				])
			)
			.attach('file', zipPath, { contentType: 'application/zip' })
			.expect(201);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		assert.strictEqual(res.body.id as string, suffix);
	});

	it('deploy with TEST_VAR=hello → 200', async function () {
		const res = await request(app)
			.post('/api/deploy/create')
			.send({
				suffix,
				resourceType: 'Package',
				release: 'v1',
				env: [{ name: 'TEST_VAR', value: 'hello' }],
				plan: 'Essential',
				version: 'v1'
			})
			.expect(200);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		prefix = res.body.prefix as string;
		assert.ok(prefix.length > 0);
	});

	it('GET env() → "hello"', async function () {
		// GET request with no body: Object.values({}) = [] → env() called with no args
		const res = await request(app)
			.get(`/${prefix}/${suffix}/v1/call/env`)
			.expect(200);
		assert.strictEqual(res.text, '"hello"');
	});

	it('delete deployment → success response', async function () {
		await request(app)
			.post('/api/deploy/delete')
			.send({ suffix, prefix, version: 'v1' })
			.expect(200);
	});
});

// ── Integration: nodejs-dependency-app ───────────────────────────────────────
// Mirrors test_nodejs_dependency_app() from test/test.sh

describe('Integration: nodejs-dependency-app', function () {
	this.timeout(60000);

	const suffix = 'nodejs-dependency-app';
	const testDir = path.resolve(
		__dirname,
		'../../test/data/nodejs-dependency-app'
	);
	const zipPath = path.join(os.tmpdir(), `${suffix}-test.zip`);
	let prefix = '';
	let token = '';

	before(function () {
		if (!hasMetacall()) return this.skip();
		makeZip(testDir, zipPath);
	});

	after(async function () {
		try {
			fsSync.unlinkSync(zipPath);
		} catch (_e) {
			// ignore
		}
		await cleanupApp(suffix, prefix);
	});

	it('upload package → 201', async function () {
		const res = await request(app)
			.post('/api/package/create')
			.field('id', suffix)
			.field('runners', JSON.stringify(['node']))
			.field(
				'jsons',
				JSON.stringify([
					{
						// eslint-disable-next-line @typescript-eslint/naming-convention
						language_id: 'node',
						path: '.',
						scripts: ['middleware.js']
					}
				])
			)
			.attach('file', zipPath, { contentType: 'application/zip' })
			.expect(201);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		assert.strictEqual(res.body.id as string, suffix);
	});

	it('deploy package → 200', async function () {
		const res = await request(app)
			.post('/api/deploy/create')
			.send({
				suffix,
				resourceType: 'Package',
				release: 'v1',
				env: [],
				plan: 'Essential',
				version: 'v1'
			})
			.expect(200);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		prefix = res.body.prefix as string;
		assert.ok(prefix.length > 0);
	});

	it('signin(viferga, 123) → returns a JWT token', async function () {
		// Body: { user, password } → Object.values = ['viferga', '123']
		// signin('viferga', '123') returns a JWT string
		const res = await request(app)
			.post(`/${prefix}/${suffix}/v1/call/signin`)
			.send({ user: 'viferga', password: '123' })
			.expect(200);
		// Result is JSON.stringify(token) → quoted string; strip quotes
		token = res.text.replace(/^"|"$/g, '');
		assert.ok(token.length > 0, 'token should not be empty');
	});

	it('reverse("hello") with valid token → "olleh"', async function () {
		// Body: { token, args } → Object.values = [token, { str: 'hello' }]
		// reverse(token, { str: 'hello' }) → middleware verifies token → "olleh"
		const res = await request(app)
			.post(`/${prefix}/${suffix}/v1/call/reverse`)
			.send({ token, args: { str: 'hello' } })
			.expect(200);
		assert.strictEqual(res.text, '"olleh"');
	});

	it('sum(5, 3) with valid token → 8', async function () {
		// Body: { token, args } → Object.values = [token, { a: 5, b: 3 }]
		// sum(token, { a: 5, b: 3 }) → middleware verifies token → 8
		const res = await request(app)
			.post(`/${prefix}/${suffix}/v1/call/sum`)
			.send({ token, args: { a: 5, b: 3 } })
			.expect(200);
		assert.strictEqual(res.text, '8');
	});

	it('delete deployment → success response', async function () {
		await request(app)
			.post('/api/deploy/delete')
			.send({ suffix, prefix, version: 'v1' })
			.expect(200);
	});

	it('call after deletion → 404', async function () {
		await request(app)
			.post(`/${prefix}/${suffix}/v1/call/signin`)
			.send({ user: 'viferga', password: '123' })
			.expect(404);
	});
});

// ── Integration: Simultaneous deployments ────────────────────────────────────
// Mirrors test_simultaneous_deploy() from test/test.sh

describe('Integration: Simultaneous deployments', function () {
	this.timeout(60000);

	// Use distinct suffixes to avoid conflicts with the sequential suites above
	const simApps = [
		{
			suffix: 'nodejs-base-app-sim',
			dir: path.resolve(__dirname, '../../test/data/nodejs-base-app'),
			metacallJson: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				language_id: 'node',
				path: '.',
				scripts: ['index.js']
			},
			zipPath: path.join(os.tmpdir(), 'nodejs-base-app-sim.zip'),
			env: [] as { name: string; value: string }[]
		},
		{
			suffix: 'nodejs-env-app-sim',
			dir: path.resolve(__dirname, '../../test/data/nodejs-env-app'),
			metacallJson: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				language_id: 'node',
				path: '.',
				scripts: ['env.js']
			},
			zipPath: path.join(os.tmpdir(), 'nodejs-env-app-sim.zip'),
			env: [{ name: 'TEST_VAR', value: 'hello' }]
		}
	];

	const prefixes: Record<string, string> = {};

	before(function () {
		if (!hasMetacall()) return this.skip();
		for (const a of simApps) {
			makeZip(a.dir, a.zipPath);
		}
	});

	after(async function () {
		for (const a of simApps) {
			try {
				fsSync.unlinkSync(a.zipPath);
			} catch (_e) {
				// ignore
			}
			await cleanupApp(a.suffix, prefixes[a.suffix] ?? '');
		}
	});

	it('deploys all apps simultaneously without error', async function () {
		await Promise.all(
			simApps.map(async a => {
				const p = await deployApp(
					a.suffix,
					a.zipPath,
					a.metacallJson,
					a.env
				);
				prefixes[a.suffix] = p;
			})
		);
		assert.strictEqual(
			Object.keys(prefixes).length,
			simApps.length,
			'all apps should have a prefix'
		);
	});

	it('all apps respond correctly after simultaneous deploy', async function () {
		const baseApp = simApps[0];
		const envApp = simApps[1];

		const palindromeUrl = `/${prefixes[baseApp.suffix]}/${
			baseApp.suffix
		}/v1/call/isPalindrome`;
		const envUrl = `/${prefixes[envApp.suffix]}/${
			envApp.suffix
		}/v1/call/env`;
		const [palindromeRes, envRes] = await Promise.all([
			request(app)
				.post(palindromeUrl)
				.send({ params: ['madam'] })
				.expect(200),
			request(app).get(envUrl).expect(200)
		]);

		assert.strictEqual(palindromeRes.text, 'true');
		assert.strictEqual(envRes.text, '"hello"');
	});

	it('GET /api/inspect → all simultaneous deployments are visible', async function () {
		const res = await request(app).get('/api/inspect').expect(200);
		const body = JSON.stringify(res.body);
		for (const a of simApps) {
			const p = prefixes[a.suffix] ?? '';
			assert.ok(
				body.includes(p),
				`inspect should include prefix for ${a.suffix}`
			);
		}
		assert.ok(body.includes('packages'), 'packages field must be present');
	});

	it('deletes all simultaneously deployed apps', async function () {
		await Promise.all(
			simApps.map(a =>
				request(app)
					.post('/api/deploy/delete')
					.send({
						suffix: a.suffix,
						prefix: prefixes[a.suffix] ?? '',
						version: 'v1'
					})
					.expect(200)
			)
		);
	});
});
