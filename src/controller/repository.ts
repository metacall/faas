import { NextFunction, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path, { join } from 'path';
import { Application, Applications, Resource } from '../app';
import AppError from '../utils/appError';
import { appsDirectory } from '../utils/config';
import { exec } from '../utils/exec';
import { findRunners } from '../utils/install';
import { catchAsync } from './catch';

// TODO: Isn't this available inside protocol package? We MUST reuse it
type FetchFilesFromRepoBody = {
	branch: string;
	url: string;
};

// TODO: Isn't this available inside protocol package? We MUST reuse it
type FetchBranchListBody = {
	url: string;
};

const repositoryName = (gitUrl: string): string =>
	String(gitUrl.split('/').pop()).replace('.git', '');

const repositoryDelete = async <Path extends string>(
	path: Path,
	url: string
): Promise<void> => {
	const folder = repositoryName(url);
	const repoFilePath = join(path, folder);

	await fs.rm(repoFilePath, { recursive: true, force: true });
};

/*
const handleRunners = async (repoPath: string): Promise<string[]> => {
	const runners: string[] = [];
	const files = await fs.readdir(repoPath);

	for (const file of files) {
		const fullPath = path.join(repoPath, file);
		const stat = await fs.stat(fullPath);

		if (file === 'requirements.txt') runners.push('python');

		if (file === 'package.json') runners.push('nodejs');

		if (stat.isDirectory()) {
			const subRunners = await handleRunners(fullPath);
			runners.push(...subRunners);
		}
	}
	return runners;
};
*/

export const repositoryBranchList = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: FetchBranchListBody },
		res: Response,
		next: NextFunction
	) => {
		try {
			const { url } = req.body;

			// list remote branches for the repository
			const { stdout } = await exec(`git ls-remote --heads ${url}`);

			// Parse branches from the command output
			const branches = stdout
				.trim()
				.split('\n')
				.map(line => line.split('refs/heads/')[1])
				.filter(Boolean);

			return res.status(200).json({ branches });
		} catch (err) {
			next(new AppError('Error fetching branch list', 500));
		}
	}
);

export const repositoryFileList = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: FetchFilesFromRepoBody },
		res: Response,
		next: NextFunction
	) => {
		const { url, branch } = req.body;
		const repoDir = repositoryName(url);
		const repoPath = path.join(appsDirectory, repoDir);

		try {
			// Delete existing repo folder if it exists
			await repositoryDelete(appsDirectory, url);

			// Clone the repository
			await exec(`git clone ${url} ${repoPath} --depth=1 --no-checkout`);

			// List files in the specified branch
			const { stdout } = await exec(
				`git ls-tree -r ${branch} --name-only`,
				{
					cwd: repoPath
				}
			);

			const files = stdout.trim().split('\n').filter(Boolean);

			// Clean up the cloned repository
			await fs.rm(repoPath, { recursive: true, force: true });

			return res.status(200).json({ files });
		} catch (err) {
			return next(
				new AppError('Error fetching file list from repository', 500)
			);
		}
	}
);

export const repositoryClone = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: FetchFilesFromRepoBody },
		res: Response,
		next: NextFunction
	) => {
		const { branch, url } = req.body;
		const resource: Resource = {
			id: '',
			path: '',
			jsons: [],
			runners: []
		};

		try {
			await repositoryDelete(appsDirectory, url);
		} catch (err) {
			return next(
				new AppError(
					'error occurred in deleting repository directory',
					500
				)
			);
		}

		try {
			// Clone the repository into the specified directory
			await exec(
				`git clone --single-branch --depth=1 --branch ${branch} ${url} ${join(
					appsDirectory,
					repositoryName(url)
				)}`
			);
		} catch (err) {
			return next(
				new AppError('Error occurred while cloning the repository', 500)
			);
		}

		const id = repositoryName(req.body.url);

		resource.id = id;
		resource.path = join(appsDirectory, id);
		resource.runners = await findRunners(resource.path);

		// Create a new Application instance and assign the resource to it
		const application = new Application();
		application.resource = Promise.resolve(resource);

		Applications[id] = application;

		return res.status(201).send({ id });
	}
);
