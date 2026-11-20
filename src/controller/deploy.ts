import { NextFunction, Request, Response } from 'express';
import { hostname } from 'os';

import * as fs from 'fs';
import path from 'path';
import { Applications } from '../app';
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

// Applications with a deploy request in progress.
const deploysInFlight = new Set<string>();

// A failed deploy leaves the uploaded app registered: it blocks re-uploading the
// name but can't be inspected or deleted. Drop it and its files so a retry works.
export const discardFailedDeploy = async (suffix: string): Promise<void> => {
	const application = Applications[suffix];
	if (!application || application.deployment) return;

	const resource = await application.resource?.catch(() => undefined);
	application.kill();
	delete Applications[suffix];

	if (resource?.path) {
		await fs.promises.rm(resource.path, { recursive: true, force: true });
	}
};

export const deploy = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: DeployBody },
		res: Response,
		next: NextFunction
	) => {
		// Only the request that started the deploy cleans it up
		let ownsDeploy = false;

		try {
			const application = Applications[req.body.suffix];

			// Check if the application exists and it is stored
			if (!application?.resource) {
				throw new AppError(
					`Invalid deployment id: ${req.body.suffix}`,
					400
				);
			}

			if (deploysInFlight.has(req.body.suffix)) {
				throw new AppError(
					`Application '${req.body.suffix}' is already being deployed.`,
					409
				);
			}
			deploysInFlight.add(req.body.suffix);
			ownsDeploy = true;

			const resource = await application.resource;

			// Store the environment variables for when reloading the FaaS
			const env: Record<string, string> = {};
			for (const envVar of req.body.env as unknown as {
				name: string;
				value: string;
			}[]) {
				env[envVar.name] = envVar.value;
			}
			const envFilePath = path.join(resource.path, `.env`);
			const envFileContent = Object.entries(env)
				.map(([key, value]) => `${key}=${value}`)
				.join('\n');

			fs.appendFileSync(envFilePath, envFileContent, 'utf-8');

			await installDependencies(resource);

			await deployProcess(resource, env);

			return res.status(200).json({
				prefix: hostname(),
				suffix: resource?.id,
				version: 'v1'
			});
		} catch (err) {
			if (ownsDeploy) await discardFailedDeploy(req.body.suffix);
			return next(err);
		} finally {
			if (ownsDeploy) deploysInFlight.delete(req.body.suffix);
		}
	}
);
