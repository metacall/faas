import { promises as fs } from 'fs';
import path from 'path';
import { Resource } from '../app';
import { exec } from './exec';

type Runner = 'python' | 'nodejs' | 'ruby' | 'csharp';

const targetFiles: Record<Runner, string> = {
	nodejs: 'package.json',
	python: 'requirements.txt',
	ruby: 'Gemfile',
	csharp: 'project.json'
};

const isRunner = (runner: string): runner is Runner => {
	return ['nodejs', 'python', 'ruby', 'csharp'].includes(runner);
};

const findDependencyFile = async (
	dir: string,
	runner: Runner
): Promise<string | null> => {
	const files = await fs.readdir(dir);

	for (const file of files) {
		const fullPath = path.join(dir, file);
		const stat = await fs.stat(fullPath);

		if (stat.isDirectory()) {
			const result = await findDependencyFile(fullPath, runner);
			if (result) return result;
		} else if (file === targetFiles[runner]) {
			return dir;
		}
	}

	return null;
};

const createInstallDependenciesScript = async (
	runner: Runner,
	basePath: string
): Promise<string> => {
	const dependencyFilePath = await findDependencyFile(basePath, runner);

	if (!dependencyFilePath) {
		throw new Error(`No ${runner} dependencies file found`);
	}

	const installDependenciesScript: Record<string, string> = {
		python: `cd ${dependencyFilePath} && metacall pip3 install -r requirements.txt`,
		nodejs: `cd ${dependencyFilePath} && metacall npm i`,
		ruby: `cd ${dependencyFilePath} && metacall bundle install`,
		csharp: `cd ${dependencyFilePath} && metacall dotnet restore && metacall dotnet release`
	};
	return installDependenciesScript[runner];
};

// Todo: Async Error Handling
export const installDependencies = async (
	resource: Resource
): Promise<void> => {
	if (!resource.runners) return;

	for (const runner of resource.runners) {
		if (runner && isRunner(runner)) {
			try {
				const script = await createInstallDependenciesScript(
					runner,
					resource.path
				);
				await exec(script);
			} catch (err) {
				console.error(
					`Failed to install dependencies for runner ${runner}:`,
					err
				);
			}
		}
	}
};
