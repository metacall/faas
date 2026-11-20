import { strict as assert } from 'assert';
import { Request, Response } from 'express';
import {
	createCors,
	DEV_CORS_ORIGINS,
	resolveAllowedOrigins
} from '../utils/cors';

interface Outcome {
	headers: Record<string, string>;
	status?: number;
	nextCalled: boolean;
}

// Run the middleware with a fake request/response.
const run = (allowed: string[], method: string, origin?: string): Outcome => {
	const outcome: Outcome = { headers: {}, nextCalled: false };
	const req = { method, headers: { origin } } as unknown as Request;
	const res = {
		setHeader: (name: string, value: string) => {
			outcome.headers[name] = value;
		},
		sendStatus: (code: number) => {
			outcome.status = code;
		}
	} as unknown as Response;

	createCors(allowed)(req, res, () => {
		outcome.nextCalled = true;
	});
	return outcome;
};

const DASHBOARD = 'https://dashboard.example.com';

describe('createCors()', () => {
	it('adds the allow-origin header for an allowed origin and continues', () => {
		const out = run([DASHBOARD], 'GET', DASHBOARD);
		assert.equal(out.headers['Access-Control-Allow-Origin'], DASHBOARD);
		assert.equal(out.nextCalled, true);
		assert.equal(out.status, undefined);
	});

	it('answers a preflight from an allowed origin with 204 and does not continue', () => {
		const out = run([DASHBOARD], 'OPTIONS', DASHBOARD);
		assert.equal(out.status, 204);
		assert.equal(out.nextCalled, false);
		assert.equal(out.headers['Access-Control-Allow-Origin'], DASHBOARD);
		assert.match(
			out.headers['Access-Control-Allow-Headers'],
			/Authorization/
		);
		assert.match(out.headers['Access-Control-Allow-Methods'], /POST/);
		assert.ok(Number(out.headers['Access-Control-Max-Age']) > 0);
	});

	it('sends no CORS headers to a disallowed origin and continues', () => {
		const out = run([DASHBOARD], 'GET', 'http://evil.example');
		assert.equal(out.headers['Access-Control-Allow-Origin'], undefined);
		assert.equal(out.nextCalled, true);
	});

	it('does not intercept a preflight from a disallowed origin', () => {
		const out = run([DASHBOARD], 'OPTIONS', 'http://evil.example');
		assert.equal(out.status, undefined);
		assert.equal(out.nextCalled, true);
	});

	it('ignores requests without an Origin header (non-browser clients)', () => {
		const out = run([DASHBOARD], 'POST');
		assert.equal(out.headers['Access-Control-Allow-Origin'], undefined);
		assert.equal(out.nextCalled, true);
	});

	it('always sets Vary: Origin so caches key on the origin', () => {
		assert.equal(
			run([DASHBOARD], 'GET', DASHBOARD).headers['Vary'],
			'Origin'
		);
		assert.equal(run([DASHBOARD], 'GET').headers['Vary'], 'Origin');
		assert.equal(run([], 'GET', DASHBOARD).headers['Vary'], 'Origin');
	});

	it('never allows credentials (the API uses the Authorization header)', () => {
		const out = run([DASHBOARD], 'OPTIONS', DASHBOARD);
		assert.equal(
			out.headers['Access-Control-Allow-Credentials'],
			undefined
		);
	});

	it('allows nothing when the list is empty', () => {
		const out = run([], 'OPTIONS', DASHBOARD);
		assert.equal(out.headers['Access-Control-Allow-Origin'], undefined);
		assert.equal(out.nextCalled, true);
	});
});

// Builds an env object (lint disallows UPPER_CASE literal keys).
const makeEnv = (...pairs: Array<[string, string]>): NodeJS.ProcessEnv => {
	const env: NodeJS.ProcessEnv = {};
	for (const [name, value] of pairs) env[name] = value;
	return env;
};

describe('resolveAllowedOrigins()', () => {
	it('parses FAAS_CORS_ORIGINS, trimming spaces, trailing slashes and empties', () => {
		const env = makeEnv([
			'FAAS_CORS_ORIGINS',
			' https://a.com/ , https://b.com,, '
		]);
		assert.deepEqual(resolveAllowedOrigins(env), [
			'https://a.com',
			'https://b.com'
		]);
	});

	it('uses the local dev origins when unset outside production', () => {
		assert.deepEqual(resolveAllowedOrigins(makeEnv()), DEV_CORS_ORIGINS);
		assert.deepEqual(
			resolveAllowedOrigins(makeEnv(['NODE_ENV', 'development'])),
			DEV_CORS_ORIGINS
		);
	});

	it('disables CORS when unset in production', () => {
		assert.deepEqual(
			resolveAllowedOrigins(makeEnv(['NODE_ENV', 'production'])),
			[]
		);
	});

	it('lets FAAS_CORS_ORIGINS override the production default', () => {
		const env = makeEnv(
			['NODE_ENV', 'production'],
			['FAAS_CORS_ORIGINS', DASHBOARD]
		);
		assert.deepEqual(resolveAllowedOrigins(env), [DASHBOARD]);
	});

	it('treats an empty FAAS_CORS_ORIGINS as "allow nothing"', () => {
		assert.deepEqual(
			resolveAllowedOrigins(makeEnv(['FAAS_CORS_ORIGINS', ''])),
			[]
		);
	});
});
