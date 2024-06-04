import { Deployment } from '../constants';
import { exec } from './exec';

const createInstallDependenciesScript = (
	runner: string,
	path: string
): string => {
	const installDependenciesScript: Record<string, string> = {
		python: `cd ${path} && metacall pip3 install -r requirements.txt`,
		nodejs: `cd ${path} && metacall npm i`,
		csharp: `cd ${path} && metacall dotnet restore && metacall dotnet release;`,
		ruby: `cd ${path} && metacall bundle install`
	};
	return installDependenciesScript[runner];
};

export const installDependencies = async (
	deployment: Deployment
): Promise<void> => {
	if (!deployment.runners) return;

	for (const runner of deployment.runners) {
		if (runner == undefined) continue;
		else {
			await exec(
				createInstallDependenciesScript(runner, deployment.path)
			);
		}
	}
};
