import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
	allApplications,
	childProcessResponse,
	cps,
	currentFile,
	protocol
} from '../constants';
import { isIAllApps } from './utils';

export const findJsonFilesRecursively = async (
	appsDir: string
): Promise<void> => {
	const files = fs.readdirSync(appsDir, { withFileTypes: true });
	for (const file of files) {
		if (file.isDirectory()) {
			await findJsonFilesRecursively(path.join(appsDir, file.name));
		} else if (file.name === 'metacall.json') {
			const filePath = path.join(appsDir, file.name);
			const desiredPath = path.join(__dirname, '/worker/index.js');
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

			proc.stdout?.on('data', (data: Buffer) => {
				console.log(data.toString().green);
			});
			proc.stderr?.on('data', (data: Buffer) => {
				console.log(data.toString().red);
			});

			proc.on('message', (data: childProcessResponse) => {
				if (data.type === protocol.g) {
					if (isIAllApps(data.data)) {
						const appName = Object.keys(data.data)[0];
						cps[appName] = proc;
						allApplications[appName] = data.data[appName];
					}
				}
			});
		}
	}
};
