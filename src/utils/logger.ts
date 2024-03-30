import * as fs from 'fs';
import * as path from 'path';
import { assignColorToWorker } from './utils';

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
		const fixedWidth = 20;
		const paddedName = deploymentName.padEnd(fixedWidth, ' ');

		const coloredName = assignColorToWorker(`${paddedName} |`);
		const logMessage = `${coloredName} ${message}`;
		console.log(logMessage);
	}
};
