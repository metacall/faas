import { Deployment } from '@metacall/protocol';
import { Request, Response } from 'express';
import { Applications } from '../app';

export const inspect = (_req: Request, res: Response): Response => {
	const deployments: Deployment[] = [];

	for (const application of Object.values(Applications)) {
		// Check if the application is deployed
		if (application.deployment) {
			// Ensure packages is not undefined or null
			if (!application.deployment.packages) {
				throw new Error('Packages is undefined or null');
			}
			deployments.unshift(application.deployment);
		}
	}

	return res.send(deployments);
};
