import { strict as assert } from 'assert';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import { join } from 'path';
import { PassThrough } from 'stream';
import { Resource } from '../app';
import { logsDirectory } from '../utils/config';
import { logProcessOutput, ProcessLogHandle } from '../utils/logger';

type LogProcessOutput = (
	proc: ChildProcess,
	resource: Resource
) => ProcessLogHandle;

type MutableFs = {
	appendFileSync: typeof fs.appendFileSync;
	existsSync: typeof fs.existsSync;
	mkdirSync: typeof fs.mkdirSync;
};

type MutableFsPromises = {
	appendFile: typeof fs.promises.appendFile;
	mkdir: typeof fs.promises.mkdir;
};

interface MockProcess {
	proc: ChildProcess;
	stdout: PassThrough;
	stderr: PassThrough;
}

const createLogger = logProcessOutput as unknown as LogProcessOutput;
const mutableFs = fs as MutableFs;
const mutableFsPromises = fs.promises as MutableFsPromises;
const originalAppendFile = mutableFsPromises.appendFile;
const originalAppendFileSync = mutableFs.appendFileSync;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalExistsSync = mutableFs.existsSync;
const originalMkdir = mutableFsPromises.mkdir;
const originalMkdirSync = mutableFs.mkdirSync;

const resource: Resource = {
	id: 'logger-lifecycle-test',
	path: '/deployment/logger-lifecycle-test',
	jsons: [],
	runners: []
};

const expectedLogDirectory = join(logsDirectory, resource.id);
const expectedLogFile = join(expectedLogDirectory, 'app.log');

function createMockProcess(): MockProcess {
	const stdout = new PassThrough();
	const stderr = new PassThrough();
	const proc = Object.assign(new EventEmitter(), {
		pid: 4242,
		stdout,
		stderr
	}) as unknown as ChildProcess;

	return { proc, stdout, stderr };
}

function recordPayload(record: string): string {
	const isoPrefixRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - /;

	assert.ok(
		isoPrefixRegex.test(record),
		'log record begins with ISO timestamp and separator'
	);
	assert.strictEqual(
		record.includes(`${resource.id} |`),
		false,
		'log record should not contain deployment prefix'
	);
	assert.strictEqual(
		record.includes(resource.id),
		false,
		'log record should not contain deployment id'
	);
	return record.replace(isoPrefixRegex, '');
}

async function flushAsyncWork(): Promise<void> {
	await new Promise<void>(resolveWork => setImmediate(resolveWork));
}

