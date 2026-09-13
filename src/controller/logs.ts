import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface LogsBody {
	container: string;
	type: number;
	suffix: string;
	prefix: string;
	version: string;
}

/**
 * Retrieves the logs for a specific deployment.
 * The local FaaS saves all logs centrally in a single app.log file.
 * This endpoint filters that file to return only the logs associated with the requested suffix.
 */
export const logs = (req: Request, res: Response): Response => {
	const { suffix } = req.body as LogsBody;

	// In the local mimic, logs are stored in the root /logs directory
	const logFilePath = path.join(__dirname, '../../logs/app.log');

	try {
		// If the log file doesn't exist yet, simply return an empty response
		if (!fs.existsSync(logFilePath)) {
			return res.send('');
		}

		// Read the entire log file
		const logFileContent = fs.readFileSync(logFilePath, 'utf-8');

		// Header lines are written by logger.ts as:
		//   <ISO timestamp> - <deploymentName> | <first line of message>
		// Continuation lines of a multiline message (stack traces, JSON dumps,
		// ...) carry no header, so filter + strip per physical line would drop
		// them. Instead, re-group logical entries on the read side: a line
		// starting with a header opens a new entry when its deployment name
		// matches the requested suffix, any other line continues the current
		// matching entry. This keeps the on-disk format (and existing
		// logs/app.log) unchanged.
		const headerRegex =
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z - (.+?) \| ?(.*)$/;
		const entries: string[][] = [];
		let current: string[] | null = null;

		const lines = logFileContent.split(/\r?\n/);
		// Drop the artifact of a trailing newline, blank lines inside an
		// entry are preserved as continuation lines.
		if (lines.length > 0 && lines[lines.length - 1] === '') {
			lines.pop();
		}

		for (const line of lines) {
			const match = line.match(headerRegex);
			if (match) {
				// New header always flushes the previous matching entry.
				if (current !== null) {
					entries.push(current);
					current = null;
				}
				const [, deploymentName, payload] = match;
				if (deploymentName === suffix) {
					// Strip the timestamp - deploymentName | prefix from the
					// header line only, seed the entry with its payload.
					current = [payload];
				}
			} else if (current !== null) {
				current.push(line);
			}
		}
		if (current !== null) {
			entries.push(current);
		}

		const applicationLogs = entries
			.map(entry => entry.join('\n'))
			.join('\n');

		return res.send(applicationLogs);
	} catch (error) {
		console.error('Failed to read logs:', error);
		return res
			.status(500)
			.send('Internal Server Error: Could not retrieve logs.');
	}
};
