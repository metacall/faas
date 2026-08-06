export enum WorkerMessageType {
	Install = 'InstallDependencies',
	Load = 'LoadFunctions',
	MetaData = 'GetApplicationMetadata',
	Invoke = 'CallFunction',
	InvokeResult = 'FunctionInvokeResult',
	InvokeError = 'FunctionInvokeError'
}

export interface WorkerMessage<T> {
	type: WorkerMessageType;
	data: T;
}

export type WorkerMessageUnknown = WorkerMessage<unknown>;
