import { DeployStatus, MetaCallJSON } from '@metacall/protocol/deployment';

export interface Deployment {
	id: string;
	path: string;
	jsons: MetaCallJSON[];
	runners?: string[];
	type?: string;
	blob?: string;
}

export const deploymentMap: Record<string, Promise<Deployment>> = {};

export type tpackages = Record<string, unknown>;

// TODO: Isn't this available inside protocol package? We MUST reuse it
export interface IApp {
	status: DeployStatus;
	prefix: string;
	suffix: string;
	version: string;
	packages: tpackages;
	ports: number[];
}

// TODO: Isn't this available inside protocol package? We MUST reuse it
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

export type IAllApps = Record<string, IApp>;

export const allApplications: IAllApps = {};
