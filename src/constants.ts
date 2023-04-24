import { DeployStatus, MetaCallJSON } from '@metacall/protocol/deployment';

export interface currentUploadedFile {
	id: string;
	type?: string;
	jsons: MetaCallJSON[];
	runners?: string[];
	path: string;
}

export const currentFile: currentUploadedFile = {
	id: '',
	type: '',
	jsons: [],
	runners: [],
	path: ''
};

export const createInstallDependenciesScript = (
	runner: string,
	path: string
): string => {
	const installDependenciesScript: Record<string, string> = {
		python: `cd ${path} && echo "some data for the file" >> randomasd.txt && metacall pip3 install -r requirements.txt`,
		nodejs: `cd ${path} ; metacall npm i`,
		csharp: `cd ${path}; metacall dotnet restore;metacall dotnet release;`,
		ruby: `cd ${path}; metacall bundle install`
	};
	return installDependenciesScript[runner];
};

export type namearg = 'id' | 'type' | 'jsons' | 'runners' | 'path';
export type valueArg = string;

export type fetchFilesFromRepoBody = {
	branch: 'string';
	url: 'string';
};
export type fetchBranchListBody = {
	url: 'string';
};

export type deployBody = {
	suffix: string; //name of deployment
	resourceType: 'Package' | 'Repository';
	release: string; //release date
	env: string[];
	plan: string;
	version: string;
};

export type tpackages = Record<string, unknown>;

export interface IApp {
	status: DeployStatus;
	prefix: string;
	suffix: string;
	version: string;
	packages: tpackages;
}

export class App implements IApp {
	public status: DeployStatus;
	public prefix: string;
	public suffix: string;
	public version: string;
	public packages: tpackages;

	constructor(
		status: DeployStatus,
		prefix: string,
		suffix: string,
		version: string,
		packages: tpackages
	) {
		this.status = status;
		this.prefix = prefix;
		this.suffix = suffix;
		this.version = version;
		this.packages = packages;
	}
}

type IAppWithFunctions = IApp & {
	funcs: Record<string, (...args: any[]) => any>; // eslint-disable-line
};

export const allApplications: Record<string, IAppWithFunctions> = {};
