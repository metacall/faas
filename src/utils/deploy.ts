import { Deployment } from '@metacall/protocol';
import { spawn } from 'child_process';
import path from 'path';
import { Applications, Resource } from '../app';
import { WorkerMessageType, WorkerMessageUnknown } from '../worker/protocol';
import { logProcessOutput } from './logger';

export const deployProcess = async (resource: Resource): Promise<void> => {
	// Spawn a new process
	const desiredPath = path.join(
		path.resolve(__dirname, '..'),
		'worker',
		'index.js'
	);

	const proc = spawn('metacall', [desiredPath], {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc']
	});

	// Send load message with the deploy information
	proc.send({
		type: WorkerMessageType.Load,
		data: resource
	});

	// Pipe the stdout and stderr to the logger
	logProcessOutput(proc, resource.id);

	// Wait for load result
	let deployResolve: (value: void) => void;
	let deployReject: (reason: Error) => void;

	const promise = new Promise<void>((resolve, reject) => {
		deployResolve = resolve;
		deployReject = reject;
	});

	proc.on('message', (payload: WorkerMessageUnknown) => {
		// Get the deploy data and store the process and app into our tables
		if (payload.type === WorkerMessageType.MetaData) {
			const application = Applications[resource.id];
			const deployment = payload.data as Deployment;

			application.proc = proc;
			application.deployment = deployment;
			deployResolve();
		}
	});

	proc.on('exit', code => {
		// The application may have been ended unexpectedly,
		// probably segmentation fault (exit code 139 in Linux)
		deployReject(
			new Error(
				`Deployment '${resource.id}' process exited with code: ${
					code || 'unknown'
				}`
			)
		);
	});

	return promise;
};
