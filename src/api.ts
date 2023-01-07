import busboy from 'busboy';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { metacall } from 'metacall';
import * as path from 'path';

import { Extract } from 'unzipper';

import {
	currentFile,
	deployBody,
	fetchBranchListBody,
	fetchFilesFromRepoBody,
	namearg
} from './constants';

import {
	calculatePackages,
	catchAsync,
	dirName,
	ensureFolderExists,
	execPromise,
	installDependencies
} from './utils/utils';

export const callFnByName = (req: Request, res: Response): Response => {
	if (!(req.params && req.params.name)) {
		return res
			.status(400)
			.send('A function name is required in the path; i.e: /call/sum.');
	}

	const args = Object.values(req.body);

	return res.send(JSON.stringify(metacall(req.params.name, ...args)));
};

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
		if (name == 'jsons' || name == 'runners') {
			currentFile[name] = JSON.parse(val) as string[];
		} else {
			currentFile[name] = val;
		}
	});

	bb.on('close', () => {
		res.end();

		const appLocation = path.join(__dirname, `/apps/${currentFile.id}/`);

		fs.createReadStream(currentFile.path).pipe(
			Extract({ path: appLocation })
		);

		fs.unlinkSync(currentFile.path);

		currentFile.path = appLocation;
	});

	req.pipe(bb);
};

export const fetchFilesFromRepo = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: fetchFilesFromRepoBody },
		res: Response
	) => {
		const { branch, url } = req.body;

		const appLocation = path.join(__dirname, `/apps/`);

		await ensureFolderExists(appLocation);

		await execPromise(
			`cd ${appLocation}; git clone --single-branch --depth=1 --branch ${branch} ${url} `
		);

		const id = dirName(req.body.url);

		currentFile['id'] = id;
		currentFile.path = appLocation + id;

		res.send({ id });
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
		const appLocation = path.join(__dirname, `/apps/`);

		await ensureFolderExists(appLocation);

		await execPromise(
			`cd ${appLocation} ; git clone ${req.body.url} --depth=1 --no-checkout`
		);

		const dirPath = appLocation + dirName(req.body.url);

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

		await installDependencies();

		//	evalMetacall();

		res.status(200).send({});

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
