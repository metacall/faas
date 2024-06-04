import { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface LogMessage {
	deploymentName: string;
	workerPID: number;
	message: string;
}

const ANSICode: number[] = [
	166, 154, 142, 118, 203, 202, 190, 215, 214, 32, 6, 4, 220, 208, 184, 172
];

interface PIDToColorCodeMapType {
	[key: string]: number;
}

interface AssignedColorCodesType {
	[key: string]: boolean;
}

// Maps a PID to a color code
const PIDToColorCodeMap: PIDToColorCodeMapType = {};

// Tracks whether a color code is assigned
const assignedColorCodes: AssignedColorCodesType = {};

const logFilePath = path.join(__dirname, '../../logs/');
const logFileName = 'app.log';
const logFileFullPath = path.resolve(path.join(logFilePath, logFileName));

// TODO: Implement this properly?
// const maxWorkerWidth = (maxIndexWidth = 3): number => {
// 	const workerLengths = Object.keys(Applications).map(
// 		worker => worker.length
// 	);
// 	return Math.max(...workerLengths) + maxIndexWidth;
// };

// TODO: There is a problem with this code, looking randomly for an unique code
// will end in an endless loop whenever all color codes are allocated, we should
// use a better way of managing this
const assignColorToWorker = (
	deploymentName: string,
	workerPID: number
): string => {
	if (!PIDToColorCodeMap[workerPID]) {
		let colorCode: number;

		// Keep looking for unique code
		do {
			colorCode = ANSICode[Math.floor(Math.random() * ANSICode.length)];
		} while (assignedColorCodes[colorCode]);

		// Assign the unique code and mark it as used
		PIDToColorCodeMap[workerPID] = colorCode;
		assignedColorCodes[colorCode] = true;
	}
	const assignColorCode = PIDToColorCodeMap[workerPID];
	return `\x1b[38;5;${assignColorCode}m${deploymentName}\x1b[0m`;
};

class Logger {
	private logQueue: LogMessage[] = [];
	private isProcessing = false;

	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.logQueue.length === 0) return;
		this.isProcessing = true;

		while (this.logQueue.length > 0) {
			const logEntry = this.logQueue.shift();
			if (logEntry) {
				const { deploymentName, workerPID, message } = logEntry;
				this.store(deploymentName, message);
				this.present(deploymentName, workerPID, message);
				await new Promise(resolve => setTimeout(resolve, 0));
			}
		}

		this.isProcessing = false;
	}

	public enqueueLog(
		deploymentName: string,
		workerPID: number,
		message: string
	): void {
		this.logQueue.push({ deploymentName, workerPID, message });
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

	private present(
		deploymentName: string,
		workerPID: number,
		message: string
	): void {
		message = message.trim();
		const fixedWidth = 24;

		let paddedName = deploymentName.padEnd(fixedWidth, ' ');
		if (deploymentName.length > fixedWidth) {
			paddedName = deploymentName.substring(0, fixedWidth - 2) + '_1';
		}

		// Regular expression for splitting by '\n', '. ', or ' /'
		const messageLines = message.split(/(?:\n|\. | \/)/);
		const coloredName = assignColorToWorker(`${paddedName} |`, workerPID);
		const formattedMessageLines = messageLines.map(
			line => `${coloredName} ${line}`
		);
		const logMessage = formattedMessageLines.join('\n');

		console.log(logMessage);
	}
}

const logger = new Logger();

export function logProcessOutput(
	proc: ChildProcess,
	deploymentName: string
): void {
	proc.stdout?.on('data', (data: Buffer) => {
		logger.enqueueLog(deploymentName, proc.pid || 0, data.toString());
	});
	proc.stderr?.on('data', (data: Buffer) => {
		logger.enqueueLog(deploymentName, proc.pid || 0, data.toString());
	});
}
