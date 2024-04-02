import { pathIsMetaCallJson } from '@metacall/protocol/package';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
	allApplications,
	childProcessResponse,
	childProcesses,
	currentFile,
	protocol
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

			proc.send({
				type: protocol.l,
				currentFile
			});

			logProcessOutput(proc.stdout, 'green');
			logProcessOutput(proc.stderr, 'red');

			proc.on('message', (data: childProcessResponse) => {
				if (data.type === protocol.g) {
					if (isIAllApps(data.data)) {
						const appName = Object.keys(data.data)[0];
						childProcesses[appName] = proc;
						allApplications[appName] = data.data[appName];
					}
				}
			});
		}
	}
};
