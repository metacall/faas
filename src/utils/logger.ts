import * as fs from 'fs';
import * as path from 'path';

const logFilePath = path.join(__dirname, '../../logs/');
const logFileName = 'app.log';
const logFileFullPath = path.join(logFilePath, logFileName);

export const logger = {
	log: (message: string): void => {
		const timeStamp = new Date().toISOString();
		const logMessage = `${timeStamp} - ${message}\n`;
		console.log(message);

		if (!fs.existsSync(logFilePath)) {
			fs.mkdirSync(logFilePath, { recursive: true });
		}
		fs.appendFileSync(logFileFullPath, logMessage, { encoding: 'utf-8' });
	}
};
