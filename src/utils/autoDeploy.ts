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

		}
	}
};
