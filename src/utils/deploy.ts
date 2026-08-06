import { Deployment } from '@metacall/protocol';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import path from 'path';
import { Applications, Resource } from '../app';
import { WorkerMessageType, WorkerMessageUnknown } from '../worker/protocol';
import { invokeQueue } from './invoke';
import { logProcessOutput } from './logger';

/* 
On macOS, 'metacall' is a bash wrapper script that sets env vars and then
calls 'metacallcli'. Spawning a bash wrapper with Node.js IPC
(stdio: ['pipe','pipe','pipe','ipc']) silently breaks the IPC channel (fd 3),
causing all function calls to hang forever.
Fix: on macOS, locate 'metacallcli' directly and spawn it with the required
env vars replicated from the bash script logic.
On Linux/Windows, 'metacall' is a native binary and IPC works fine as-is.
*/

const isMacOS = process.platform === 'darwin';

/**
Derives the metacall install prefix on macOS by replicating the same logic
used in the metacall bash wrapper script:
-SCRIPT_DIR = dirname(which metacall)
-PARENT     = dirname(SCRIPT_DIR)
-PREFIX     = PARENT/metacallcli exists ? PARENT : PARENT/Cellar/metacall/<version>
This works for Homebrew (both Intel and Apple Silicon) and the official
installer without hardcoding any paths or version numbers.
*/
const getMetacallPrefix = (): string => {
	try {
		const metacallScript = execSync('which metacall').toString().trim();
		const scriptDir = path.dirname(metacallScript);
		const parent = path.dirname(scriptDir);

		// Case 1: metacallcli sits directly under parent (non-Homebrew install)
		if (fs.existsSync(path.join(parent, 'metacallcli'))) {
			return parent;
		}

		// Case 2: Homebrew versioned install under Cellar/metacall/<version>
		const cellarPath = path.join(parent, 'Cellar', 'metacall');
		if (fs.existsSync(cellarPath)) {
			const versions = fs.readdirSync(cellarPath).sort().reverse();
			if (versions.length > 0) {
				return path.join(cellarPath, versions[0]);
			}
		}
	} catch {
		// 'which' failed -> fallback
	}
	return '/opt/homebrew/Cellar/metacall/0.9.20';
};

// Resolve once at module load — avoids repeated shell calls per deploy.
const metacallPrefix: string = isMacOS ? getMetacallPrefix() : '';
const metacallCli: string = isMacOS
	? `${metacallPrefix}/metacallcli`
	: 'metacall';

export const deployProcess = async (
	resource: Resource,
	env: Record<string, string>
): Promise<void> => {
	// Path to the worker entry point
	const desiredPath = path.join(
		path.resolve(__dirname, '..'),
		'worker',
		'index.js'
	);

	// Build the base env — merge process.env with user-supplied vars,
	// ensuring all values are strings so spawn() never throws a TypeError.
	const envStringified: Record<string, string> = {
		...(process.env as Record<string, string>)
	};
	if (env) {
		for (const [key, value] of Object.entries(env)) {
			envStringified[key] = String(value);
		}
	}

	// On macOS, inject the loader env vars that the bash wrapper would have set.
	// All paths are derived from metacallPrefix — no hardcoded versions.
	// On Linux/Windows, use the base env as-is.
	const spawnEnv: Record<string, string> = isMacOS
		? Object.assign({} as Record<string, string>, envStringified, {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				PYTHONPATH: `${metacallPrefix}/lib/python:${
					process.env['PYTHONPATH'] || ''
				}`,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				NODE_PATH: `${metacallPrefix}/lib/node_modules`,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				LOADER_LIBRARY: `${metacallPrefix}/lib`,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				SERIAL_LIBRARY_PATH: `${metacallPrefix}/lib`,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				DETOUR_LIBRARY_PATH: `${metacallPrefix}/lib`,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				PORT_LIBRARY_PATH: `${metacallPrefix}/lib`,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				CONFIGURATION_PATH: `${metacallPrefix}/configurations/global.json`,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				LOADER_SCRIPT_PATH: resource.path
		  })
		: envStringified;

	const proc = spawn(metacallCli, [desiredPath], {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
		cwd: resource.path,
		env: spawnEnv
	});

	// Send load message with the deploy information
	proc.send({
		type: WorkerMessageType.Load,
		data: resource
	});

	// Pipe stdout and stderr to the logger
	logProcessOutput(proc, resource.id);

	// Promise that resolves when the worker signals it is ready (MetaData),
	// or rejects if the worker exits before becoming ready.
	let deployResolve: (value: void) => void;
	let deployReject: (reason: Error) => void;

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
				// Worker loaded successfully — store process and deployment metadata
				const application = Applications[resource.id];
				const deployment = payload.data as Deployment;
				application.proc = proc;
				application.deployment = deployment;
				deployResolve();
				break;
			}

			case WorkerMessageType.InvokeResult: {
				// Function call completed — resolve the caller's HTTP request
				const invokeResult = payload.data as {
					id: string;
					result: unknown;
				};
				const invoke = invokeQueue.get(invokeResult.id);
				invoke.resolve(JSON.stringify(invokeResult.result));
				break;
			}

			default:
				break;
		}
	});

	proc.on('exit', code => {
		const application = Applications[resource.id];
		if (application && application.deployment) {
			// Worker died after a successful deploy.
			// Reject all in-flight calls immediately so HTTP requests don't hang,
			// then restart the worker so the deployment stays available.
			invokeQueue.rejectAll(`Worker for '${resource.id}' restarted`);
			console.warn(
				`Worker for '${resource.id}' exited with code ${String(
					code
				)}, restarting...`
			);
			void deployProcess(resource, env);
		} else {
			// Worker died during initial deploy — fail the deploy.
			deployReject(
				new Error(
					`Deployment '${
						resource.id
					}' process exited with code: ${String(code ?? 'unknown')}`
				)
			);
		}
	});

	return promise;
};
