import { NextFunction, Request, Response } from 'express';
import { Applications } from '../app';
import AppError from '../utils/appError';
import { WorkerMessageType, WorkerMessageUnknown } from '../worker/protocol';

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

	new Promise((resolve, reject) => {
		application.proc?.send({
			type: WorkerMessageType.Invoke,
			data: {
				name: func,
				args
			}
		});

		application.proc?.on('message', (message: WorkerMessageUnknown) => {
			if (message.type === WorkerMessageType.InvokeResult) {
				resolve(JSON.stringify(message.data));
			}
		});

		application.proc?.on('exit', code => {
			// The application may have been ended unexpectedly,
			// probably segmentation fault (exit code 139 in Linux)
			reject(
				JSON.stringify({
					error: `Deployment '${suffix}' process exited with code: ${
						code || 'unknown'
					}`
				})
			);
		});
	})
		.then(data => {
			res.send(data);
		})
		.catch(error => {
			res.status(500).send(error);
		});
};
