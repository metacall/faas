/**
 * Phase 1 smoke test: readiness and inspect helpers.
 * Run with: npm run integration:ts
 * Requires FaaS running at BASE_URL (default http://localhost:9000).
 */

import { expect } from 'chai';
import { getDeployments, waitForReadiness } from './helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9000';

describe('FaaS integration (Phase 1)', function () {
	this.timeout(60_000);

	before(async function () {
		await waitForReadiness(BASE_URL);
	});

	it('readiness check passes', async function () {
		await waitForReadiness(BASE_URL, 1);
	});

	it('inspect returns an array', async function () {
		const deployments = await getDeployments(BASE_URL);
		expect(deployments).to.be.an('array');
	});
});
