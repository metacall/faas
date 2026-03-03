import { Deployment } from '@metacall/protocol';
import { spawn } from 'child_process';
import path from 'path';
import { Applications, Resource } from '../app';
import {
	WorkerMessage,
	WorkerMessageType,
	WorkerMessageUnknown
} from '../worker/protocol';
import { invokeQueue } from './invoke';
import { logProcessOutput } from './logger';

export const deployProcess = async (
	resource: Resource,
	env: Record<string, string>
): Promise<void> => {
	// Spawn a new process
	const desiredPath = path.join(
		path.resolve(__dirname, '..'),
		'worker',
		'index.js'
	);

	// Prepare the environment variables
	const envStringified: Record<string, string> = {
		...(process.env as Record<string, string>)
	};

	// Ensure all values are explicitly cast to string to prevent TypeError in spawn
	if (env) {
		for (const [key, value] of Object.entries(env)) {
			envStringified[key] = String(value);
		}
	}

	const proc = spawn('metacall', [desiredPath], {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
		cwd: resource.path, // Current working directory resolution
		env: envStringified // Environment variable injection
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

	proc.on('error', (err: Error) => {
		deployReject(err);
	});

	proc.on('message', (rawPayload: unknown) => {
		const payload = rawPayload as WorkerMessageUnknown;
		switch (payload.type) {
			case WorkerMessageType.MetaData: {
				// Get the deploy data and store the process and app into our tables
				const application = Applications[resource.id] as Record<
					string,
					unknown
				>;
				const deployment = (payload as WorkerMessage<Deployment>).data;

				application.proc = proc;
				application.deployment = deployment;
				deployResolve();
				break;
			}

			case WorkerMessageType.InvokeResult: {
				const invokeResult = (
					payload as WorkerMessage<{ id: string; result: unknown }>
				).data;

				// Get the invocation id in order to retrieve the callbacks
				// for resolving the call, this deletes the invocation object
				const invoke = invokeQueue.get(invokeResult.id);
				invoke.resolve(JSON.stringify(invokeResult.result));
				break;
			}

			default:
				break;
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

		// TODO: How to implement the exit properly? We cannot reject easily
		// the promise from the call if the process exits during the call.
		// Also if exits during the call it will try to call deployReject
		// which is completely out of scope and the promise was fullfilled already
	});

	return promise;
};
