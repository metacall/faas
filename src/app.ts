import { Deployment, MetaCallJSON } from '@metacall/protocol/deployment';
import { ChildProcess } from 'child_process';
import { ProcessLogHandle } from './utils/logger';

export interface Resource {
	id: string;
	path: string;
	jsons: MetaCallJSON[];
	runners: string[];
	type?: string;
	blob?: string;
}

export class Application {
	public resource?: Promise<Resource>;
	public proc?: ChildProcess;
	public deployment?: Deployment;
	public logger?: ProcessLogHandle;

	public kill(): void {
		this.proc?.kill();
	}
}

export const Applications: Record<string, Application> = {};
