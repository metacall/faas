import { platform } from 'os';
import { join } from 'path';

const missing = (name: string): Error =>
	new Error(`Missing ${name} environment variable! Unable to load config`);

export const configDir = (name: string): string => {
	if (platform() === 'win32') {
		if (process.env.APPDATA === undefined) {
			throw missing('APPDATA');
		}
		return join(process.env.APPDATA, name);
	} else {
		if (process.env.HOME === undefined) {
			throw missing('HOME');
		}
		return join(process.env.HOME, `.${name}`);
	}
};

export const basePath = configDir(join('metacall', 'faas'));

export const appsDirectory = join(basePath, 'apps');
