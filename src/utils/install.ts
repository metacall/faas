import path from 'path';
import { Resource } from '../app';
import { exec } from './exec';
import {
	Runner,
	Runners,
	detectRunners,
	findFilesPath
} from '@metacall/protocol';

//Tell it wht command to install for each lang
const installCommand: Record<Runner, string> = {
	python: 'metacall pip3 install -r requirements.txt',
	nodejs: 'metacall npm i',
	ruby: 'metacall bundle install',
	csharp: 'metacall dotnet restore && metacall dotnet release'
};

// Simplye pass to protol's built in detector
export const findRunners = async (dir: string): Promise<Runner[]> => {
	return detectRunners(dir);
};

export const installDependencies = async (
	resource: Resource
): Promise<void> => {
	const allFiles = await findFilesPath(resource.path);

	for (const runner of resource.runners as Runner[]) {
		const runnerInfo = Runners[runner];
		if (!runnerInfo || !installCommand[runner]) continue;

		const command = installCommand[runner];

		const dependencyFiles = allFiles.filter(file => {
			const fileName = path.basename(file);
			return runnerInfo.filePatterns.some(pattern =>
				pattern.test(fileName)
			);
		});

		for (const dependency of dependencyFiles) {
			// Convert the relative path from protocol back to an absolute path
			const absolutePath = path.join(resource.path, dependency);
			const cwd = path.dirname(absolutePath);
			try {
				await exec(command, { cwd });
			} catch (err) {
				console.error(
					`Failed to install dependencies for runner ${runner}:`,
					err
				);
			}
		}
	}
};
