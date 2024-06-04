import { promises as fs } from 'fs';

export const exists = async (path: string): Promise<boolean> => {
	try {
		await fs.stat(path);
		return true;
	} catch (e) {
		return false;
	}
};

export const ensureFolderExists = async <Path extends string>(
	path: Path
): Promise<Path> => (
	(await exists(path)) || (await fs.mkdir(path, { recursive: true })), path
);
