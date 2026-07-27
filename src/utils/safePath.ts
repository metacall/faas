import { resolve, relative } from 'path';

/**
 * Resolves a child path within a base directory and throws if it escapes.
 * Prevents path traversal attacks like../../../etc.
 */
export const safeResolve = (baseDir: string, child: string): string => {
	const resolved = resolve(baseDir, child);
	const rel = relative(baseDir, resolved);

	// Check if resolved path escapes baseDir
	if (rel.startsWith('..') || resolve(resolved) !== resolve(baseDir, rel)) {
		throw new Error(
			`Path traversal detected: '${child}' resolves outside base directory`
		);
	}

	return resolved;
};

/**
 * Validates that a string contains only safe characters for deployment names.
 * Allows alphanumeric, dots, hyphens, and underscores.
 */
export const isValidDeploymentName = (name: string): boolean => {
	return /^[a-zA-Z0-9._-]+$/.test(name);
};
