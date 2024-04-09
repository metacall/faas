import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { platform } from 'os';
import { join } from 'path';

import { LanguageId, MetaCallJSON } from '@metacall/protocol/deployment';
import { PackageError, generatePackage } from '@metacall/protocol/package';
import { NextFunction, Request, RequestHandler, Response } from 'express';

import {
	CurrentUploadedFile,
	IAllApps,
	InspectObject,
	PIDToColorCodeMap,
	allApplications,
	asniCode,
	assignedColorCodes,
	createInstallDependenciesScript
} from '../constants';
import { logger } from './logger';

export const dirName = (gitUrl: string): string =>
	String(gitUrl.split('/')[gitUrl.split('/').length - 1]).replace('.git', '');

// Create a proper hashmap that contains all the installation commands mapped to their runner name and shorten this function
export const installDependencies = async (
	currentFile: CurrentUploadedFile
): Promise<void> => {
	if (!currentFile.runners) return;

	for (const runner of currentFile.runners) {
		if (runner == undefined) continue;
		else {
			await execPromise(
				createInstallDependenciesScript(runner, currentFile.path)
			);
		}
	}
};

//check if repo contains metacall-*.json if not create and calculate runners then install dependencies
export const calculatePackages = async (
	currentFile: CurrentUploadedFile,
	next: NextFunction
): Promise<void> => {
	const data = await generatePackage(currentFile.path);

	if (data.error == PackageError.Empty) {
		return next(new Error(PackageError.Empty));
	}
	//	currentFile.jsons = JSON.parse(data.jsons.toString()); FIXME Fix this line
	currentFile.runners = data.runners;
};

export const exists = async (path: string): Promise<boolean> => {
	try {
		await fs.stat(path);
		return true;
	} catch (e) {
		return false;
	}
};

export const ensureFolderExists = async <Path extends string>(
	path: Path
): Promise<Path> => (
	(await exists(path)) || (await fs.mkdir(path, { recursive: true })), path
);

export const deleteRepoFolderIfExist = async <Path extends string>(
	path: Path,
	url: string
): Promise<void> => {
	const folder = dirName(url);
	const repoFilePath = join(path, folder);

	await fs.rm(repoFilePath, { recursive: true, force: true });
};

export const execPromise = (
	command: string
): Promise<{
	stdout: string;
	stderr: string;
}> =>
	new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else {
				resolve({ stdout, stderr });
			}
		});
	});

export const catchAsync = (
	fn: (
		req: Request,
		res: Response,
		next: NextFunction
	) => Promise<Response | void>
): RequestHandler => {
	return (req: Request, res: Response, next: NextFunction) => {
		return fn(req, res, next).catch(err => next(err));
	};
};

export const createMetacallJsonFile = async (
	jsons: MetaCallJSON[],
	path: string
): Promise<string[]> => {
	const acc: string[] = [];
	for (const el of jsons) {
		const filePath = `${path}/metacall-${el.language_id}.json`;
		try {
			await fs.writeFile(filePath, JSON.stringify(el));
			acc.push(filePath);
		} catch (e) {
			// TODO: Do something here?
		}
	}

	return acc;
};

const missing = (name: string): string =>
	`Missing ${name} environment variable! Unable to load config`;

export const configDir = (name: string): string =>
	platform() === 'win32'
		? process.env.APPDATA
			? join(process.env.APPDATA, name)
			: missing('APPDATA')
		: process.env.HOME
		? join(process.env.HOME, `.${name}`)
		: missing('HOME');

export const getLangId = (input: string): LanguageId => {
	const parts = input.split('-');
	const extension = parts[parts.length - 1].split('.')[0];
	return extension as LanguageId;
};

export const diff = (
	object1: InspectObject,
	object2: InspectObject
): InspectObject => {
	for (const key in object2) {
		if (Array.isArray(object2[key])) {
			object1[key] = object1[key].filter(
				item => !object2[key].find(i => i.name === item.name)
			);
		}
	}
	return object1;
};

export function isIAllApps(data: unknown): data is IAllApps {
	return typeof data === 'object' && data !== null;
}

export function logProcessOutput(
	proc: NodeJS.ReadableStream | null,
	workerPID: number | undefined,
	deploymentName: string
): void {
	proc?.on('data', (data: Buffer) => {
		logger.enqueueLog(deploymentName, workerPID || 0, data.toString());
	});
}

export const maxWorkerWidth = (maxIndexWidth = 3): number => {
	const workerLengths = Object.keys(allApplications).map(
		worker => worker.length
	);
	return Math.max(...workerLengths) + maxIndexWidth;
};

export const assignColorToWorker = (
	deploymentName: string,
	workerPID: number
): string => {
	if (!PIDToColorCodeMap[workerPID]) {
		let colorCode: number;

		// Keep looking for unique code
		do {
			colorCode = asniCode[Math.floor(Math.random() * asniCode.length)];
		} while (assignedColorCodes[colorCode]);

		// Assign the unique code and mark it as used
		PIDToColorCodeMap[workerPID] = colorCode;
		assignedColorCodes[colorCode] = true;
	}
	const assignColorCode = PIDToColorCodeMap[workerPID];
	return `\x1b[38;5;${assignColorCode}m${deploymentName}\x1b[0m`;
};
