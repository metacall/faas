import { ChildProcess } from 'child_process';

export enum WorkerMessageType {
	Install = 'InstallDependencies',
	Load = 'LoadFunctions',
	MetaData = 'GetApplicationMetadata',
	Invoke = 'CallFunction',
	InvokeResult = 'FunctionInvokeResult'
}

export interface WorkerMessage<T> {
	type: WorkerMessageType;
	data: T;
}

export type WorkerMessageUnknown = WorkerMessage<unknown>;

export const Processes: { [key: string]: ChildProcess } = {};
