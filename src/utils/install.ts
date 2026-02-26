import { detectRunners, Runner, Runners } from '@metacall/protocol';
import { promises as fs } from 'fs';
import path from 'path';
import { Resource } from '../app';
import { exec } from './exec';

const findFilesRecursively = async (
	dir: string,
	matchesFile: (fileName: string) => boolean,
	depthLimit = Infinity
): Promise<string[]> => {
	const stack: Array<{ dir: string; depth: number }> = [{ dir, depth: 0 }];
	const files = [];

	while (stack.length > 0) {
		const { dir, depth } = stack.pop() || { dir: '', depth: depthLimit };

		try {
			if (depth > depthLimit) {
				continue;
			}

			const items = await fs.readdir(dir);

			for (const item of items) {
				const fullPath = path.join(dir, item);
				const stat = await fs.stat(fullPath);

				if (stat.isDirectory()) {
					stack.push({ dir: fullPath, depth: depth + 1 });
				} else if (stat.isFile() && matchesFile(item)) {
					files.push(fullPath);
				}
			}
		} catch (err) {
			console.error(`Error reading directory ${dir}:`, err);
		}
	}

	return files;
};

const findDependencies = async (
	dir: string,
	runners: Runner[]
): Promise<Partial<Record<Runner, Array<string>>>> => {
	const dependencies: Partial<Record<Runner, Array<string>>> = {};

	for (const runner of runners) {
		const patterns = Runners[runner].filePatterns;
		dependencies[runner] = await findFilesRecursively(dir, fileName =>
			patterns.some(re => re.test(fileName))
		);
	}

	return dependencies;
};

export const findRunners = async (dir: string): Promise<Runner[]> => {
	return detectRunners(dir);
};

export const installDependencies = async (
	resource: Resource
): Promise<void> => {
	const runnerDeps = await findDependencies(resource.path, resource.runners);

	for (const runner of resource.runners) {
		const command = Runners[runner].installCommand;
		const deps = runnerDeps[runner] ?? [];

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
