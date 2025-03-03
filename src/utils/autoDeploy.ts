import { Dirent, readFileSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Application, Applications, Resource } from '../app';
import { appsDirectory } from '../utils/config';
import { deployProcess } from './deploy';

export const autoDeployApps = async (appsDir: string): Promise<void> => {
	const directories = (
		await fs.readdir(appsDir, {
			withFileTypes: true
		})
	).reduce(
		(dirs: Dirent[], current: Dirent) =>
			current.isDirectory() ? [...dirs, current] : dirs,
		[]
	);

	const resources: Resource[] = directories.map(dir => ({
		id: dir.name,
		path: path.join(appsDir, dir.name),
		jsons: [],
		runners: []
	}));

	await Promise.all(
		resources.map(resource => {
			Applications[resource.id] = new Application();
			Applications[resource.id].resource = Promise.resolve(resource);

			// Read cached environment variables
			const envFilePath = path.join(resource.path, `.env`);
			const envFileContent = readFileSync(envFilePath, 'utf-8');
			const env = envFileContent.split('\n').reduce((acc, line) => {
				const [name, value] = line.split('=');
				acc[name] = value;
				return acc;
			}, {} as Record<string, string>);

			return deployProcess(resource, env);
		})
	);

	if (resources.length > 0) {
		console.log(
			'Previously deployed applications deployed successfully'.green
		);
	}
};
