import { exec } from 'child_process';

interface MetacallCheckResult {
	available: boolean;
	version?: string;
	error?: string;
}

/**
 * Check if MetaCall CLI is installed and available in PATH.
 * Used for startup validation to provide early warnings.
 * Uses async exec to avoid blocking the event loop.
 */
export const checkMetacallInstallation = (): Promise<MetacallCheckResult> => {
	return new Promise(resolve => {
		exec('metacall --version', (error, stdout) => {
			if (error) {
				resolve({
					available: false,
					error: error.message
				});
			} else {
				resolve({
					available: true,
					version: stdout.trim()
				});
			}
		});
	});
};
