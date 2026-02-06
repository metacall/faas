import { readFileSync } from 'fs';
import { join } from 'path';

export function printVersionAndExit(): void {
	try {
		const packageJsonPath = join(__dirname, '../../package.json');
		const packageJson = JSON.parse(
			readFileSync(packageJsonPath, 'utf8')
		) as {
			version: string;
		};

		console.log(`v${packageJson.version}`);
		process.exit(0);
	} catch (error) {
		console.error('Failed to read package version');
		process.exit(1);
	}
}
