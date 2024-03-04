import { spawn } from 'child_process';
import colors from 'colors';
import { NextFunction, Request, Response } from 'express';
import { hostname } from 'os';
import * as path from 'path';

import upload from './controller/upload';

import {
	allApplications,
	childProcessResponse,
	cps,
	currentFile,
	deployBody,
	fetchBranchListBody,
	fetchFilesFromRepoBody,
	protocol
} from './constants';

import AppError from './utils/appError';
import {
	calculatePackages,
	catchAsync,
	deleteRepoFolderIfExist,
	dirName,
	ensureFolderExists,
	execPromise,
	exists,
	installDependencies,
	isIAllApps
} from './utils/utils';

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

	let responseSent = false; // Flag to track if response has been sent
	let errorCame = false;

	cps[app].send({
		type: protocol.c,
		fn: {
			name,
			args
		}
	});

	cps[app].on('message', (data: childProcessResponse) => {
		if (!responseSent) {
			// Check if response has already been sent
			if (data.type === protocol.r) {
				responseSent = true; // Set flag to true to indicate response has been sent
				return res.send(JSON.stringify(data.data));
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
	async (req: Request, res: Response, next: NextFunction) => {
		if (!req.params) next(new AppError('Invalid API endpoint', 404));

		const { app, file } = req.params;

		const appLocation = path.join(appsDir, `${app}/${file}`);

		// TODO - The best way to handle this is first list all the application which has been deployed and match if there is application or not and then go for file search

		if (!(await exists(appLocation)))
			next(
				new AppError(
					"The file you're looking for might not be available or the application may not be deployed.",
					404
				)
			);

		res.status(200).sendFile(appLocation);
	}
);

export const fetchFiles = (
	req: Request,
	res: Response,
	next: NextFunction
): void => upload(req, res, next);

export const fetchFilesFromRepo = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: fetchFilesFromRepoBody },
		res: Response,
		next: NextFunction
	) => {
		const { branch, url } = req.body;

		await ensureFolderExists(appsDir);

		try {
			deleteRepoFolderIfExist(appsDir, url);
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

		currentFile['id'] = id;
		currentFile.path = `${appsDir}/${id}`;

		res.status(201).send({ id });
	}
);

export const fetchBranchList = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: fetchBranchListBody },
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

		res.send({ branches });
	}
);

export const fetchFileList = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: fetchFilesFromRepoBody },
		res: Response,
		next: NextFunction
	) => {
		await ensureFolderExists(appsDir);

		try {
			deleteRepoFolderIfExist(appsDir, req.body.url);
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

		res.send({ files: JSON.stringify(stdout.toString()).split('\\n') });
	}
);

export const deploy = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: deployBody },
		res: Response
	) => {
		req.body.resourceType == 'Repository' && (await calculatePackages());

		// TODO Currently Deploy function will only work for workdir, we will add the addRepo

		await installDependencies();

		const desiredPath = path.join(__dirname, '/worker/index.js');

		const proc = spawn('metacall', [desiredPath], {
			stdio: ['pipe', 'pipe', 'pipe', 'ipc']
		});

		proc.send({
			type: protocol.l,
			currentFile
		});

		proc.stdout?.on('data', (data: Buffer) => {
			console.log(data.toString().green);
		});
		proc.stderr?.on('data', (data: Buffer) => {
			console.log(data.toString().red);
		});

		proc.on('message', (data: childProcessResponse) => {
			if (data.type === protocol.g) {
				if (isIAllApps(data.data)) {
					const appName = Object.keys(data.data)[0];
					cps[appName] = proc;
					allApplications[appName] = data.data[appName];
				}
			}
		});

		res.status(200).json({
			suffix: hostname(),
			prefix: currentFile.id,
			version: 'v1'
		});

		// Handle err == PackageError.Empty, use next function for error handling
	}
);

export const showLogs = (req: Request, res: Response): Response => {
	return res.send('Demo Logs...');
};

export const validateAndDeployEnabled = (
	req: Request,
	res: Response
): Response =>
	res.status(200).json({
		status: 'success',
		data: true
	});

/**
 * deploy
 * Provide a mesage that repo has been deployed, use --inspect to know more about deployment
 * We can add the type of url in the --inspect
 * If there is already metacall.json present then, log found metacall.json and reading it, reading done
 * We must an option to go back in the fileselection wizard so that, user dont have to close the connection
 * At the end of deployment through deploy cli, we should run the --inspect command so that current deployed file is shown and show only the current deployed app
 *
 *
 * FAAS
 * the apps are not getting detected once the server closes, do we need to again deploy them
 * find a way to detect metacall.json in the files and dont deploy if there is not because json ke through hi hum upload krre hai
 *
 */
