import { Dirent } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Application, Applications, Resource } from '../app';
import { deployProcess } from './deploy';

const isErrnoException = (err: unknown): err is NodeJS.ErrnoException =>
	err instanceof Error && 'code' in err;

const readEnvFile = async (
	envFilePath: string
): Promise<Record<string, string>> => {
	try {
		const envFileContent = await fs.readFile(envFilePath, 'utf-8');

		return envFileContent.split('\n').reduce((acc, line) => {
			const [name, value] = line.split('=');
			if (name?.trim()) {
				acc[name.trim()] = (value ?? '').trim();
			}
			return acc;
		}, {} as Record<string, string>);
	} catch (err: unknown) {
		if (isErrnoException(err) && err.code === 'ENOENT') {
			return {};
		}
		throw err;
	}
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

	const results = await Promise.allSettled(
		resources.map(async resource => {
			Applications[resource.id] = new Application();
			Applications[resource.id].resource = Promise.resolve(resource);

			// Read cached environment variables (with fallback for missing .env)
			const envFilePath = path.join(resource.path, `.env`);
			let env: Record<string, string> = {};

			try {
				const envFileContent = readFileSync(envFilePath, 'utf-8');
				env = envFileContent.split('\n').reduce((acc, line) => {
					// Use indexOf to split only on first '=' (values may contain '=')
					const index = line.indexOf('=');
					if (index > 0) {
						const name = line.slice(0, index).trim();
						const value = line.slice(index + 1).trim();
						acc[name] = value;
					}
					return acc;
				}, {} as Record<string, string>);
			} catch (err) {
				console.warn(
					`Warning: No .env file found for '${resource.id}', using empty environment`
						.yellow
				);
			}

			return deployProcess(resource, env);
		})
	);

	// Log results and cleanup failed deployments (only logs on errors - silent on normal startup)
	let successCount = 0;
	results.forEach((result, index) => {
		const resourceId = resources[index].id;
		if (result.status === 'rejected') {
			const errorMessage =
				result.reason instanceof Error
					? result.reason.message
					: String(result.reason);
			console.error(
				`Failed to auto-deploy '${resourceId}': ${errorMessage}`.red
			);
			// Clean up failed application entry
			delete Applications[resourceId];
		} else {
			successCount++;
		}
	});

	if (successCount > 0) {
		console.log(
			`${successCount} previously deployed application(s) deployed successfully`
				.green
		);
	}
};
