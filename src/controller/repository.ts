import { NextFunction, Request, Response } from 'express';
import { promises as fs } from 'fs';
import { join } from 'path';
import AppError from '../utils/appError';
import { appsDirectory } from '../utils/config';
import { catchAsync, execPromise } from '../utils/utils';

// TODO: Isn't this available inside protocol package? We MUST reuse it
type FetchFilesFromRepoBody = {
	branch: string;
	url: string;
};

// TODO: Isn't this available inside protocol package? We MUST reuse it
type FetchBranchListBody = {
	url: string;
};

const dirName = (gitUrl: string): string =>
	String(gitUrl.split('/')[gitUrl.split('/').length - 1]).replace('.git', '');

const deleteRepoFolderIfExist = async <Path extends string>(
	path: Path,
	url: string
): Promise<void> => {
	const folder = dirName(url);
	const repoFilePath = join(path, folder);

	await fs.rm(repoFilePath, { recursive: true, force: true });
};

export const fetchFilesFromRepo = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: FetchFilesFromRepoBody },
		res: Response,
		next: NextFunction
	) => {
		const { branch, url } = req.body;

		try {
			await deleteRepoFolderIfExist(appsDirectory, url);
		} catch (err) {
			next(
				new AppError(
					'error occurred in deleting repository directory',
					500
				)
			);
		}

		await execPromise(
			`cd ${appsDirectory} && git clone --single-branch --depth=1 --branch ${branch} ${url} `
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
		try {
			await deleteRepoFolderIfExist(appsDirectory, req.body.url);
		} catch (err) {
			next(
				new AppError(
					'error occurred in deleting repository directory',
					500
				)
			);
		}
		await execPromise(
			`cd ${appsDirectory} ; git clone ${req.body.url} --depth=1 --no-checkout`
		);

		const dirPath = `${appsDirectory}/${dirName(req.body.url)}`;

		const { stdout } = await execPromise(
			`cd ${dirPath} ; git ls-tree -r ${req.body.branch} --name-only; cd .. ; rm -r ${dirPath}`
		);

		return res.send({
			files: JSON.stringify(stdout.toString()).split('\\n')
		});
	}
);
