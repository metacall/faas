import metacallAPI, { API, waitFor } from '@metacall/protocol/protocol';
import { ResourceType } from '@metacall/protocol/protocol';
import { Plans } from '@metacall/protocol/plan';
import archiver from 'archiver';
import { parse as parseDotenv } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PassThrough } from 'stream';

const BASE_URL = process.env.FAAS_URL || 'http://localhost:9000';

export const isStartupDeployMode =
	process.env.TEST_FAAS_STARTUP_DEPLOY === 'true';

export const createAPI = (): API => metacallAPI('', BASE_URL);

export const waitForReady = async (
	api: API,
	maxRetries = 30
): Promise<void> => {
	await waitFor(() => api.ready(), maxRetries, 1000);
};

export const getPrefix = async (api: API, suffix: string): Promise<string> => {
	const deployments = await api.inspect();
	const dep = deployments.find(d => d.suffix === suffix);
	if (!dep) throw new Error(`Deployment '${suffix}' not found`);
	return dep.prefix;
};

export const deployFixture = async (
	api: API,
	appName: string
): Promise<string> => {
	const fixturePath = join(__dirname, '..', 'fixtures', appName);

	const blob = await new Promise<Buffer>((resolve, reject) => {
		const archive = archiver('zip', { zlib: { level: 9 } });
		const chunks: Uint8Array[] = [];
		const passthrough = new PassThrough();

		passthrough.on('data', (chunk: Uint8Array) => chunks.push(chunk));
		passthrough.on('end', () => resolve(Buffer.concat(chunks)));
		passthrough.on('error', reject);
		archive.on('error', reject);

		archive.pipe(passthrough);
		archive.directory(fixturePath, false);
		void archive.finalize();
	});

	await api.upload(appName, blob);

	let env: { name: string; value: string }[] = [];
	try {
		const content = readFileSync(join(fixturePath, '.env'), 'utf-8');
		const parsed = parseDotenv(content);
		env = Object.entries(parsed).map(([name, value]) => ({ name, value }));
	} catch (e) {
		// Ignore if .env doesn't exist
	}

	await api.deploy(appName, env, Plans.Essential, ResourceType.Package);

	const deployment = await waitFor(
		() => api.inspectByName(appName),
		30,
		2000
	);
	return deployment.prefix;
};

export const ensureDeployed = async (
	api: API,
	appName: string
): Promise<string> => {
	if (isStartupDeployMode) {
		return getPrefix(api, appName);
	}
	return deployFixture(api, appName);
};

export const deleteDeployment = async (
	api: API,
	suffix: string,
	prefix: string
): Promise<string> => {
	return api.deployDelete(prefix, suffix, 'v1');
};

export { BASE_URL };
