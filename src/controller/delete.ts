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

		// Check if the application exists and it is running
		if (!application?.proc) {
			return res.send(
				`Oops! It looks like the application '${suffix}' hasn't been deployed yet. Please deploy it before you delete it.`
			);
		}

		// Retrieve the child process associated with the application and kill it
		application.kill();

		// Remove the application Applications object
		delete Applications[suffix];

		// Determine the location of the application
		const appLocation = join(appsDirectory, suffix);

		// Delete the directory of the application
		await rm(appLocation, { recursive: true, force: true });

		// Send response based on whether there was an error during deletion
		return res.send('Deploy delete succeed!');
	}
);
