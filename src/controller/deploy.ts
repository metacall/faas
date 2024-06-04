import { NextFunction, Request, Response } from 'express';
import { hostname } from 'os';

import { deploymentMap } from '../constants';

import AppError from '../utils/appError';

import { deployProcess } from '../utils/deploy';
import { installDependencies } from '../utils/install';
import { catchAsync } from './catch';

// TODO: Isn't this available inside protocol package? We MUST reuse it
export type DeployBody = {
	suffix: string; // name of deployment
	resourceType: 'Package' | 'Repository';
	release: string;
	env: string[];
	plan: string;
	version: string;
};

export const deploy = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: DeployBody },
		res: Response,
		next: NextFunction
	) => {
		try {
			// TODO: Implement repository
			// req.body.resourceType == 'Repository'

			const deployment = await deploymentMap[req.body.suffix];

			if (deployment === undefined) {
				return next(
					new AppError(
						`Invalid deployment id: ${req.body.suffix}`,
						400
					)
				);
			}

			await installDependencies(deployment);

			await deployProcess(deployment);

			return res.status(200).json({
				prefix: hostname(),
				suffix: deployment.id,
				version: 'v1'
			});
		} catch (err) {
			return next(err);
		}
	}
);
