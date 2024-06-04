import { NextFunction, Request, Response } from 'express';

import { rm } from 'fs/promises';
import { join } from 'path';

import { allApplications } from '../constants';
import { appsDirectory } from '../utils/config';
import { ensureFolderExists } from '../utils/filesystem';
import { Processes } from '../worker/master';
import { catchAsync } from './catch';

const deleteStatusMessage = (
	app: string
): {
	success: string;
	error: string;
	folderShouldntExist: string;
	appShouldntExist: string;
} => ({
	success: 'Deploy Delete Succeed',
	error: `Oops! It looks like the application (${app}) hasn't been deployed yet. Please deploy it before you delete it.`,
	folderShouldntExist: `The folder shouldnt exist after deleting it.`,
	appShouldntExist: `The application shouldnt exist after deleting it`
});

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
		const { suffix: app } = req.body;

		// Initialize isError flag
		let isError = false;

		// Check if the application exists in Processes and allApplications objects
		if (!(app in Processes && app in allApplications)) {
			isError = true;
			return res.send(deleteStatusMessage(app)['error']);
		}

		// Retrieve the child process associated with the application and kill it
		Processes[app].kill();

		// Remove the application from Processes and allApplications objects
		delete Processes[app];
		delete allApplications[app];

		if (app in Processes && app in allApplications) {
			isError = true;
			return res.send(deleteStatusMessage(app)['appShouldntExist']);
		}

		// Determine the location of the application
		const appLocation = join(appsDirectory, app);

		// Delete the directory of the application
		await rm(appLocation, { recursive: true, force: true });

		if (!(await ensureFolderExists(appLocation))) {
			isError = true;
			return res.send(deleteStatusMessage(app)['folderShouldntExist']);
		}

		// Send response based on whether there was an error during deletion
		return res.send(
			isError
				? deleteStatusMessage(app)['error']
				: deleteStatusMessage(app)['success']
		);
	}
);
