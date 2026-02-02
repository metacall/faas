import { Deployment } from '@metacall/protocol';
import { spawn } from 'child_process';
import path from 'path';
import { Applications, Resource } from '../app';
import { WorkerMessageType, WorkerMessageUnknown } from '../worker/protocol';
import { invokeQueue } from './invoke';
import { logProcessOutput } from './logger';

/**
 * Spawns a metacall worker process to deploy the given resource.
 *
 * NOTE: This function is responsible only for reporting success/failure.
 * Cleanup of Applications entries on failure is handled by autoDeploy.ts.
 */
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

	const proc = spawn('metacall', [desiredPath], {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
		env: {
			...process.env,
			...env
		}
	});

	// Setup promise for deployment result
	let deployResolve: (value: void) => void;
	let deployReject: (reason: Error) => void;

	const promise = new Promise<void>((resolve, reject) => {
		deployResolve = resolve;
		deployReject = reject;
	});

	// Prevents multiple promise settlements (handles error+exit race, and reject-after-resolve)
	let settled = false;
	const safeResolve = (): void => {
		if (settled) return;
		settled = true;
		deployResolve();
	};
	const safeReject = (error: Error): void => {
		if (settled) return;
		settled = true;
		deployReject(error);
	};

	// Handle spawn errors (e.g., metacall not found in PATH)
	proc.on('error', (err: NodeJS.ErrnoException) => {
		if (err.code === 'ENOENT') {
			safeReject(
				new Error(
					`Failed to spawn metacall: executable not found in PATH. ` +
						`Ensure MetaCall is installed and accessible via 'metacall' command.`
				)
			);
		} else {
			safeReject(
				new Error(`Failed to spawn metacall worker: ${err.message}`)
			);
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
				safeResolve();
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

	proc.on('exit', code => {
		// Only reject if not already settled (handles normal exit after success)
		safeReject(
			new Error(
				`Deployment '${resource.id}' process exited with code: ${
					code || 'unknown'
				}`
			)
		);
	});

	// Handlers must be attached before sending load message to avoid race conditions
	proc.send({
		type: WorkerMessageType.Load,
		data: resource
	});

	// Pipe the stdout and stderr to the logger
	logProcessOutput(proc, resource.id);

	return promise;
};
