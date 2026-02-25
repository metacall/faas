/**
 * Integration tests using protocol API (ready, waitFor, inspect).
 * Requires FaaS running at BASE_URL (default http://localhost:9000).
 */

import { strict as assert } from 'assert';
import protocol, { waitFor } from '@metacall/protocol';
import type { API } from '@metacall/protocol';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9000';
const TOKEN = process.env.FAAS_TEST_TOKEN || 'test';

describe('Protocol API integration', function () {
	this.timeout(60_000);

	it('waitFor(api.ready) then api.inspect() returns deployments array', async function () {
		const api: API = protocol(TOKEN, BASE_URL);
		await waitFor(() => api.ready());
		const deployments = await api.inspect();
		assert(Array.isArray(deployments), 'inspect() should return an array');
	});
});
