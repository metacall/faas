import { pathIsMetaCallJson } from '@metacall/protocol/package';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
	Deployment,
	IAppWithFunctions,
	ProtocolMessageType,
	WorkerMessage,
	WorkerMessageUnknown,
	allApplications,
	childProcesses
} from '../constants';
import { isIAllApps, logProcessOutput } from './utils';

// TODO: Refactor this
export const findJsonFilesRecursively = async (
	appsDir: string
): Promise<void> => {
	// TODO: Avoid sync commands
	const files = fs.readdirSync(appsDir, { withFileTypes: true });
	for (const file of files) {
		if (file.isDirectory()) {
			await findJsonFilesRecursively(path.join(appsDir, file.name));
		} else if (pathIsMetaCallJson(file.name)) {
			const filePath = path.join(appsDir, file.name);
			const desiredPath = path.join(
				path.resolve(__dirname, '..'),
				'worker',
				'index.js'
			);
			const id = path.basename(appsDir);

			const deployment: Deployment = {
				id,
				type: 'application/x-zip-compressed',
				path: appsDir,
				jsons: []
			};

			const proc = spawn('metacall', [desiredPath, filePath], {
				stdio: ['pipe', 'pipe', 'pipe', 'ipc']
			});

			const message: WorkerMessage<Deployment> = {
				type: ProtocolMessageType.Load,
				data: deployment
			};

			proc.send(message);

			logProcessOutput(proc.stdout, proc.pid, deployment.id);
			logProcessOutput(proc.stderr, proc.pid, deployment.id);

			proc.on('message', (payload: WorkerMessageUnknown) => {
				if (payload.type === ProtocolMessageType.MetaData) {
					const message = payload as WorkerMessage<
						Record<string, IAppWithFunctions>
					>;
					if (isIAllApps(message.data)) {
						const appName = Object.keys(message.data)[0];
						childProcesses[appName] = proc;
						allApplications[appName] = message.data[appName];
					}
				}
			});
		}
	}
};