describe('process logger lifecycle', () => {
	let append: (record: string) => Promise<void>;
	let consoleLines: string[];
	let mkdirPaths: string[];
	let writePaths: string[];
	let writes: string[];

	beforeEach(() => {
		append = () => Promise.resolve();
		consoleLines = [];
		mkdirPaths = [];
		writePaths = [];
		writes = [];

		mutableFsPromises.mkdir = ((targetPath: fs.PathLike) => {
			mkdirPaths.push(String(targetPath));
			return Promise.resolve(undefined);
		}) as typeof fs.promises.mkdir;
		mutableFsPromises.appendFile = ((
			filePath: fs.PathLike,
			data: string
		) => {
			writePaths.push(String(filePath));
			writes.push(data);
			return append(data);
		}) as typeof fs.promises.appendFile;
		mutableFs.existsSync = () => true;
		mutableFs.mkdirSync = ((targetPath: fs.PathLike) => {
			mkdirPaths.push(String(targetPath));
			return undefined;
		}) as typeof fs.mkdirSync;
		mutableFs.appendFileSync = ((filePath: fs.PathLike, data: string) => {
			writePaths.push(String(filePath));
			writes.push(data);
		}) as typeof fs.appendFileSync;
		console.log = (...data: unknown[]) => {
			consoleLines.push(data.map(String).join(' '));
		};
		console.error = () => undefined;
	});

	afterEach(async () => {
		for (let iteration = 0; iteration < 4; iteration += 1) {
			await flushAsyncWork();
		}

		mutableFsPromises.appendFile = originalAppendFile;
		mutableFsPromises.mkdir = originalMkdir;
		mutableFs.appendFileSync = originalAppendFileSync;
		mutableFs.existsSync = originalExistsSync;
		mutableFs.mkdirSync = originalMkdirSync;
		console.error = originalConsoleError;
		console.log = originalConsoleLog;
	});

	it('should return a ProcessLogHandle with a close method', async () => {
		const { proc } = createMockProcess();

		const handle = createLogger(proc, resource);

		assert.strictEqual(typeof handle.close, 'function');
		assert.ok(handle.close() instanceof Promise);
		await handle.close();
	});

	it('should capture and serialize interleaved stdout and stderr writes', async () => {
		const { proc, stderr, stdout } = createMockProcess();
		const releases: Array<() => void> = [];
		let activeWrites = 0;
		let maximumActiveWrites = 0;
		append = () => {
			activeWrites += 1;
			maximumActiveWrites = Math.max(maximumActiveWrites, activeWrites);
			return new Promise<void>(resolveWrite => {
				releases.push(() => {
					activeWrites -= 1;
					resolveWrite();
				});
			});
		};
		const handle = createLogger(proc, resource);

		stdout.write('stdout-first');
		stderr.write('stderr-second');
		stdout.write('stdout-third');
		const closed = handle.close();
		await flushAsyncWork();

		assert.deepStrictEqual(writes.map(recordPayload), ['stdout-first\n']);
		releases.shift()?.();
		await flushAsyncWork();
		assert.deepStrictEqual(writes.map(recordPayload), [
			'stdout-first\n',
			'stderr-second\n'
		]);
		releases.shift()?.();
		await flushAsyncWork();
		assert.deepStrictEqual(writes.map(recordPayload), [
			'stdout-first\n',
			'stderr-second\n',
			'stdout-third\n'
		]);
		releases.shift()?.();
		await closed;

		assert.strictEqual(maximumActiveWrites, 1);
		assert.deepStrictEqual(writePaths, [
			expectedLogFile,
			expectedLogFile,
			expectedLogFile
		]);
	});

	it('should format log file content with ISO timestamp and message without deployment ID', async () => {
		const { proc, stdout } = createMockProcess();
		const handle = createLogger(proc, resource);
		const message = 'deterministic-log-entry';

		stdout.write(message);
		await handle.close();

		assert.strictEqual(writes.length, 1);
		assert.strictEqual(writePaths[0], expectedLogFile);
		assert.match(
			writes[0],
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - deterministic-log-entry\n$/
		);
		assert.strictEqual(writes[0].includes(resource.id), false);
	});

	it('should preserve arbitrary multiline chunks without mangling them', async () => {
		const { proc, stdout } = createMockProcess();
		const handle = createLogger(proc, resource);
		const chunk = 'first line\nsecond line\n\nthird line';

		stdout.write(chunk);
		await handle.close();

		assert.strictEqual(writes.length, 1);
		assert.strictEqual(writePaths[0], expectedLogFile);
		assert.strictEqual(recordPayload(writes[0]), `${chunk}\n`);
	});

	it('should drain accepted writes before close settles', async () => {
		const { proc, stdout } = createMockProcess();
		let releaseWrite: (() => void) | undefined;
		append = () =>
			new Promise<void>(resolveWrite => {
				releaseWrite = resolveWrite;
			});
		const handle = createLogger(proc, resource);

		stdout.write('accepted-before-close');
		let settled = false;
		const closed = handle.close().then(() => {
			settled = true;
		});
		await flushAsyncWork();

		assert.strictEqual(settled, false);
		assert.strictEqual(writes.length, 1);
		assert.ok(releaseWrite);
		releaseWrite();
		await closed;
		assert.strictEqual(settled, true);
	});

	it('should ignore stream data emitted after close is called', async () => {
		const { proc, stderr, stdout } = createMockProcess();
		const handle = createLogger(proc, resource);

		stdout.write('accepted');
		const closed = handle.close();
		stdout.write('late-stdout');
		stderr.write('late-stderr');
		await closed;

		assert.deepStrictEqual(writes.map(recordPayload), ['accepted\n']);
		assert.strictEqual(stdout.listenerCount('data'), 0);
		assert.strictEqual(stderr.listenerCount('data'), 0);
	});

	it('should not recreate directory when late data arrives after close and directory removal', async () => {
		const { proc, stderr, stdout } = createMockProcess();
		const handle = createLogger(proc, resource);

		stdout.write('accepted-data');
		await handle.close();

		assert.strictEqual(writes.length, 1);
		assert.ok(mkdirPaths.includes(expectedLogDirectory));

		const mkdirCountAfterClose = mkdirPaths.length;
		const writesCountAfterClose = writes.length;

		stdout.write('late-stdout-after-delete');
		stderr.write('late-stderr-after-delete');
		await flushAsyncWork();

		assert.strictEqual(
			mkdirPaths.length,
			mkdirCountAfterClose,
			'mkdir should not be called after close'
		);
		assert.strictEqual(
			writes.length,
			writesCountAfterClose,
			'no additional writes should occur after close'
		);
	});

	it('should return the same drain promise when close is called repeatedly', async () => {
		const { proc } = createMockProcess();
		const handle = createLogger(proc, resource);

		const firstClose = handle.close();
		const secondClose = handle.close();

		assert.strictEqual(secondClose, firstClose);
		await firstClose;
	});

	it('should close automatically when the process emits close', async () => {
		const { proc, stderr, stdout } = createMockProcess();
		let releaseWrite: (() => void) | undefined;
		append = () =>
			new Promise<void>(resolveWrite => {
				releaseWrite = resolveWrite;
			});
		const handle = createLogger(proc, resource);

		stdout.write('accepted');
		proc.emit('close', 0, null);
		stdout.write('late-stdout');
		stderr.write('late-stderr');
		await flushAsyncWork();

		assert.strictEqual(stdout.listenerCount('data'), 0);
		assert.strictEqual(stderr.listenerCount('data'), 0);
		assert.ok(releaseWrite);
		releaseWrite();
		await handle.close();
		assert.deepStrictEqual(writes.map(recordPayload), ['accepted\n']);
	});

	it('should continue presentation and settle after a disk write fails', async () => {
		const { proc, stderr, stdout } = createMockProcess();
		let appendCalls = 0;
		append = () => {
			appendCalls += 1;
			return appendCalls === 1
				? Promise.reject(new Error('simulated disk failure'))
				: Promise.resolve();
		};
		const handle = createLogger(proc, resource);

		stdout.write('first-message');
		stderr.write('second-message');
		await handle.close();

		assert.strictEqual(appendCalls, 2);
		assert.ok(consoleLines.some(line => line.includes('first-message')));
		assert.ok(consoleLines.some(line => line.includes('second-message')));
	});
});
