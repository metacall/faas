import { DeployStatus, MetaCallJSON } from '@metacall/protocol/deployment';
import { ChildProcess } from 'child_process';

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

export type deleteBody = {
	suffix: string; //name of deployment
	prefix: string;
	version: string;
};

export type tpackages = Record<string, unknown>;

export interface IApp {
	status: DeployStatus;
	prefix: string;
	suffix: string;
	version: string;
	packages: tpackages;
	ports: number[];
}

export class App implements IApp {
	public status: DeployStatus;
	public prefix: string;
	public suffix: string;
	public version: string;
	public packages: tpackages;
	public ports: number[];

	constructor(
		status: DeployStatus,
		prefix: string,
		suffix: string,
		version: string,
		packages: tpackages,
		ports: number[]
	) {
		this.status = status;
		this.prefix = prefix;
		this.suffix = suffix;
		this.version = version;
		this.packages = packages;
		this.ports = ports;
	}
}

export type IAppWithFunctions = IApp & {
	funcs: string[];
};

export type IAllApps = Record<string, IAppWithFunctions>;

export const allApplications: IAllApps = {};

export const protocol = {
	i: 'installDependencies',
	l: 'loadFunctions',
	g: 'getApplicationMetadata',
	c: 'callFunction',
	r: 'functionInvokeResult'
};

export const cps: { [key: string]: ChildProcess } = {};

export interface childProcessResponse {
	type: keyof typeof protocol;
	data: unknown;
}

export interface InspectObject {
	[key: string]: Array<{ name: string }>;
}
