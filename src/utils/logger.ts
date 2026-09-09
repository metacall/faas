import { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Resource } from '../app';
import { logsDirectory } from './config';

// Shuffle the array randomly on startup (equal randomness is not relevant that's why we use this sort trick)
const ANSICode: number[] = [
	166, 154, 142, 118, 203, 202, 190, 215, 214, 32, 6, 4, 220, 208, 184, 172
].sort(() => Math.random() - 0.5);

interface PIDToColorCodeMapType {
	[key: string]: number;
}

// Maps a PID to a color code
const PIDToColorCodeMap: PIDToColorCodeMapType = {};

// Counter for color assignment
let colorIndex = 0;

const assignColorToWorker = (
	deploymentName: string,
	workerPID: number
): string => {
	if (!PIDToColorCodeMap[workerPID]) {
		// Cycle through colors safely
		const colorCode = ANSICode[colorIndex++ % ANSICode.length];
		PIDToColorCodeMap[workerPID] = colorCode;
	}
	const assignColorCode = PIDToColorCodeMap[workerPID];
	return `\x1b[38;5;${assignColorCode}m${deploymentName}\x1b[0m`;
};

export interface ProcessLogHandle {
	close(): Promise<void>;
}

class DeploymentLogger implements ProcessLogHandle {
	private tail: Promise<void> = Promise.resolve();
	private accepting = true;
	private closePromise?: Promise<void>;

	private readonly proc: ChildProcess;
	private readonly resource: Resource;
	private readonly logDirectory: string;
	private readonly logFile: string;
	private readonly onStdoutData: (data: Buffer) => void;
	private readonly onStderrData: (data: Buffer) => void;
	private readonly onProcessClose: () => void;

	constructor(proc: ChildProcess, resource: Resource) {
		this.proc = proc;
		this.resource = resource;
		this.logDirectory = path.join(logsDirectory, resource.id);
		this.logFile = path.join(this.logDirectory, 'app.log');

		this.onStdoutData = (data: Buffer) => {
			this.enqueue(data.toString());
		};
		this.onStderrData = (data: Buffer) => {
			this.enqueue(data.toString());
		};
		this.onProcessClose = () => {
			void this.close();
		};

		this.proc.stdout?.on('data', this.onStdoutData);
		this.proc.stderr?.on('data', this.onStderrData);
		this.proc.on('close', this.onProcessClose);
	}

	private enqueue(message: string): void {
		if (!this.accepting) {
			return;
		}

		this.tail = this.tail.then(async () => {
			await this.store(message);
			this.present(message);
		});
	}

	public close(): Promise<void> {
		if (!this.closePromise) {
			this.accepting = false;
			this.detachListeners();
			this.closePromise = this.tail;
		}
		return this.closePromise;
	}

	private detachListeners(): void {
		this.proc.stdout?.off('data', this.onStdoutData);
		this.proc.stderr?.off('data', this.onStderrData);
		this.proc.off('close', this.onProcessClose);
	}

	private async store(message: string): Promise<void> {
		const timeStamp = new Date().toISOString();
		const logMessage = `${timeStamp} - ${message}\n`;

		try {
			await fs.promises.mkdir(this.logDirectory, { recursive: true });
			await fs.promises.appendFile(this.logFile, logMessage, {
				encoding: 'utf-8'
			});
		} catch (err) {
			console.error(err);
		}
	}

	private present(message: string): void {
		message = message.trim();
		const fixedWidth = 24;
		const deploymentName = this.resource.id;
		const workerPID = this.proc.pid || 0;

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

export function logProcessOutput(
	proc: ChildProcess,
	resource: Resource
): ProcessLogHandle {
	return new DeploymentLogger(proc, resource);
}
