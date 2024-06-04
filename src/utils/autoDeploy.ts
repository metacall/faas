import { Dirent } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Deployment } from '../constants';
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

	const deployments: Deployment[] = directories.map(dir => ({
		id: dir.name,
		path: path.join(appsDir, dir.name),
		jsons: []
	}));

	await Promise.all(deployments.map(deployProcess));

	if (deployments.length > 0) {
		console.log(
			'Previously deployed applications deployed successfully'.green
		);
	}
};
