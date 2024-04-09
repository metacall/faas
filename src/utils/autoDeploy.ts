import { pathIsMetaCallJson } from '@metacall/protocol/package';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
	CurrentUploadedFile,
	IAppWithFunctions,
	ProtocolMessageType,
	WorkerMessage,
	WorkerMessageUnknown,
	allApplications,
	childProcesses,
	currentFile
} from '../constants';
import { isIAllApps, logProcessOutput } from './utils';

export const findJsonFilesRecursively = async (
	appsDir: string
): Promise<void> => {
	const files = fs.readdirSync(appsDir, { withFileTypes: true });
	for (const file of files) {
		if (file.isDirectory()) {
			await findJsonFilesRecursively(path.join(appsDir, file.name));
		} else if (pathIsMetaCallJson(file.name)) {
			const filePath = path.join(appsDir, file.name);
			const desiredPath = path.join(__dirname, '../worker/index.js');
			const id = path.basename(appsDir);

			currentFile.id = id;
			(currentFile.type = 'application/x-zip-compressed'),
				(currentFile.path = appsDir);

			const proc = spawn('metacall', [desiredPath, filePath], {
				stdio: ['pipe', 'pipe', 'pipe', 'ipc']
			});

			const message: WorkerMessage<CurrentUploadedFile> = {
				type: ProtocolMessageType.Load,
				data: currentFile
			};

			proc.send(message);

			logProcessOutput(proc.stdout, proc.pid, currentFile.id);
			logProcessOutput(proc.stderr, proc.pid, currentFile.id);

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
