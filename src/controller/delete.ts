import { NextFunction, Request, Response } from 'express';

import { rm } from 'fs/promises';
import { join } from 'path';

import { Applications } from '../app';
import { appsDirectory } from '../utils/config';
import { catchAsync } from './catch';

// TODO: Isn't this available inside protocol package? We MUST reuse it
type DeleteBody = {
	suffix: string; // name of deployment
	prefix: string;
	version: string;
};

export const deployDelete = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: DeleteBody },
		res: Response,
		_next: NextFunction
	): Promise<Response> => {
		// Extract the suffix (application name) of the application from the request body
		const { suffix } = req.body;
		const application = Applications[suffix];

		// Check if the application exists at all (in memory)
		if (!application) {
			return res.status(404).json({
				error: `Application '${suffix}' not found.`
			});
		}

		// Kill the child process if it exists (graceful cleanup)
		// Note: application.proc may be undefined if deployment failed,
		// but we still want to clean up the resource
		if (application.proc) {
			application.kill();
		}

		// Remove the application from the Applications object
		delete Applications[suffix];

		// Determine the location of the application
		const appLocation = join(appsDirectory, suffix);

		// Delete the directory of the application (force removal regardless of state)
		await rm(appLocation, { recursive: true, force: true });

		// Send response
		return res.status(200).json({
			message: 'Application deleted successfully'
		});
	}
);
