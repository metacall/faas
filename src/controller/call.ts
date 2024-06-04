import { NextFunction, Request, Response } from 'express';
import AppError from '../utils/appError';
import {
	Processes,
	WorkerMessageType,
	WorkerMessageUnknown
} from '../worker/master';

export const callFunction = (
	req: Request,
	res: Response,
	next: NextFunction
): Response | void => {
	if (!(req.params && req.params.name))
		next(
			new AppError(
				'A function name is required in the path; i.e: /call/sum.',
				404
			)
		);

	const { appName: app, name } = req.params;
	const args = Object.values(req.body);

	if (!(app in Processes)) {
		return res
			.status(404)
			.send(
				`Oops! It looks like the application (${app}) hasn't been deployed yet. Please deploy it before you can call its functions.`
			);
	}

	let responseSent = false; // Flag to track if response has been sent
	let errorCame = false;

	Processes[app].send({
		type: WorkerMessageType.Invoke,
		data: {
			name,
			args
		}
	});

	Processes[app].on('message', (message: WorkerMessageUnknown) => {
		if (!responseSent) {
			// Check if response has already been sent
			if (message.type === WorkerMessageType.InvokeResult) {
				responseSent = true; // Set flag to true to indicate response has been sent
				return res.send(JSON.stringify(message.data));
			} else {
				errorCame = true;
			}
		}
	});

	// Default response in case the 'message' event is not triggered
	if (!responseSent && errorCame) {
		responseSent = true; // Set flag to true to indicate response has been sent
		errorCame = false;
		return res.send('Function calling error');
	}
};
