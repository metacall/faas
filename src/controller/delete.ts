import { ChildProcess } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';

import { Request, Response } from 'express';

import { allApplications, cps, deleteBody } from '../constants';
import { appsDirectory } from '../utils/config';
import { deleteStatusMessage } from '../utils/resposeTexts';

export default (
	req: Omit<Request, 'body'> & { body: deleteBody },
	res: Response
): Response => {
	// Extract the suffix (application name) of the application from the request body
	const { suffix: app } = req.body;

	// Initialize isError flag
	let isError = false;

	// Check if the application exists in cps and allApplications objects
	if (!(app in cps && app in allApplications)) {
		isError = true;
	}

	// Retrieve the child process associated with the application and kill it
	const appCP: ChildProcess = cps[app];
	appCP.kill();

	// Remove the application from cps and allApplications objects
	delete cps[app];
	delete allApplications[app];

	// Determine the location of the application
	const appLocation = join(appsDirectory(), app);

	// Delete the directory of the application
	rmSync(appLocation, { recursive: true, force: true });

	// Send response based on whether there was an error during deletion
	return res.send(
		isError
			? deleteStatusMessage(app)['error']
			: deleteStatusMessage(app)['success']
	);
};
