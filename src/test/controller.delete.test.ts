import { strict as assert } from 'assert';
import { ChildProcess } from 'child_process';
import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Application, Applications, Resource } from '../app';
import { deployDelete } from '../controller/delete';
import { IAppError } from '../utils/appError';
import { appsDirectory } from '../utils/config';
import { ProcessLogHandle } from '../utils/logger';

interface MockResponse {
	res: Response;
	getJSON: () => unknown;
	getStatusCode: () => number;
}

type MutableFsPromises = {
	rm: typeof fs.promises.rm;
};

const mutableFsPromises = fs.promises as MutableFsPromises;
const originalRm = mutableFsPromises.rm;

function createMockResponse(): MockResponse {
	let statusCode = 200;
	let responseBody: unknown;

	const res = {
		status(code: number) {
			statusCode = code;
			return this;
		},
		json(body: unknown) {
			responseBody = body;
			return this;
		},
		send(body: unknown) {
			responseBody = body;
			return this;
		}
	} as unknown as Response;

	return {
		res,
		getJSON: () => responseBody,
		getStatusCode: () => statusCode
	};
}

async function invokeDeployDelete(req: Partial<Request>): Promise<{
	err?: IAppError;
	response: MockResponse;
}> {
	const mockRes = createMockResponse();
	let capturedError: IAppError | undefined;

	const next: NextFunction = (err?: unknown) => {
		if (err) {
			capturedError = err as IAppError;
		}
	};

	await (
		deployDelete as unknown as (
			req: Request,
			res: Response,
			next: NextFunction
		) => Promise<unknown>
	)(req as Request, mockRes.res, next);

	return { err: capturedError, response: mockRes };
}

describe('deploy delete', () => {
	let removedPaths: Array<{ path: string; options?: unknown }>;
	let rmCallCount: number;

	beforeEach(() => {
		removedPaths = [];
		rmCallCount = 0;
		mutableFsPromises.rm = ((
			targetPath: fs.PathLike,
			options?: unknown
		) => {
			rmCallCount++;
			removedPaths.push({ path: String(targetPath), options });
			return Promise.resolve();
		}) as typeof fs.promises.rm;
	});

	afterEach(() => {
		mutableFsPromises.rm = originalRm;
		for (const key of Object.keys(Applications)) {
			delete Applications[key];
		}
	});

	it('should return 200 when application is not deployed', async () => {
		const suffix = 'unstarted-app';
		const { err, response } = await invokeDeployDelete({
			body: { suffix }
		});

		assert.strictEqual(err, undefined);
		assert.strictEqual(response.getStatusCode(), 200);
		assert.strictEqual(
			response.getJSON(),
			`Oops! It looks like the application '${suffix}' hasn't been deployed yet. Please deploy it before you delete it.`
		);
		assert.strictEqual(rmCallCount, 0);
	});

	it('should return 200 when application has no running process', async () => {
		const suffix = 'unstarted-app';
		const app = new Application();
		app.proc = undefined;
		Applications[suffix] = app;

		const { err, response } = await invokeDeployDelete({
			body: { suffix }
		});

		assert.strictEqual(err, undefined);
		assert.strictEqual(response.getStatusCode(), 200);
		assert.strictEqual(
			response.getJSON(),
			`Oops! It looks like the application '${suffix}' hasn't been deployed yet. Please deploy it before you delete it.`
		);
		assert.strictEqual(rmCallCount, 0);
	});

	it('should kill the process, drain logger, and delete directory on success', async () => {
		const suffix = 'lifecycle-app';
		const events: string[] = [];
		let resolveDrain: () => void = () => undefined;
		const drainPromise = new Promise<void>(resolve => {
			resolveDrain = resolve;
		});

		const app = new Application();
		app.proc = {
			kill: () => {
				events.push('proc.kill');
				return true;
			}
		} as unknown as ChildProcess;
		app.resource = Promise.resolve({
			id: suffix,
			path: path.join(appsDirectory, suffix),
			jsons: [],
			runners: []
		} as Resource);

		const mockLogger: ProcessLogHandle = {
			close: () => {
				events.push('logger.close');
				return drainPromise.then(() => {
					events.push('logger.drained');
				});
			}
		};
		app.logger = mockLogger;
		Applications[suffix] = app;

		mutableFsPromises.rm = (() => {
			events.push('fs.rm');
			return Promise.resolve();
		}) as typeof fs.promises.rm;

		const deletePromise = invokeDeployDelete({
			body: { suffix }
		});

		await new Promise(r => setImmediate(r));

		assert.deepStrictEqual(events, ['proc.kill', 'logger.close']);

		resolveDrain();
		const { err, response } = await deletePromise;

		assert.strictEqual(err, undefined);
		assert.strictEqual(response.getStatusCode(), 200);
		assert.strictEqual(response.getJSON(), 'Deploy Delete Succeed');

		assert.deepStrictEqual(events, [
			'proc.kill',
			'logger.close',
			'logger.drained',
			'fs.rm',
			'fs.rm'
		]);
		assert.strictEqual(Applications[suffix], undefined);
	});
});
