import { Dirent, existsSync, readFileSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Application, Applications, Resource } from '../app';
import { deployProcess } from './deploy';

const readEnvFile = (envFilePath: string): Record<string, string> => {
	if (!existsSync(envFilePath)) {
		return {};
	}
	const envFileContent = readFileSync(envFilePath, 'utf-8');
	return envFileContent.split('\n').reduce((acc, line) => {
		const [name, value] = line.split('=');
		if (name?.trim()) acc[name.trim()] = (value ?? '').trim();
		return acc;
	}, {} as Record<string, string>);
};

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

	let succeeded = 0;
	for (const resource of resources) {
		Applications[resource.id] = new Application();
		Applications[resource.id].resource = Promise.resolve(resource);

		const envFilePath = path.join(resource.path, `.env`);
		const env = readEnvFile(envFilePath);

		try {
			await deployProcess(resource, env);
			succeeded++;
		} catch (err) {
			delete Applications[resource.id];
			// eslint-disable-next-line no-console
			console.warn(
				`Failed to load app "${resource.id}":`,
				err instanceof Error ? err.message : String(err)
			);
		}
	}

	if (succeeded > 0) {
		console.log(
			'Previously deployed applications deployed successfully'.green
		);
	}
};
