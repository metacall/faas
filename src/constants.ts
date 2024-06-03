import { DeployStatus, MetaCallJSON } from '@metacall/protocol/deployment';
import { ChildProcess } from 'child_process';

export interface Deployment {
	id: string;
	type?: string;
	jsons: MetaCallJSON[];
	runners?: string[];
	path: string;
	blob?: string;
}

export const deploymentMap: Record<string, Promise<Deployment>> = {};

export const createInstallDependenciesScript = (
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

export type IAppWithFunctions = IApp & {
	funcs: string[];
};

export type IAllApps = Record<string, IAppWithFunctions>;

export const allApplications: IAllApps = {};

export enum ProtocolMessageType {
	Install = 'InstallDependencies',
	Load = 'LoadFunctions',
	MetaData = 'GetApplicationMetadata',
	Invoke = 'CallFunction',
	InvokeResult = 'FunctionInvokeResult'
}

export const childProcesses: { [key: string]: ChildProcess } = {};

export interface WorkerMessage<T> {
	type: ProtocolMessageType;
	data: T;
}

export type WorkerMessageUnknown = WorkerMessage<unknown>;

export interface InspectObject {
	[key: string]: Array<{ name: string }>;
}
export interface LogMessage {
	deploymentName: string;
	workerPID: number;
	message: string;
}

export const ANSICode: number[] = [
	166, 154, 142, 118, 203, 202, 190, 215, 214, 32, 6, 4, 220, 208, 184, 172
];

export interface PIDToColorCodeMapType {
	[key: string]: number;
}

export interface AssignedColorCodesType {
	[key: string]: boolean;
}

// Maps a PID to a color code
export const PIDToColorCodeMap: PIDToColorCodeMapType = {};

// Tracks whether a color code is assigned
export const assignedColorCodes: AssignedColorCodesType = {};
