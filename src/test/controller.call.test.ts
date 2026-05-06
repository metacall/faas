import { strict as assert } from 'assert';
import { ChildProcess } from 'child_process';
import { NextFunction, Request, Response } from 'express';
import { Application, Applications } from '../app';
import { callFunction } from '../controller/call';
import { invokeQueue } from '../utils/invoke';
import { WorkerMessageType } from '../worker/protocol';

interface SentMessage {
	type: WorkerMessageType;
	data: {
		id: string;
		name: string;
		args: unknown[];
	};
}

function createResponse(): Response {
	return {
		status(_code: number) {
			return this;
		},
		send(_body?: unknown) {
			return this;
		}
	} as unknown as Response;
}

describe('Fix: callFunction Request Body Handling', function () {
	const suffix = 'issue-11-app';
	const originalPush = invokeQueue.push.bind(invokeQueue);

	afterEach(() => {
		delete Applications[suffix];
		invokeQueue.push = originalPush;
	});

	it('should enqueue an empty argument list when req.body is undefined', () => {
		let sentMessage: SentMessage | undefined;
		invokeQueue.push = () => 'invoke-id';
		Applications[suffix] = {
			proc: {
				send: (message: SentMessage) => {
					sentMessage = message;
					return true;
				}
			} as unknown as ChildProcess
		} as Application;

		const req = {
			params: { suffix, func: 'sum' },
			body: undefined
		} as unknown as Request;

		assert.doesNotThrow(() => {
			callFunction(
				req,
				createResponse(),
				(() => undefined) as NextFunction
			);
		});
		assert.deepStrictEqual(sentMessage?.data.args, []);
		assert.strictEqual(sentMessage?.data.name, 'sum');
		assert.strictEqual(sentMessage?.type, WorkerMessageType.Invoke);
	});

	it('should enqueue an empty argument list when req.body is null', () => {
		let sentMessage: SentMessage | undefined;
		invokeQueue.push = () => 'invoke-id';
		Applications[suffix] = {
			proc: {
				send: (message: SentMessage) => {
					sentMessage = message;
					return true;
				}
			} as unknown as ChildProcess
		} as Application;

		const req = {
			params: { suffix, func: 'sum' },
			body: null
		} as unknown as Request;

		assert.doesNotThrow(() => {
			callFunction(
				req,
				createResponse(),
				(() => undefined) as NextFunction
			);
		});
		assert.deepStrictEqual(sentMessage?.data.args, []);
	});

	it('should preserve object values as invocation arguments', () => {
		let sentMessage: SentMessage | undefined;
		invokeQueue.push = () => 'invoke-id';
		Applications[suffix] = {
			proc: {
				send: (message: SentMessage) => {
					sentMessage = message;
					return true;
				}
			} as unknown as ChildProcess
		} as Application;

		const req = {
			params: { suffix, func: 'sum' },
			body: { first: 1, second: 2, label: 'three' }
		} as unknown as Request;

		callFunction(req, createResponse(), (() => undefined) as NextFunction);
		assert.deepStrictEqual(sentMessage?.data.args, [1, 2, 'three']);
	});

	it('should ignore primitive request bodies instead of coercing them', () => {
		let sentMessage: SentMessage | undefined;
		invokeQueue.push = () => 'invoke-id';
		Applications[suffix] = {
			proc: {
				send: (message: SentMessage) => {
					sentMessage = message;
					return true;
				}
			} as unknown as ChildProcess
		} as Application;

		const req = {
			params: { suffix, func: 'sum' },
			body: 'text body'
		} as unknown as Request;

		callFunction(req, createResponse(), (() => undefined) as NextFunction);
		assert.deepStrictEqual(sentMessage?.data.args, []);
	});
});
