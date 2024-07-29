#!/usr/bin/env node

import colors from 'colors';
import dotenv from 'dotenv';
import { initializeAPI } from './api';
import { autoDeployApps } from './utils/autoDeploy';
import { appsDirectory } from './utils/config';
import { ensureFolderExists } from './utils/filesystem';
import { printVersionAndExit } from './utils/version';

// Initialize the FaaS
void (async (): Promise<void> => {
	try {
		const args = process.argv.slice(2);
		if (args.includes('--version')) {
			printVersionAndExit();
		}

		dotenv.config();
		colors.enable();

		await ensureFolderExists(appsDirectory);

		await autoDeployApps(appsDirectory);

		const app = initializeAPI();
		const port = process.env.PORT || 9000;

		app.listen(port, () => {
			console.log(`Server is running on the port ${port}`);
		});
	} catch (e) {
		console.error('Error while initializing: ', e);
	}
})();
