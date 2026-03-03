import { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Types
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'HTTP';

interface LogMessage {
	deploymentName: string;
	workerPID: number;
	message: string;
	level: LogLevel;
}

// ANSI Color Palette
const ANSICode: number[] = [
	166, 154, 142, 118, 203, 202, 190, 215, 214, 32, 6, 4, 220, 208, 184, 172
];

interface PIDToColorCodeMapType {
	[key: string]: number;
}

const PIDToColorCodeMap: PIDToColorCodeMapType = {};
let nextColorIndex = 0;

// File Paths
const logFilePath = path.join(__dirname, '../../logs/');
const logFileName = 'app.log';
const logFileFullPath = path.resolve(path.join(logFilePath, logFileName));

// Level Detection
function detectLevel(message: string): LogLevel {
	const m = message.toLowerCase();
	if (/\berror\b|failed|exception|fatal|stderr/.test(m)) return 'ERROR';
	if (/\bwarn(ing)?\b|deprecated/.test(m)) return 'WARN';
	if (/get |post |put |delete |patch |http\//.test(m)) return 'HTTP';
	if (/debug|verbose|trace/.test(m)) return 'DEBUG';
	return 'INFO';
}

// Level Styling
const LEVEL_COLORS: Record<LogLevel, string> = {
	INFO: '\x1b[36m',
	WARN: '\x1b[33m',
	ERROR: '\x1b[31m',
	DEBUG: '\x1b[35m',
	HTTP: '\x1b[90m'
};
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

// Worker Color Assignment
const assignColorToWorker = (label: string, workerPID: number): string => {
	if (!PIDToColorCodeMap[workerPID]) {
		const colorCode = ANSICode[nextColorIndex % ANSICode.length];
		PIDToColorCodeMap[workerPID] = colorCode;
		nextColorIndex += 1;
	}
	const colorCode = PIDToColorCodeMap[workerPID];
	return `\x1b[38;5;${colorCode}m${label}${RESET}`;
};

// Logger Class
class Logger {
	private logQueue: LogMessage[] = [];
	private isProcessing = false;

	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.logQueue.length === 0) return;
		this.isProcessing = true;

		while (this.logQueue.length > 0) {
			const logEntry = this.logQueue.shift();
			if (logEntry) {
				const { deploymentName, workerPID, message, level } = logEntry;
				this.store(deploymentName, level, message);
				this.present(deploymentName, workerPID, level, message);
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
		const trimmed = message.trim();
		if (!trimmed) return;
		const level = detectLevel(trimmed);
		this.logQueue.push({
			deploymentName,
			workerPID,
			message: trimmed,
			level
		});
		this.processQueue().catch(console.error);
	}

	/** Write a structured line to the log file. */
	private store(
		deploymentName: string,
		level: LogLevel,
		message: string
	): void {
		const timeStamp = new Date().toISOString();
		// Format: <ISO timestamp> [LEVEL] - <name> | <message>
		const logLine = `${timeStamp} [${level}] - ${deploymentName} | ${message}\n`;

		if (!fs.existsSync(logFilePath)) {
			fs.mkdirSync(logFilePath, { recursive: true });
		}
		fs.appendFileSync(logFileFullPath, logLine, { encoding: 'utf-8' });
	}

	/** Print a richly coloured line to stdout. */
	private present(
		deploymentName: string,
		workerPID: number,
		level: LogLevel,
		message: string
	): void {
		const fixedWidth = 24;
		let paddedName = deploymentName.padEnd(fixedWidth, ' ');
		if (deploymentName.length > fixedWidth) {
			paddedName = deploymentName.substring(0, fixedWidth - 2) + '…';
		}

		const coloredName = assignColorToWorker(paddedName, workerPID);

		const levelColor = LEVEL_COLORS[level];
		const levelTag = `${levelColor}${BOLD}[${level.padEnd(5)}]${RESET}`;

		const timeStamp = `${DIM}${new Date().toISOString()}${RESET}`;

		// Split multi-line messages and indent continuations
		const lines = message.split('\n');
		const indent = ' '.repeat(fixedWidth + 14); // align continuation lines
		const formattedLines = lines.map((line, idx) => {
			if (idx === 0) {
				return `${timeStamp} ${levelTag} ${coloredName} ${DIM}|${RESET} ${line}`;
			}
			return `${indent}${DIM}│${RESET} ${line}`;
		});

		console.log(formattedLines.join('\n'));
	}
}

const logger = new Logger();

// Public API
export function logProcessOutput(
	proc: ChildProcess,
	deploymentName: string
): void {
	proc.stdout?.on('data', (data: Buffer) => {
		const text = data.toString();
		// Split on newlines so each line is individually levelled
		text.split('\n').forEach(line => {
			const trimmed = line.trim();
			if (trimmed)
				logger.enqueueLog(deploymentName, proc.pid || 0, trimmed);
		});
	});
	proc.stderr?.on('data', (data: Buffer) => {
		const text = data.toString();
		text.split('\n').forEach(line => {
			const trimmed = line.trim();
			if (trimmed)
				logger.enqueueLog(deploymentName, proc.pid || 0, trimmed);
		});
	});
}
