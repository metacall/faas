import * as fs from 'fs';
import * as path from 'path';
import { LogMessage } from '../constants';
import { assignColorToWorker } from './utils';

const logFilePath = path.join(__dirname, '../../logs/');
const logFileName = 'app.log';
const logFileFullPath = path.join(logFilePath, logFileName);

class Logger {
	private logQueue: LogMessage[] = [];
	private isProcessing = false;

	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.logQueue.length === 0) return;
		this.isProcessing = true;

		while (this.logQueue.length > 0) {
			const logEntry = this.logQueue.shift();
			if (logEntry) {
				const { deploymentName, message } = logEntry;
				this.store(deploymentName, message);
				this.present(deploymentName, message);
				await new Promise(resolve => setTimeout(resolve, 0));
			}
		}

		this.isProcessing = false;
	}

	public enqueueLog(deploymentName: string, message: string): void {
		this.logQueue.push({ deploymentName, message });
		this.processQueue().catch(console.error);
	}

	private store(deploymentName: string, message: string): void {
		const timeStamp = new Date().toISOString();
		const logMessage = `${timeStamp} - ${deploymentName} | ${message}\n`;

		if (!fs.existsSync(logFilePath)) {
			fs.mkdirSync(logFilePath, { recursive: true });
		}
		fs.appendFileSync(logFileFullPath, logMessage, { encoding: 'utf-8' });
	}

	private present(deploymentName: string, message: string): void {
		const fixedWidth = 20;
		const paddedName = deploymentName.padEnd(fixedWidth, ' ');

		const coloredName = assignColorToWorker(`${paddedName} |`);
		const logMessage = `${coloredName} ${message}`;
		console.log(logMessage);
	}
}

export const logger = new Logger();
