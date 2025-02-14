import { promises as fs } from 'fs';
import path from 'path';
import { Resource } from '../app';
import { exec } from './exec';

// TODO: Unify this with metacall/protocol
const runnerList = ['nodejs', 'python', 'ruby', 'csharp'];

// TODO: Unify this with metacall/protocol
type Runner = typeof runnerList[number];

// TODO: Unify this with metacall/protocol
const targetFiles: Record<Runner, string> = {
	nodejs: 'package.json',
	python: 'requirements.txt',
	ruby: 'Gemfile',
	csharp: 'project.json'
};

const installCommand: Record<Runner, string> = {
	python: 'metacall pip3 install -r requirements.txt',
	nodejs: 'metacall npm i',
	ruby: 'metacall bundle install',
	csharp: 'metacall dotnet restore && metacall dotnet release'
};

// TODO: Unify this with metacall/protocol
const isRunner = (runner: Runner): boolean => {
	return runnerList.includes(runner);
};

// TODO: Unify this with metacall/protocol
const findFilesRecursively = async (
	dirPattern: string,
	filePattern: string,
	depthLimit = Infinity
): Promise<string[]> => {
	const stack: Array<{ dir: string; depth: number }> = [
		{ dir: dirPattern, depth: 0 }
	];
	const files = [];
	const dirRegex = new RegExp(dirPattern);
	const fileRegex = new RegExp(filePattern);

	while (stack.length > 0) {
		const { dir, depth } = stack.pop() || { dir: '', depth: depthLimit };

		try {
			if (!dirRegex.test(dir)) {
				continue;
			}

			if (depth > depthLimit) {
				continue;
			}

			const items = await fs.readdir(dir);

			for (const item of items) {
				const fullPath = path.join(dir, item);
				const stat = await fs.stat(fullPath);

				if (stat.isDirectory()) {
					stack.push({ dir: fullPath, depth: depth + 1 });
				} else if (stat.isFile() && fileRegex.test(item)) {
					files.push(fullPath);
				}
			}
		} catch (err) {
			console.error(`Error reading directory ${dir}:`, err);
		}
	}

	return files;
};

// TODO: Unify this with metacall/protocol
const findDependencies = async (
	dir: string,
	runners: Runner[]
): Promise<Record<Runner, Array<string>>> => {
	const dependencies: Record<Runner, Array<string>> = {};

	for (const runner of runners) {
		if (isRunner(runner)) {
			dependencies[runner] = await findFilesRecursively(
				dir,
				targetFiles[runner]
			);
		}
	}

	return dependencies;
};

// TODO: Unify this with metacall/protocol
export const findRunners = async (dir: string): Promise<Runner[]> => {
	const dependencies = await findDependencies(dir, runnerList);
	return Object.keys(dependencies);
};

export const installDependencies = async (
	resource: Resource
): Promise<void> => {
	const runnerDeps = await findDependencies(resource.path, resource.runners);

	for (const [runner, deps] of Object.entries(runnerDeps)) {
		const command = installCommand[runner];

		for (const dependency of deps) {
			const cwd = path.dirname(dependency);

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
