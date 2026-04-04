import { NextFunction, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path, { join } from 'path';
import { Application, Applications, Resource } from '../app';
import AppError from '../utils/appError';
import { appsDirectory } from '../utils/config';
import { execFile } from '../utils/exec';
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

const isValidRepositoryUrl = (repositoryUrl: string): boolean => {
	// Accept common git URL formats used in local/dev flows
	return /^(https:\/\/|ssh:\/\/|git@)[A-Za-z0-9._:/@-]+(\.git)?$/.test(
		repositoryUrl
	);
};

const isValidBranchName = (branchName: string): boolean => {
	// Keep branch names strict to avoid malformed command arguments
	return /^[A-Za-z0-9._/-]+$/.test(branchName);
};

const repositoryName = (url: string): string =>
	url
		.replace(/\.git$/, '')
		.split('/')
		.slice(-2)
		.join('-')
		.toLowerCase();

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
			const repositoryUrl = url?.trim();

			if (!repositoryUrl || !isValidRepositoryUrl(repositoryUrl)) {
				return next(new AppError('Invalid repository URL.', 400));
			}

			// list remote branches for the repository
			// execFile avoids shell interpolation, args are passed as an array
			const { stdout } = await execFile('git', [
				'ls-remote',
				'--heads',
				repositoryUrl
			]);

			// Parse branches from the command output
			const branches = stdout
				.trim()
				.split('\n')
				.map(line => line.split('refs/heads/')[1])
				.filter(Boolean);

			return res.status(200).json({ branches });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			next(new AppError(`Error fetching branch list: ${message}`, 400));
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
		const repositoryUrl = url?.trim();
		const branchName = branch?.trim();

		if (!repositoryUrl || !isValidRepositoryUrl(repositoryUrl)) {
			return next(new AppError('Invalid repository URL.', 400));
		}

		if (!branchName || !isValidBranchName(branchName)) {
			return next(new AppError('Invalid branch name.', 400));
		}

		const repositoryDirectoryName = repositoryName(repositoryUrl);
		const repositoryPath = path.join(
			appsDirectory,
			repositoryDirectoryName
		);

		try {
			// Delete existing repo folder if it exists
			await repositoryDelete(appsDirectory, repositoryUrl);

			// Clone the repository with the requested branch so ls-tree can resolve it
			await execFile('git', [
				'clone',
				'--depth=1',
				'--no-checkout',
				'--branch',
				branchName,
				repositoryUrl,
				repositoryPath
			]);

			// List files in the specified branch
			const { stdout } = await execFile(
				'git',
				['ls-tree', '-r', branchName, '--name-only'],
				{ cwd: repositoryPath }
			);

			const files = stdout.trim().split('\n').filter(Boolean);

			// Clean up the cloned repository
			await fs.rm(repositoryPath, { recursive: true, force: true });

			return res.status(200).json({ files });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return next(
				new AppError(
					`Error fetching file list from repository: ${message}`,
					400
				)
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
		const repositoryUrl = url?.trim();
		const branchName = branch?.trim();

		if (!repositoryUrl || !isValidRepositoryUrl(repositoryUrl)) {
			return next(new AppError('Invalid repository URL.', 400));
		}

		if (!branchName || !isValidBranchName(branchName)) {
			return next(new AppError('Invalid branch name.', 400));
		}

		const resource: Resource = {
			id: '',
			path: '',
			jsons: [],
			runners: []
		};

		try {
			await repositoryDelete(appsDirectory, repositoryUrl);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return next(
				new AppError(
					`Error deleting repository directory: ${message}`,
					500
				)
			);
		}

		try {
			// Clone the repository into the specified directory
			await execFile('git', [
				'clone',
				'--single-branch',
				'--depth=1',
				'--branch',
				branchName,
				repositoryUrl,
				join(appsDirectory, repositoryName(repositoryUrl))
			]);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return next(
				new AppError(`Error cloning repository: ${message}`, 400)
			);
		}

		const id = repositoryName(repositoryUrl);

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
