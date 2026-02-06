import { readFileSync } from 'fs';
import { join } from 'path';

export function getVersion(packageJsonPath?: string): string {
	const path = packageJsonPath ?? join(__dirname, '../../package.json');

	const packageJson = JSON.parse(readFileSync(path, 'utf8')) as {
		version: string;
	};

	return packageJson.version;
}

export function printVersionAndExit(): void {
	try {
		const version = getVersion();
		console.log(`v${version}`);
		process.exit(0);
	} catch (error) {
		console.error('Failed to read package version');
		process.exit(1);
	}
}
