import { Resource } from '../app';
import { exec } from './exec';

const createInstallDependenciesScript = (
	runner: string,
	path: string
): string => {
	const installDependenciesScript: Record<string, string> = {
		python: `cd ${path} && metacall pip3 install -r requirements.txt`,
		nodejs: `cd ${path} && metacall npm i`,
		ruby: `cd ${path} && metacall bundle install`,
		csharp: `cd ${path} && metacall dotnet restore && metacall dotnet release`
	};
	return installDependenciesScript[runner];
};

export const installDependencies = async (
	resource: Resource
): Promise<void> => {
	if (!resource.runners) return;

	for (const runner of resource.runners) {
		if (runner == undefined) continue;
		else {
			await exec(createInstallDependenciesScript(runner, resource.path));
		}
	}
};
