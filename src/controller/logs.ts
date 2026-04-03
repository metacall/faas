import { NextFunction, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import AppError from '../utils/appError';
import { catchAsync } from './catch';

type LogsBody = {
	suffix?: string;
	offset?: number;
};

const logsFilePath = path.resolve(path.join(__dirname, '../../logs/app.log'));
// Matches both legacy format:  "<ISO> - <name> |"
// and new format:               "<ISO> [LEVEL] - <name> |"
const logEntryHeaderRegex = /^\d{4}-\d{2}-\d{2}T[^ ]+ (?:\[\w+\] )?- [^|]+ \|/;

export const logs = catchAsync(
	async (
		req: Omit<Request, 'body'> & { body: LogsBody },
		res: Response,
		next: NextFunction
	): Promise<Response | void> => {
		const suffix = req.body.suffix?.trim();
		const offset = req.body.offset;

		if (!suffix) {
			return next(
				new AppError('Invalid logs request: suffix is required.', 400)
			);
		}

		if (
			offset !== undefined &&
			(!Number.isInteger(offset) || Number(offset) < 0)
		) {
			return next(
				new AppError(
					'Invalid logs request: offset must be a non-negative integer.',
					400
				)
			);
		}

		let rawLogData = '';
		try {
			rawLogData = await fs.readFile(logsFilePath, {
				encoding: 'utf-8'
			});
		} catch (err) {
			const nodeError = err as NodeJS.ErrnoException;
			if (nodeError.code === 'ENOENT') {
				return res.status(200).send('');
			}
			return next(new AppError('Failed to read logs file.', 500));
		}

		if (rawLogData.trim() === '') {
			return res.status(200).send('');
		}

		const allLines = rawLogData.split('\n');
		const logEntries: string[] = [];
		let currentEntry: string[] = [];

		for (const line of allLines) {
			if (logEntryHeaderRegex.test(line)) {
				if (currentEntry.length > 0) {
					logEntries.push(currentEntry.join('\n'));
				}
				currentEntry = [line];
				continue;
			}

			// Keep multi-line stack traces and message continuations attached
			if (currentEntry.length > 0) {
				currentEntry.push(line);
			}
		}

		if (currentEntry.length > 0) {
			logEntries.push(currentEntry.join('\n'));
		}

		// The deployment name appears after the optional [LEVEL] tag
		const deploymentEntries = logEntries.filter(
			entry => /- /.test(entry) && entry.includes(` - ${suffix} |`)
		);

		if (deploymentEntries.length === 0) {
			return res.status(200).send('');
		}

		const startIndex = offset ?? 0;
		const slicedEntries = deploymentEntries.slice(startIndex);

		return res.status(200).send(slicedEntries.join('\n'));
	}
);
