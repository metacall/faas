import colors from 'colors';
import dotenv from 'dotenv';

import app from './app';
import { autoDeployApps } from './utils/autoDeploy';
import { appsDirectory } from './utils/config';
import { ensureFolderExists } from './utils/utils';

// Initialize the FaaS
void (async (): Promise<void> => {
	try {
		dotenv.config();
		colors.enable();

		await ensureFolderExists(appsDirectory);

		await autoDeployApps(appsDirectory);

		const port = process.env.PORT || 9000;

		app.listen(port, () => {
			console.log(`Server is running on the port ${port}`);
		});
	} catch (e) {
		console.error('Error while re-deploying applications: ', e);
	}
})();
