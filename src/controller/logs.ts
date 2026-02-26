import { Request, Response } from 'express';
import { promises as fs } from 'fs';

import { logFileFullPath } from '../utils/config';

export const logs = async (req: Request, res: Response): Promise<Response> => {
	const { suffix } = req.body as { suffix?: string };

	if (!suffix) {
		return res.status(400).json({ error: 'suffix is required' });
	}

	try {
		const allLogs = await fs.readFile(logFileFullPath, 'utf-8');
		const deploymentFilter = ` - ${suffix} | `;
		const filteredLines = allLogs
			.split('\n')
			.filter((line) => line.includes(deploymentFilter))
			.join('\n');

		return res.send(filteredLines);
	} catch {
		return res.send('');
	}
};
