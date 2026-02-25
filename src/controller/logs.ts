import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

import { logsDirectory } from '../utils/config';

const logFileName = 'faas.log';
const logFileFullPath = path.resolve(path.join(logsDirectory, logFileName));

export const logs = (req: Request, res: Response): Response => {
	const { suffix } = req.body as { suffix?: string };

	if (!suffix) {
		return res.status(400).json({ error: 'suffix is required' });
	}

	if (!fs.existsSync(logFileFullPath)) {
		return res.send('');
	}

	const allLogs = fs.readFileSync(logFileFullPath, 'utf-8');
	const deploymentFilter = ` - ${suffix} | `;
	const filteredLines = allLogs
		.split('\n')
		.filter(line => line.includes(deploymentFilter))
		.join('\n');

	return res.send(filteredLines);
};
