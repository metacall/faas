import { strict as assert } from 'assert';
import { NextFunction, Request, Response } from 'express';
import AppError from '../utils/appError';
import { handlePackageUploadError } from '../controller/package';

describe('Fix: packageUpload Async Cleanup Error Handling', function () {
	it('should unpipe and forward the error before a response is sent', () => {
		let unpipeCalls = 0;
		let nextError: AppError | undefined;
		const req = {
			unpipe(_stream: NodeJS.WritableStream) {
				unpipeCalls += 1;
				return this;
			}
		} as unknown as Pick<Request, 'unpipe'>;
		const res = {
			headersSent: false
		} as Pick<Response, 'headersSent'>;
		const bb = {} as NodeJS.WritableStream;
		const state = { requestSettled: false };
		const error = new AppError('upload failed', 500);
		const next = ((err?: unknown) => {
			nextError = err as AppError;
		}) as NextFunction;

		handlePackageUploadError(req, res, bb, next, state, error);

		assert.strictEqual(unpipeCalls, 1);
		assert.strictEqual(nextError, error);
		assert.strictEqual(state.requestSettled, true);
	});

	it('should ignore async cleanup errors after headers were already sent', () => {
		let unpipeCalls = 0;
		let nextCalls = 0;
		const logs: string[] = [];
		const req = {
			unpipe(_stream: NodeJS.WritableStream) {
				unpipeCalls += 1;
				return this;
			}
		} as unknown as Pick<Request, 'unpipe'>;
		const res = {
			headersSent: true
		} as Pick<Response, 'headersSent'>;
		const bb = {} as NodeJS.WritableStream;
		const state = { requestSettled: true };
		const error = new AppError('cleanup failed', 500);
		const next = (() => {
			nextCalls += 1;
		}) as NextFunction;

		handlePackageUploadError(req, res, bb, next, state, error, message => {
			logs.push(message);
		});

		assert.strictEqual(unpipeCalls, 0);
		assert.strictEqual(nextCalls, 0);
		assert.strictEqual(logs.length, 1);
		assert.match(logs[0], /Ignoring package upload async error/);
	});

	it('should ignore repeated errors once the request is already settled', () => {
		let unpipeCalls = 0;
		let nextCalls = 0;
		const req = {
			unpipe(_stream: NodeJS.WritableStream) {
				unpipeCalls += 1;
				return this;
			}
		} as unknown as Pick<Request, 'unpipe'>;
		const res = {
			headersSent: false
		} as Pick<Response, 'headersSent'>;
		const bb = {} as NodeJS.WritableStream;
		const state = { requestSettled: true };
		const error = new AppError('late cleanup failure', 500);
		const next = (() => {
			nextCalls += 1;
		}) as NextFunction;

		handlePackageUploadError(req, res, bb, next, state, error, () => {
			return;
		});

		assert.strictEqual(unpipeCalls, 0);
		assert.strictEqual(nextCalls, 0);
		assert.strictEqual(state.requestSettled, true);
	});
});
