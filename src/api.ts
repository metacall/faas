import * as fs from 'fs';
import { hostname } from 'os';
import * as path from 'path';

import busboy from 'busboy';
import { NextFunction, Request, Response } from 'express';
import { Extract } from 'unzipper';

import {
	allApplications,
	currentFile,
	deployBody,
	fetchBranchListBody,
	fetchFilesFromRepoBody,
	namearg
} from './constants';

import { MetaCallJSON } from '@metacall/protocol/deployment';
import AppError from './utils/appError';
import {
	calculatePackages,
	catchAsync,
	dirName,
	ensureFolderExists,
	execPromise,
	exists,
	installDependencies
} from './utils/utils';

import { handleJSONFiles } from './controller/deploy';
import { appsDirectory } from './utils/config';

const appsDir = appsDirectory();

export const callFnByName = (
	req: Request,
	res: Response,
	next: NextFunction
): Response => {
	if (!(req.params && req.params.name))
		next(
			new AppError(
				'A function name is required in the path; i.e: /call/sum.',
				404
			)
		);

	const { appName: app, name } = req.params;
	const args = Object.values(req.body);

	return res.send(JSON.stringify(allApplications[app].funcs[name](...args)));
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

export const fetchFiles = (req: Request, res: Response): void => {
	const bb = busboy({ headers: req.headers });
	bb.on('file', (name, file, info) => {
		const { mimeType, filename } = info;
		if (
			mimeType != 'application/x-zip-compressed' &&
			mimeType != 'application/zip'
		) {
			return res.status(401).json({
				status: 'Failed',
				message: 'Upload a zip file'
			});
		}

		const saveTo = path.join(__dirname, filename);
		currentFile.path = saveTo;
		file.pipe(fs.createWriteStream(saveTo));
	});

	bb.on('field', (name: namearg, val: string) => {
		if (name === 'runners') {
			currentFile['runners'] = JSON.parse(val) as string[];
		} else if (name === 'jsons') {
			currentFile['jsons'] = JSON.parse(val) as MetaCallJSON[];
		} else {
			currentFile[name] = val;
		}
	});

	bb.on('finish', () => {
		const appLocation = path.join(appsDir, `${currentFile.id}`);

		fs.createReadStream(currentFile.path).pipe(
			Extract({ path: appLocation })
		);

		fs.unlinkSync(currentFile.path);

		currentFile.path = appLocation;
	});

	bb.on('close', () => {
		res.status(201).json({
			id: currentFile.id
		});
	});

	req.pipe(bb);
};

export const fetchFilesFromRepo = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: fetchFilesFromRepoBody },
		res: Response
	) => {
		const { branch, url } = req.body;

		await ensureFolderExists(appsDir);

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
		res: Response
	) => {
		await ensureFolderExists(appsDir);

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

		await handleJSONFiles(
			currentFile.path,
			currentFile.id,
			req.body.version
		);

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
 *
 */
