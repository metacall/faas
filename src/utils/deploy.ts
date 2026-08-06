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
	let deployed = false;

	const promise = new Promise<void>((resolve, reject) => {
		deployResolve = resolve;
		deployReject = reject;
	});

	proc.on('error', (err: Error) => {
		deployReject(err);
	});

	proc.on('message', (payload: WorkerMessageUnknown) => {
		switch (payload.type) {
			case WorkerMessageType.MetaData: {
				// Get the deploy data and store the process and app into our tables
				const application = Applications[resource.id];
				const deployment = payload.data as Deployment;

				application.proc = proc;
				application.deployment = deployment;
				deployed = true;
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
				invoke.resolve(JSON.stringify(invokeResult.result));
				break;
			}

			default:
				break;
		}
	});

	proc.on('exit', (code: number | null) => {
		const exitMessage = `Worker process for '${resource.id}' exited with code: ${code ?? 'unknown'}`;

		if (!deployed) {
			// Process exited before the deployment handshake completed
			deployReject(new Error(exitMessage));
		} else {
			// Process exited after a successful deploy — reject any in-flight invocations
			// so their HTTP responses are not left hanging indefinitely
			const application = Applications[resource.id];
			if (application?.pendingInvocations.size > 0) {
				invokeQueue.rejectAll(
					[...application.pendingInvocations],
					exitMessage
				);
				application.pendingInvocations.clear();
			}
		}
	});

	return promise;
};
