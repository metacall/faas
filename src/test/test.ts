/* eslint-disable @typescript-eslint/unbound-method */

import * as assert from 'assert';
import { printVersionAndExit } from '../utils/version';

describe('utils/version', () => {
	it('prints the package version and exits with code 0', () => {
		let output = '';
		let exitCode: number | undefined;

		const originalLog = console.log;
		const originalExit = process.exit;

		console.log = (message?: unknown): void => {
			output = String(message);
		};

		process.exit = ((code?: number): never => {
			exitCode = code;
			throw new Error('process.exit');
		}) as never;

		try {
			printVersionAndExit();
		} catch (error) {
			assert.strictEqual((error as Error).message, 'process.exit');
		} finally {
			console.log = originalLog;
			process.exit = originalExit;
		}

		assert.strictEqual(exitCode, 0);
		assert.match(output, /^v\d+\.\d+\.\d+$/);
	});
});
