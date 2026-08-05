import path from 'path';

import AppError from './appError';

/**
 * Resolve `child` relative to `baseDir` and throw AppError(400)
 * if the resolved path escapes `baseDir`.
 *
 * Used to guard any recursive/force delete that is built from
 * user-supplied identifiers (deployment suffix, repository name, etc.).
 */
export const safeResolve = (baseDir: string, child: string): string => {
	if (!child || !child.trim()) {
		throw new AppError(`Invalid path: '${child}'`, 400);
	}

	const resolvedBase = path.resolve(baseDir);
	const resolvedTarget = path.resolve(baseDir, child);

	if (
		resolvedTarget === resolvedBase ||
		!resolvedTarget.startsWith(resolvedBase + path.sep)
	) {
		throw new AppError(`Invalid path: '${child}'`, 400);
	}

	return resolvedTarget;
};
