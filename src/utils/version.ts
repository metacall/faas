import { readFileSync } from 'fs';
import { join } from 'path';

export function printVersionAndExit(): void {
	const packageJsonPath = join(__dirname, '../../package.json');
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
		version: string;
	};
	console.log(`FaaS version: ${packageJson.version}`);
	process.exit(0);
}
