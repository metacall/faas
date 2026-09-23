import { strict as assert } from 'assert';
import { defaultPort, getPort } from '../utils/port';

function portEnv(port: string): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = {};
	env['PORT'] = port;
	return env;
}

describe('getPort', function () {
	it('should use the default port when no flag or env var is set', () => {
		assert.strictEqual(getPort([], {}), defaultPort);
	});

	it('should use the PORT env var when no flag is set', () => {
		assert.strictEqual(getPort([], portEnv('8080')), 8080);
	});

	it('should use --port <n> over the PORT env var', () => {
		assert.strictEqual(getPort(['--port', '3000'], portEnv('8080')), 3000);
	});

	it('should support --port=<n>', () => {
		assert.strictEqual(getPort(['--prune', '--port=3000'], {}), 3000);
	});

	it('should reject a non-numeric port', () => {
		assert.throws(() => getPort(['--port', 'abc'], {}), /Invalid port/);
		assert.throws(() => getPort(['--port=12ab'], {}), /Invalid port/);
	});

	it('should reject a port out of range', () => {
		assert.throws(() => getPort(['--port', '0'], {}), /Invalid port/);
		assert.throws(() => getPort(['--port', '65536'], {}), /Invalid port/);
	});

	it('should reject an invalid PORT env var', () => {
		assert.throws(() => getPort([], portEnv('abc')), /Invalid port/);
	});

	it('should reject --port without a value', () => {
		assert.throws(() => getPort(['--port'], {}), /Missing value/);
		assert.throws(
			() => getPort(['--port', '--prune'], {}),
			/Missing value/
		);
	});
});
