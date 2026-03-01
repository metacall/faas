import { describe, it, expect, beforeAll } from 'vitest';
import { createAPI, waitForReady, ensureDeployed } from './helpers';
import { API } from '@metacall/protocol/protocol';

const api: API = createAPI();

beforeAll(async () => {
	await waitForReady(api);
}, 60_000);

describe('nodejs-base-app', () => {
	let prefix: string;

	beforeAll(async () => {
		prefix = await ensureDeployed(api, 'nodejs-base-app');
	});

	it('isPalindrome("madam") returns true', async () => {
		const result = await api.call(
			prefix,
			'nodejs-base-app',
			'v1',
			'isPalindrome',
			{ params: ['madam'] }
		);
		expect(result).toBe(true);
	});

	it('isPalindrome("world") returns false', async () => {
		const result = await api.call(
			prefix,
			'nodejs-base-app',
			'v1',
			'isPalindrome',
			{ params: ['world'] }
		);
		expect(result).toBe(false);
	});

	it('appears in inspect response', async () => {
		const deployments = await api.inspect();
		const dep = deployments.find(d => d.suffix === 'nodejs-base-app');
		expect(dep).toBeDefined();
		if (!dep) throw new Error('nodejs-base-app deployment not found');
		expect(dep.prefix).toBe(prefix);
		expect(dep.packages).toBeDefined();
	});
});

describe('python-base-app', () => {
	let prefix: string;

	beforeAll(async () => {
		prefix = await ensureDeployed(api, 'python-base-app');
	});

	it('number() returns 100', async () => {
		const result = await api.call(
			prefix,
			'python-base-app',
			'v1',
			'number'
		);
		expect(result).toBe(100);
	});

	it('text() returns "asd"', async () => {
		const result = await api.call(prefix, 'python-base-app', 'v1', 'text');
		expect(result).toBe('asd');
	});

	it('appears in inspect response', async () => {
		const deployments = await api.inspect();
		const dep = deployments.find(d => d.suffix === 'python-base-app');
		expect(dep).toBeDefined();
		if (!dep) throw new Error('python-base-app deployment not found');
		expect(dep.prefix).toBe(prefix);
		expect(dep.packages).toBeDefined();
	});
});

describe('python-dependency-app', () => {
	let prefix: string;

	beforeAll(async () => {
		prefix = await ensureDeployed(api, 'python-dependency-app');
	});

	it('fetchJoke() returns a joke or error handling message', async () => {
		const result = await api.call<string>(
			prefix,
			'python-dependency-app',
			'v1',
			'fetchJoke'
		);
		const str =
			typeof result === 'string' ? result : JSON.stringify(result);
		const isJoke = str.includes('setup') && str.includes('punchline');
		const isErrorHandled = str.includes('Error fetching joke');
		expect(isJoke || isErrorHandled).toBe(true);
	});

	it('appears in inspect response', async () => {
		const deployments = await api.inspect();
		const dep = deployments.find(d => d.suffix === 'python-dependency-app');
		expect(dep).toBeDefined();
		if (!dep) throw new Error('python-dependency-app deployment not found');
		expect(dep.prefix).toBe(prefix);
		expect(dep.packages).toBeDefined();
	});
});

describe('nodejs-dependency-app', () => {
	let prefix: string;

	beforeAll(async () => {
		prefix = await ensureDeployed(api, 'nodejs-dependency-app');
	});

	it('signin returns a token', async () => {
		const token = await api.call<string>(
			prefix,
			'nodejs-dependency-app',
			'v1',
			'signin',
			{ user: 'viferga', password: '123' }
		);
		expect(token).toBeTruthy();
		expect(typeof token).toBe('string');
	});

	it('reverse("hello") returns "olleh" with valid token', async () => {
		const token = await api.call<string>(
			prefix,
			'nodejs-dependency-app',
			'v1',
			'signin',
			{ user: 'viferga', password: '123' }
		);

		const result = await api.call<string>(
			prefix,
			'nodejs-dependency-app',
			'v1',
			'reverse',
			{ token, args: { str: 'hello' } }
		);
		expect(result).toBe('olleh');
	});

	it('sum(5, 3) returns 8 with valid token', async () => {
		const token = await api.call<string>(
			prefix,
			'nodejs-dependency-app',
			'v1',
			'signin',
			{ user: 'viferga', password: '123' }
		);

		const result = await api.call<number>(
			prefix,
			'nodejs-dependency-app',
			'v1',
			'sum',
			{ token, args: { a: 5, b: 3 } }
		);
		expect(result).toBe(8);
	});

	it('appears in inspect response', async () => {
		const deployments = await api.inspect();
		const dep = deployments.find(d => d.suffix === 'nodejs-dependency-app');
		expect(dep).toBeDefined();
		if (!dep) throw new Error('nodejs-dependency-app deployment not found');
		expect(dep.prefix).toBe(prefix);
		expect(dep.packages).toBeDefined();
	});
});

describe('nodejs-env-app', () => {
	let prefix: string;

	beforeAll(async () => {
		prefix = await ensureDeployed(api, 'nodejs-env-app');
	});

	it('env() returns the value of TEST_VAR', async () => {
		const result = await api.call<string>(
			prefix,
			'nodejs-env-app',
			'v1',
			'env'
		);
		expect(result).toBe('hello');
	});

	it('appears in inspect response', async () => {
		const deployments = await api.inspect();
		const dep = deployments.find(d => d.suffix === 'nodejs-env-app');
		expect(dep).toBeDefined();
		if (!dep) throw new Error('nodejs-env-app deployment not found');
		expect(dep.prefix).toBe(prefix);
		expect(dep.packages).toBeDefined();
	});
});
