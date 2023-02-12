import { exec } from 'child_process';
import * as fs from 'fs';
import { platform } from 'os';
import { join } from 'path';

import { MetaCallJSON } from '@metacall/protocol/deployment';
import { PackageError, generatePackage } from '@metacall/protocol/package';
import { NextFunction, Request, RequestHandler, Response } from 'express';

import { currentFile } from '../constants';

export const dirName = (gitUrl: string): string =>
	String(gitUrl.split('/')[gitUrl.split('/').length - 1]).replace('.git', '');

// Create a proper hashmap that contains all the installation commands mapped to their runner name and shorten this function
export const installDependencies = async (): Promise<void> => {
	if (!currentFile.runners) return;

	for (const runner of currentFile.runners) {
		switch (runner) {
			case 'python':
				await execPromise(
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
	//	currentFile.jsons = JSON.parse(data.jsons.toString()); FIXME Fix this line
	currentFile.runners = data.runners;
};

export const evalMetacall = (): MetaCallJSON[] => {
	if (!currentFile.path) return [];
	const metacallPath: string[] = [];

	const files = fs.readdirSync(currentFile.path);
	for (let i = 0; i < files.length; i++) {
		const filename = join(currentFile.path, files[i]);
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
		const where = join(currentFile.path + file).toString();
		try {
			MetaCallJSON.push(JSON.parse(fs.readFileSync(where).toString()));
		} catch (e) {
			//Todo log error unable to parse json
			return [];
		}
	}

	return MetaCallJSON;
};

export const exists = (path: string): Promise<boolean> =>
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

export const createMetacallJsonFile = (jsons: MetaCallJSON[], path: string) => {
	const acc: string[] = [];
	jsons.forEach(el => {
		const filePath = `${path}/metacall-${el.language_id}.json`;

		fs.writeFileSync(filePath, JSON.stringify(el));
		acc.push(filePath);
	});
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
