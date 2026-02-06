import { strict as assert } from 'assert';
import { spawnSync } from 'child_process';
import { join } from 'path';

describe('utils/version', () => {
	it('prints version string', () => {
		const scriptPath = join(__dirname, '../utils/version.js');

		const result = spawnSync(
			'node',
			[
				'-e',
				'require(process.argv[1]).printVersionAndExit()',
				scriptPath
			],
			{ encoding: 'utf8' }
		);

		const output = `${result.stdout}${result.stderr}`.trim();

		assert.match(output, /^v\d+\.\d+\.\d+/);
		assert.equal(result.status, 0);
	});
});
