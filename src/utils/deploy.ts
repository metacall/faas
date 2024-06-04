import { spawn } from 'child_process';
import path from 'path';
import { App, Deployment, allApplications } from '../constants';
import {
	Processes,
	WorkerMessageType,
	WorkerMessageUnknown
} from '../worker/master';
import { logProcessOutput } from './logger';

export const deployProcess = async (deployment: Deployment): Promise<void> => {
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
		data: deployment
	});

	// Pipe the stdout and stderr to the logger
	logProcessOutput(proc, deployment.id);

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
			const app = payload.data as App;
			Processes[app.suffix] = proc;
			allApplications[app.suffix] = app;
			deployResolve();
		}
	});

	proc.on('exit', code => {
		// The application may have been ended unexpectedly,
		// probably segmentation fault (exit code 139 in Linux)
		deployReject(
			new Error(
				`Deployment '${deployment.id}' process exited with code: ${
					code || 'unknown'
				}`
			)
		);
	});

	return promise;
};
