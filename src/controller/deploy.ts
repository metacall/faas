import { spawn } from 'child_process';
import { NextFunction, Request, Response } from 'express';
import { hostname } from 'os';
import path from 'path';

import {
	DeployBody,
	ProtocolMessageType,
	WorkerMessageUnknown,
	allApplications,
	childProcesses,
	deploymentMap
} from '../constants';

import AppError from '../utils/appError';

import {
	catchAsync,
	installDependencies,
	isIAllApps,
	logProcessOutput
} from '../utils/utils';

import { PackageError } from '@metacall/protocol/package';

export const deploy = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: DeployBody },
		res: Response,
		next: NextFunction
	) => {
		try {
			// TODO: Implement repository
			// req.body.resourceType == 'Repository' &&
			// 	(await calculatePackages(next));

			const deployment = deploymentMap[req.body.suffix];

			if (deployment === undefined) {
				return next(
					new AppError(
						`Invalid deployment id: ${req.body.suffix}`,
						400
					)
				);
			}

			await installDependencies(deployment);

			const desiredPath = path.join(
				path.resolve(__dirname, '..'),
				'worker',
				'index.js'
			);

			const proc = spawn('metacall', [desiredPath], {
				stdio: ['pipe', 'pipe', 'pipe', 'ipc']
			});

			proc.send({
				type: ProtocolMessageType.Load,
				data: deployment
			});

			logProcessOutput(proc.stdout, proc.pid, deployment.id);
			logProcessOutput(proc.stderr, proc.pid, deployment.id);

			proc.on('message', (payload: WorkerMessageUnknown) => {
				if (payload.type === ProtocolMessageType.MetaData) {
					const message = payload;
					if (isIAllApps(message.data)) {
						const appName = Object.keys(message.data)[0];
						childProcesses[appName] = proc;
						allApplications[appName] = message.data[appName];
					}
				}
			});

			return res.status(200).json({
				suffix: hostname(),
				prefix: deployment.id,
				version: 'v1'
			});
		} catch (err) {
			// Check if the error is PackageError.Empty
			if (err === PackageError.Empty) {
				return next(err);
			}
			return next(err);
		}
	}
);
