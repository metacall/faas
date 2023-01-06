import { NextFunction, Request, RequestHandler, Response } from 'express';

import { MetaCallJSON } from '@metacall/protocol/deployment';
import { PackageError, generatePackage } from '@metacall/protocol/package';

import { exec, execSync } from 'child_process';

import * as fs from 'fs';
import path from 'path';

import { currentFile } from '../constants';

export const dirName = (gitUrl: string): string =>
	String(gitUrl.split('/')[gitUrl.split('/').length - 1]).replace('.git', '');

export const installDependencies = async (): Promise<void> => {
	if (!currentFile.runners) return;

	for (const runner of currentFile.runners) {
		switch (runner) {
			case 'python':
				execSync(
					`cd ${currentFile.path} ; metacall pip3 install -r requirements.txt`
				);
				break;
			case 'nodejs':
				{
					await execPromise(
						`cd ${currentFile.path} ; metacall npm i`
					);
				}
				break;
		}
	}
};

//check if repo contains metacall-*.json if not create and calculate runners then install dependencies
export const calculatePackages = async (): Promise<void> => {
	const data = await generatePackage(currentFile.path);
	if (data.error == PackageError.Empty) throw PackageError.Empty;
	currentFile.jsons = data.jsons;
	currentFile.runners = data.runners;
};

export const evalMetacall = (): MetaCallJSON[] => {
	if (!currentFile.path) return [];
	const metacallPath: string[] = [];

	const files = fs.readdirSync(currentFile.path);
	for (let i = 0; i < files.length; i++) {
		const filename = path.join(currentFile.path, files[i]);
		if (filename.indexOf('metacall') >= 0) {
			metacallPath.push(files[i]);
		}
	}

	if (metacallPath.length == 0) {
		//Todo log error here no metacall file
		return [];
	}

	return readMetacallFile(metacallPath);
};

export const readMetacallFile = (metacallPath: string[]): MetaCallJSON[] => {
	const MetaCallJSON: MetaCallJSON[] = [];
	for (const file of metacallPath) {
		const where = path.join(currentFile.path + file).toString();
		try {
			MetaCallJSON.push(JSON.parse(fs.readFileSync(where).toString()));
		} catch (e) {
			//Todo log error unable to parse json
			return [];
		}
	}

	return MetaCallJSON;
};

const exists = (path: string): Promise<boolean> =>
	fs.promises.stat(path).then(
		() => true,
		() => false
	);

export const ensureFolderExists = async <Path extends string>(
	path: Path
): Promise<Path> => (
	(await exists(path)) ||
		(await fs.promises.mkdir(path, { recursive: true })),
	path
);

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
	fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
	return (req: Request, res: Response, next: NextFunction) => {
		fn(req, res, next).catch(err => next(err));
	};
};
