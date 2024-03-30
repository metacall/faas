import * as fs from 'fs';
import * as path from 'path';
import { assignColorToWorker, maxWorkerWidth } from './utils';

const logFilePath = path.join(__dirname, '../../logs/');
const logFileName = 'app.log';
const logFileFullPath = path.join(logFilePath, logFileName);

export const logger = {
	store: (deploymentName: string, message: string): void => {
		const timeStamp = new Date().toISOString();
		const logMessage = `${timeStamp} - ${deploymentName} | ${message}\n`;

		if (!fs.existsSync(logFilePath)) {
			fs.mkdirSync(logFilePath, { recursive: true });
		}
		fs.appendFileSync(logFileFullPath, logMessage, { encoding: 'utf-8' });
	},

	present: (deploymentName: string, message: string): void => {
		const maxNameWidth = maxWorkerWidth();
		const paddedName = deploymentName.padEnd(maxNameWidth, ' ');

		const colorCode = assignColorToWorker(deploymentName);
		const coloredText = `\x1b[38;5;${colorCode}m${paddedName}_1 | \x1b[0m`;
		const logMessage = `${coloredText} ${message}`;
		console.log(logMessage);
	}
};
