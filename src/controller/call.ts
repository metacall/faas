import { NextFunction, Request, Response } from 'express';
import { Applications } from '../app';

import AppError from '../utils/appError';
import { invokeQueue } from '../utils/invoke';
import { WorkerMessageType } from '../worker/protocol';

export const callFunction = (
	req: Request,
	res: Response,
	next: NextFunction
): Response | void => {
	if (!req.params?.suffix) {
		return next(
			new AppError('A the deployment name (suffix) is required.', 404)
		);
	}

	if (!req.params?.func) {
		return next(
			new AppError(
				'A function name is required in the path; i.e: /call/sum.',
				404
			)
		);
	}

	const { suffix, func } = req.params;
	const args = Object.values(req.body);
	const application = Applications[suffix];

	// Check if the application exists and it is running
	if (!application?.proc) {
		return res
			.status(404)
			.send(
				`Oops! It looks like the application '${suffix}' has not been deployed yet. Please deploy it before you can call its functions.`
			);
	}

	// Enqueue the call with a specific id, in order to be able to resolve the
	// promise later on when the message is received in the process message handler
	application.proc?.send({
		type: WorkerMessageType.Invoke,
		data: {
			id: invokeQueue.push({
				resolve: (data: string) => {
					res.send(data);
				},
				reject: (error: string) => {
					res.status(500).send(error);
				}
			}),
			name: func,
			args
		}
	});
};
