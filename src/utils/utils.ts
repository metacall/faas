import { exec } from 'child_process';
import * as fs from 'fs';
import { platform } from 'os';
import { join } from 'path';

import { LanguageId, MetaCallJSON } from '@metacall/protocol/deployment';
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

export const createMetacallJsonFile = (
	jsons: MetaCallJSON[],
	path: string
): string[] => {
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

export const getLangId = (input: string): LanguageId => {
	console.log(input);
	const parts = input.split('-');
	const extension: string = parts[parts.length - 1].split('.')[0];
	return extension as LanguageId;
};

//eslint-disable-next-line
export const diff = (object1: any, object2: any): any => {
	for (const key in object2) {
		//eslint-disable-next-line
		if (Array.isArray(object2[key])) {
			//eslint-disable-next-line
			object1[key] = object1[key].filter(
				(
					item: any // eslint-disable-line
				) => !object2[key].find((i: any) => i.name === item.name) // eslint-disable-line
			);
		}
	}

	return object1; // eslint-disable-line
};
