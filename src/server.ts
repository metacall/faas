import * as dotenv from 'dotenv';

import app from './app';
import { findJsonFilesRecursively } from './utils/autoDeploy';
import { appsDirectory } from './utils/config';
import { ensureFolderExists } from './utils/utils';

// Initialize the FaaS
void (async (): Promise<void> => {
	try {
		dotenv.config();

		const appsDir = appsDirectory();

		await ensureFolderExists(appsDir);

		await findJsonFilesRecursively(appsDir);

		console.log('Previously deployed apllications deployed successfully');

		const port = process.env.PORT || 9000;

		app.listen(port, () => {
			console.log(`Server is running on the port ${port}`);
		});
	} catch (e) {
		console.error('Error while re-deploying applications: ', e);
	}
})();
