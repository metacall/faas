import { Deployment } from '@metacall/protocol';
import { spawn } from 'child_process';
import path from 'path';
import { Applications, Resource } from '../app';
import { WorkerMessageType, WorkerMessageUnknown } from '../worker/protocol';
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
	let isDeploySettled = false;

	const promise = new Promise<void>((resolve, reject) => {
		deployResolve = resolve;
		deployReject = reject;
	});

	proc.on('error', (err: Error) => {
		if (!isDeploySettled) {
			isDeploySettled = true;
			deployReject(err);
		}
	});

	proc.on('message', (payload: WorkerMessageUnknown) => {
		switch (payload.type) {
			case WorkerMessageType.MetaData: {
				// Get the deploy data and store the process and app into our tables
				const application = Applications[resource.id];
				const deployment = payload.data as Deployment;

				application.proc = proc;
				application.deployment = deployment;
				isDeploySettled = true;
				deployResolve();
				break;
			}

			case WorkerMessageType.InvokeResult: {
				const invokeResult = payload.data as {
					id: string;
					result: unknown;
				};

				// Get the invocation id in order to retrieve the callbacks
				// for resolving the call, this deletes the invocation object
				const invoke = invokeQueue.get(invokeResult.id);
				if (invoke) {
					invoke.resolve(JSON.stringify(invokeResult.result));
				}
				break;
			}

			case WorkerMessageType.InvokeError: {
				const invokeError = payload.data as {
					id: string;
					error: string;
				};

				// Reject the pending HTTP request with the error from the worker
				const invoke = invokeQueue.get(invokeError.id);
				if (invoke) {
					invoke.reject(invokeError.error);
				}
				break;
			}

			default:
				break;
		}
	});

	proc.on('exit', code => {
		// Reject any in-flight function calls that are still waiting for a
		// response. This prevents HTTP requests from hanging indefinitely
		// when the worker process exits unexpectedly (e.g. segmentation fault,
		// native crash from a bad argument passed to a MetaCall function).
		const errorMessage = `Worker process for deployment '${resource.id}' exited with code: ${code ?? 'unknown'}`;

		for (const id of invokeQueue.pendingIds()) {
			const invoke = invokeQueue.get(id);
			if (invoke) {
				invoke.reject(errorMessage);
			}
		}

		// Only reject the deploy promise if deployment hadn't completed yet
		// (i.e. the process exited before sending MetaData back).
		if (!isDeploySettled) {
			isDeploySettled = true;
			deployReject(new Error(errorMessage));
		}
	});

	return promise;
};

