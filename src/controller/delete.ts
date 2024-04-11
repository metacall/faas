import { NextFunction, Request, Response } from 'express';

import { ChildProcess } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';

import { allApplications, childProcesses } from '../constants';
import { appsDirectory } from '../utils/config';
import { catchAsync, ensureFolderExists } from '../utils/utils';

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

type DeleteBody = {
	suffix: string; // name of deployment
	prefix: string;
	version: string;
};

// TODO: Refactor this, do not use sync methods
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

		// Check if the application exists in childProcesses and allApplications objects
		if (!(app in childProcesses && app in allApplications)) {
			isError = true;
			return res.send(deleteStatusMessage(app)['error']);
		}

		// Retrieve the child process associated with the application and kill it
		const childProcessesInApplications: ChildProcess = childProcesses[app];
		childProcessesInApplications.kill();

		// Remove the application from childProcesses and allApplications objects
		delete childProcesses[app];
		delete allApplications[app];

		if (app in childProcesses && app in allApplications) {
			isError = true;
			return res.send(deleteStatusMessage(app)['appShouldntExist']);
		}

		// Determine the location of the application
		const appLocation = join(appsDirectory, app);

		// Delete the directory of the application
		rmSync(appLocation, { recursive: true, force: true });

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
