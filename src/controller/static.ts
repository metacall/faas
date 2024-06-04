import { NextFunction, Request, Response } from 'express';
import path from 'path';

import AppError from '../utils/appError';
import { appsDirectory } from '../utils/config';
import { exists } from '../utils/filesystem';
import { Processes } from '../worker/master';
import { catchAsync } from './catch';

export const serveStatic = catchAsync(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		if (!req.params) next(new AppError('Invalid API endpoint', 404));

		const { app, file } = req.params;

		const appLocation = path.join(appsDirectory, `${app}/${file}`);

		if (!(app in Processes)) {
			next(
				new AppError(
					`Oops! It looks like the application (${app}) hasn't been deployed yet. Please deploy it before you can call its functions.`,
					404
				)
			);
		}

		if (!(await exists(appLocation)))
			next(
				new AppError(
					"The file you're looking for might not be available or the application may not be deployed.",
					404
				)
			);

		return res.status(200).sendFile(appLocation);
	}
);
