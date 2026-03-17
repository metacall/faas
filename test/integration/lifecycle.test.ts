import { describe, it, expect, beforeAll } from 'vitest';
import {
	createAPI,
	waitForReady,
	getPrefix,
	deleteDeployment,
	BASE_URL,
	isStartupDeployMode
} from './helpers';
import { API } from '@metacall/protocol/protocol';
import axios from 'axios';

const api: API = createAPI();

beforeAll(async () => {
	await waitForReady(api);
}, 60_000);

describe.skipIf(!isStartupDeployMode)('delete deployment', () => {
	const apps = [
		{ name: 'python-dependency-app', endpoint: 'fetchJoke' },
		{ name: 'python-base-app', endpoint: 'number' },
		{ name: 'nodejs-base-app', endpoint: 'isPalindrome' },
		{ name: 'nodejs-dependency-app', endpoint: 'signin' },
		{ name: 'nodejs-env-app', endpoint: 'env' }
	];

	for (const { name, endpoint } of apps) {
		describe(`${name}`, () => {
			let prefix: string;

			beforeAll(async () => {
				prefix = await getPrefix(api, name);
			});

			it('should be deleted successfully', async () => {
				await deleteDeployment(api, name, prefix);

				// Verify the endpoint returns 404 after deletion
				const response = await axios.get(
					`${BASE_URL}/${prefix}/${name}/v1/call/${endpoint}`,
					{ validateStatus: () => true }
				);
				expect(response.status).toBe(404);
			});

			it('should not appear in inspect after deletion', async () => {
				// Add small retry to handle eventual consistency
				let found = true;
				for (let i = 0; i < 5; i++) {
					const deployments = await api.inspect();
					if (!deployments.some(d => d.suffix === name)) {
						found = false;
						break;
					}
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
				expect(found).toBe(false);
			});
		});
	}
});
