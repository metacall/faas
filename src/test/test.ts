import { strict as assert } from 'assert';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getVersion } from '../utils/version';

describe('utils/version', () => {
	it('reads version from package.json', () => {
		const tmpPath = join(__dirname, 'tmp-package.json');

		writeFileSync(tmpPath, JSON.stringify({ version: '1.2.3' }));

		const version = getVersion(tmpPath);
		assert.equal(version, '1.2.3');

		unlinkSync(tmpPath);
	});
});
