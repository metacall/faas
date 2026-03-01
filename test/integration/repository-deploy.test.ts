import { describe, it, expect, beforeAll } from 'vitest';
import { createAPI, waitForReady, isStartupDeployMode } from './helpers';
import { API, waitFor } from '@metacall/protocol/protocol';
import { ResourceType } from '@metacall/protocol/protocol';
import { Plans } from '@metacall/protocol/plan';

const api: API = createAPI();

beforeAll(async () => {
	await waitForReady(api);
}, 60_000);

const deployFromRepo = async (
	url: string,
	branch = 'master'
): Promise<{ prefix: string; id: string }> => {
	const { id } = await api.add(url, branch, []);

	await api.deploy(id, [], Plans.Essential, ResourceType.Repository);

	const deployment = await waitFor(() => api.inspectByName(id), 30, 2000);

	return { prefix: deployment.prefix, id };
};

describe.skipIf(isStartupDeployMode)(
	'repository deployment — nodejs (no dependencies)',
	() => {
		let prefix: string;
		let appName: string;

		beforeAll(async () => {
			const result = await deployFromRepo(
				'https://github.com/HeeManSu/nodejs-parameter-example'
			);
			prefix = result.prefix;
			appName = result.id;
		});

		it('isPalindrome("madam") returns true', async () => {
			const result = await api.call(
				prefix,
				appName,
				'v1',
				'isPalindrome',
				{
					params: ['madam']
				}
			);
			expect(result).toBe(true);
		});

		it('isPalindrome("world") returns false', async () => {
			const result = await api.call(
				prefix,
				appName,
				'v1',
				'isPalindrome',
				{
					params: ['world']
				}
			);
			expect(result).toBe(false);
		});

		it('appears in inspect', async () => {
			const deployments = await api.inspect();
			const dep = deployments.find(d => d.suffix === appName);
			expect(dep).toBeDefined();
			if (!dep) throw new Error(`Deployment '${appName}' not found`);
			expect(dep.prefix).toBe(prefix);
		});
	}
);

describe.skipIf(isStartupDeployMode)(
	'repository deployment — python (no dependencies)',
	() => {
		let prefix: string;
		let appName: string;

		beforeAll(async () => {
			const result = await deployFromRepo(
				'https://github.com/HeeManSu/metacall-python-example'
			);
			prefix = result.prefix;
			appName = result.id;
		});

		it('index() returns HTML with "Python Time App"', async () => {
			const result = await api.call<string>(
				prefix,
				appName,
				'v1',
				'index'
			);
			expect(result).toContain('<html');
			expect(result).toContain('Python Time App');
		});

		it('time() returns a timestamp string', async () => {
			const result = await api.call<string>(
				prefix,
				appName,
				'v1',
				'time'
			);
			expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
		});
	}
);

describe.skipIf(isStartupDeployMode)(
	'repository deployment — python (with dependencies)',
	() => {
		let prefix: string;
		let appName: string;

		beforeAll(async () => {
			const result = await deployFromRepo(
				'https://github.com/HeeManSu/python-dependency-metacall'
			);
			prefix = result.prefix;
			appName = result.id;
		});

		it('fetch_joke() returns a joke or error handling message', async () => {
			const result = await api.call<string>(
				prefix,
				appName,
				'v1',
				'fetch_joke'
			);
			const str =
				typeof result === 'string' ? result : JSON.stringify(result);
			const isJoke = str.includes('setup') && str.includes('punchline');
			const isErrorHandled = str.includes('Error fetching joke');
			expect(isJoke || isErrorHandled).toBe(true);
		});
	}
);

describe.skipIf(isStartupDeployMode)(
	'repository deployment — nodejs (with dependencies)',
	() => {
		let prefix: string;
		let appName: string;

		beforeAll(async () => {
			const result = await deployFromRepo(
				'https://github.com/HeeManSu/auth-middleware-metacall',
				'main'
			);
			prefix = result.prefix;
			appName = result.id;
		});

		it('signin returns a token', async () => {
			const token = await api.call<string>(
				prefix,
				appName,
				'v1',
				'signin',
				{
					user: 'viferga',
					password: '123'
				}
			);
			expect(token).toBeTruthy();
		});

		it('reverse("hello") returns "olleh"', async () => {
			const token = await api.call<string>(
				prefix,
				appName,
				'v1',
				'signin',
				{
					user: 'viferga',
					password: '123'
				}
			);
			const result = await api.call<string>(
				prefix,
				appName,
				'v1',
				'reverse',
				{ token, args: { str: 'hello' } }
			);
			expect(result).toBe('olleh');
		});

		it('sum(5, 3) returns 8', async () => {
			const token = await api.call<string>(
				prefix,
				appName,
				'v1',
				'signin',
				{
					user: 'viferga',
					password: '123'
				}
			);
			const result = await api.call<number>(
				prefix,
				appName,
				'v1',
				'sum',
				{
					token,
					args: { a: 5, b: 3 }
				}
			);
			expect(result).toBe(8);
		});
	}
);
