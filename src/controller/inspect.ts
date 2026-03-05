import { Deployment } from '@metacall/protocol';
import { Request, Response } from 'express';
import { Applications } from '../app';

export const inspect = (_req: Request, res: Response): Response => {
	const deployments: Deployment[] = [];

	for (const application of Object.values(Applications)) {
		// Check if the application is deployed
		if (application.deployment) {
			// Skip applications whose deployment has no packages instead of crashing
			if (!application.deployment.packages) {
				continue;
			}
			deployments.unshift(application.deployment);
		}
	}

	return res.send(deployments);
};
