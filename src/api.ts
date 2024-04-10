import { spawn } from 'child_process';
import colors from 'colors';
import { NextFunction, Request, Response } from 'express';
import { hostname } from 'os';
import * as path from 'path';

import deployDeleteController from './controller/delete';
import uploadController from './controller/upload';

import {
	DeleteBody,
	DeployBody,
	Deployment,
	FetchBranchListBody,
	FetchFilesFromRepoBody,
	ProtocolMessageType,
	WorkerMessage,
	WorkerMessageUnknown,
	allApplications,
	childProcesses,
	deploymentMap
} from './constants';

import AppError from './utils/appError';
import {
	catchAsync,
	deleteRepoFolderIfExist,
	dirName,
	ensureFolderExists,
	execPromise,
	exists,
	installDependencies,
	isIAllApps,
	logProcessOutput
} from './utils/utils';

import { PackageError } from '@metacall/protocol/package';
import { appsDirectory } from './utils/config';

const appsDir = appsDirectory();

colors.enable();

export const callFnByName = (
	req: Request,
	res: Response,
	next: NextFunction
): Response | void => {
	if (!(req.params && req.params.name))
		next(
			new AppError(
				'A function name is required in the path; i.e: /call/sum.',
				404
			)
		);

	const { appName: app, name } = req.params;
	const args = Object.values(req.body);

	if (!(app in childProcesses)) {
		return res
			.status(404)
			.send(
				`Oops! It looks like the application (${app}) hasn't been deployed yet. Please deploy it before you can call its functions.`
			);
	}

	let responseSent = false; // Flag to track if response has been sent
	let errorCame = false;

	childProcesses[app].send({
		type: ProtocolMessageType.Invoke,
		data: {
			name,
			args
		}
	});

	childProcesses[app].on('message', (message: WorkerMessageUnknown) => {
		if (!responseSent) {
			// Check if response has already been sent
			if (message.type === ProtocolMessageType.InvokeResult) {
				responseSent = true; // Set flag to true to indicate response has been sent
				return res.send(JSON.stringify(message.data));
			} else {
				errorCame = true;
			}
		}
	});

	// Default response in case the 'message' event is not triggered
	if (!responseSent && errorCame) {
		responseSent = true; // Set flag to true to indicate response has been sent
		errorCame = false;
		return res.send('Function calling error');
	}
};

export const serveStatic = catchAsync(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		if (!req.params) next(new AppError('Invalid API endpoint', 404));

		const { app, file } = req.params;

		const appLocation = path.join(appsDir, `${app}/${file}`);

		if (!(app in childProcesses)) {
			next(
				new AppError(
					`Oops! It looks like the application (${app}) hasn't been deployed yet. Please deploy it before you can call its functions.`,
					404
				)
			);
		}

		if (!(await exists(appLocation)))
			next(
				new AppError(
					"The file you're looking for might not be available or the application may not be deployed.",
					404
				)
			);

		return res.status(200).sendFile(appLocation);
	}
);

export const fetchFiles = (
	req: Request,
	res: Response,
	next: NextFunction
): void => uploadController(req, res, next);

export const fetchFilesFromRepo = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: FetchFilesFromRepoBody },
		res: Response,
		next: NextFunction
	) => {
		const { branch, url } = req.body;

		await ensureFolderExists(appsDir);

		try {
			await deleteRepoFolderIfExist(appsDir, url);
		} catch (err) {
			next(
				new AppError(
					'error occurred in deleting repository directory',
					500
				)
			);
		}

		await execPromise(
			`cd ${appsDir}; git clone --single-branch --depth=1 --branch ${branch} ${url} `
		);

		const id = dirName(req.body.url);

		// TODO: This method is wrong
		// deployment.id = id;
		// deployment.path = `${appsDir}/${id}`;

		return res.status(201).send({ id });
	}
);

export const fetchBranchList = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: FetchBranchListBody },
		res: Response
	) => {
		const { stdout } = await execPromise(
			`git ls-remote --heads ${req.body.url}`
		);

		const branches: string[] = [];

		JSON.stringify(stdout.toString())
			.split('\\n')
			.forEach(el => {
				if (el.trim().length > 1) {
					branches.push(el.split('refs/heads/')[1]);
				}
			});

		return res.send({ branches });
	}
);

export const fetchFileList = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: FetchFilesFromRepoBody },
		res: Response,
		next: NextFunction
	) => {
		await ensureFolderExists(appsDir);

		try {
			await deleteRepoFolderIfExist(appsDir, req.body.url);
		} catch (err) {
			next(
				new AppError(
					'error occurred in deleting repository directory',
					500
				)
			);
		}
		await execPromise(
			`cd ${appsDir} ; git clone ${req.body.url} --depth=1 --no-checkout`
		);

		const dirPath = `${appsDir}/${dirName(req.body.url)}`;

		const { stdout } = await execPromise(
			`cd ${dirPath} ; git ls-tree -r ${req.body.branch} --name-only; cd .. ; rm -r ${dirPath}`
		);

		return res.send({
			files: JSON.stringify(stdout.toString()).split('\\n')
		});
	}
);

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

			const desiredPath = path.join(__dirname, 'worker', 'index.js');

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
					const message = payload as WorkerMessage<Deployment>;
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

export const showLogs = (req: Request, res: Response): Response => {
	return res.send('Demo Logs...');
};

export const deployDelete = (
	req: Omit<Request, 'body'> & { body: DeleteBody },
	res: Response,
	next: NextFunction
): void => deployDeleteController(req, res, next);

export const validateAndDeployEnabled = (
	req: Request,
	res: Response
): Response =>
	res.status(200).json({
		status: 'success',
		data: true
	});
