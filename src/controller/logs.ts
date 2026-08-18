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

		// Filter out logs that belong to the requested deployment suffix
		const applicationLogs = logFileContent
			.split('\n')
			.filter(line => line.includes(` - ${suffix} | `))
			.map(line => {
				// Strip the local FaaS timestamp and prefix to match the real FaaS log format as closely as possible
				const separatorIndex = line.indexOf('| ');
				return separatorIndex !== -1
					? line.substring(separatorIndex + 2)
					: line;
			})
			.join('\n');

		return res.send(applicationLogs);
	} catch (error) {
		console.error('Failed to read logs:', error);
		return res
			.status(500)
			.send('Internal Server Error: Could not retrieve logs.');
	}
};
