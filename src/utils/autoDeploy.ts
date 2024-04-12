import { MetaCallJSON, pathIsMetaCallJson } from '@metacall/protocol';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
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

export const autoDeployApps = async (appsDir: string): Promise<void> => {
	const allDirectories = await fs.readdir(appsDir, { withFileTypes: true });

	let directoryProcessed = false;

	for (const directory of allDirectories) {
		if (directory.isDirectory()) {
			const directoryPath = path.join(appsDir, directory.name);
			const directoryFiles = await fs.readdir(directoryPath, {
				withFileTypes: true
			});

			const jsonFiles = directoryFiles
				.filter(file => file.isFile() && pathIsMetaCallJson(file.name))
				.map(file => path.join(directoryPath, file.name));

			if (jsonFiles.length > 0) {
				directoryProcessed = true;

				const desiredPath = path.join(
					path.resolve(__dirname, '..'),
					'worker',
					'index.js'
				);

				const jsonContent: MetaCallJSON[] = await Promise.all(
					jsonFiles.map(async file => {
						const content = await fs.readFile(file, 'utf-8');

						// map method returns array.That's why didn't passed MetaCallJSON[]
						return JSON.parse(content) as MetaCallJSON;
					})
				);

				const deployment: Deployment = {
					id: directory.name,
					type: 'application/x-zip-compressed',
					path: directoryPath,
					jsons: jsonContent
				};

				const proc = spawn('metacall', [desiredPath, ...jsonFiles], {
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
	}

	if (directoryProcessed) {
		console.log(
			'Previously deployed applications deployed successfully'.green
		);
	}
};
