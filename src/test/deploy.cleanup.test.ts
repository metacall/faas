import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Application, Applications, Resource } from '../app';
import { discardFailedDeploy } from '../controller/deploy';

const NAME = 'cleanup-test-app';

// Registers an app as the upload step does: resource set, no deployment.
const registerUploaded = (dir: string): void => {
	const application = new Application();
	const resource: Resource = {
		id: NAME,
		path: dir,
		jsons: [],
		runners: []
	};
	application.resource = Promise.resolve(resource);
	Applications[NAME] = application;
};

describe('discardFailedDeploy()', () => {
	let dir: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'faas-cleanup-'));
		fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports = {};');
	});

	afterEach(() => {
		delete Applications[NAME];
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it('removes the entry and its files when the app was never deployed', async () => {
		registerUploaded(dir);

		await discardFailedDeploy(NAME);

		assert.equal(Applications[NAME], undefined);
		assert.equal(fs.existsSync(dir), false);
	});

	it('keeps an application that has a running deployment', async () => {
		registerUploaded(dir);
		Applications[NAME].deployment = {
			prefix: 'host',
			suffix: NAME,
			version: 'v1',
			packages: {},
			ports: [],
			status: 'ready'
		} as never;

		await discardFailedDeploy(NAME);

		assert.ok(Applications[NAME]);
		assert.equal(fs.existsSync(dir), true);
	});

	it('is a no-op for an unknown application', async () => {
		await discardFailedDeploy('does-not-exist');
		assert.equal(Applications['does-not-exist'], undefined);
	});

	it('still drops the entry when the upload itself failed', async () => {
		const application = new Application();
		const failed = Promise.reject(new Error('unzip failed'));
		failed.catch(() => undefined);
		application.resource = failed;
		Applications[NAME] = application;

		await discardFailedDeploy(NAME);

		assert.equal(Applications[NAME], undefined);
	});
});
