import { describe, it, expect, beforeAll } from 'vitest';
import {
	createAPI,
	waitForReady,
	getPrefix,
	isStartupDeployMode
} from './helpers';
import { API } from '@metacall/protocol/protocol';

const api: API = createAPI();

beforeAll(async () => {
	await waitForReady(api);
}, 60_000);

describe.skipIf(!isStartupDeployMode)('simultaneous deployments', () => {
	it('invokes 4 apps concurrently with full checks', async () => {
		const [njPfx, pyPfx, pyDepPfx, njDepPfx] = await Promise.all([
			getPrefix(api, 'nodejs-base-app'),
			getPrefix(api, 'python-base-app'),
			getPrefix(api, 'python-dependency-app'),
			getPrefix(api, 'nodejs-dependency-app')
		]);

		await Promise.all([
			// nodejs-base-app
			(async () => {
				const r1 = await api.call(
					njPfx,
					'nodejs-base-app',
					'v1',
					'isPalindrome',
					{ params: ['madam'] }
				);
				expect(r1).toBe(true);

				const r2 = await api.call(
					njPfx,
					'nodejs-base-app',
					'v1',
					'isPalindrome',
					{ params: ['world'] }
				);
				expect(r2).toBe(false);

				const deps = await api.inspect();
				const d = deps.find(x => x.suffix === 'nodejs-base-app');
				if (!d) throw new Error('nodejs-base-app not in inspect');
				expect(d.prefix).toBe(njPfx);
				expect(d.packages).toBeDefined();
			})(),

			// python-base-app
			(async () => {
				expect(
					await api.call(pyPfx, 'python-base-app', 'v1', 'number')
				).toBe(100);
				expect(
					await api.call(pyPfx, 'python-base-app', 'v1', 'text')
				).toBe('asd');

				const deps = await api.inspect();
				const d = deps.find(x => x.suffix === 'python-base-app');
				if (!d) throw new Error('python-base-app not in inspect');
				expect(d.prefix).toBe(pyPfx);
				expect(d.packages).toBeDefined();
			})(),

			// python-dependency-app
			(async () => {
				const joke = await api.call<string>(
					pyDepPfx,
					'python-dependency-app',
					'v1',
					'fetchJoke'
				);
				const str =
					typeof joke === 'string' ? joke : JSON.stringify(joke);
				const isJoke =
					str.includes('setup') && str.includes('punchline');
				const isErrorHandled = str.includes('Error fetching joke');
				expect(isJoke || isErrorHandled).toBe(true);

				const deps = await api.inspect();
				const d = deps.find(x => x.suffix === 'python-dependency-app');
				if (!d) throw new Error('python-dependency-app not in inspect');
				expect(d.prefix).toBe(pyDepPfx);
				expect(d.packages).toBeDefined();
			})(),

			// nodejs-dependency-app
			(async () => {
				const token = await api.call<string>(
					njDepPfx,
					'nodejs-dependency-app',
					'v1',
					'signin',
					{ user: 'viferga', password: '123' }
				);
				expect(token).toBeTruthy();

				const rev = await api.call<string>(
					njDepPfx,
					'nodejs-dependency-app',
					'v1',
					'reverse',
					{ token, args: { str: 'hello' } }
				);
				expect(rev).toBe('olleh');

				const sum = await api.call<number>(
					njDepPfx,
					'nodejs-dependency-app',
					'v1',
					'sum',
					{ token, args: { a: 5, b: 3 } }
				);
				expect(sum).toBe(8);

				const deps = await api.inspect();
				const d = deps.find(x => x.suffix === 'nodejs-dependency-app');
				if (!d) throw new Error('nodejs-dependency-app not in inspect');
				expect(d.prefix).toBe(njDepPfx);
				expect(d.packages).toBeDefined();
			})()
		]);
	});
});
