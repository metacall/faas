import { NextFunction, Request, Response } from 'express';
import path from 'path';

import { Applications } from '../app';
import AppError from '../utils/appError';
import { appsDirectory } from '../utils/config';
import { exists } from '../utils/filesystem';
import { catchAsync } from './catch';

export const serveStatic = catchAsync(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		if (!req.params) {
			throw new AppError('Invalid API endpoint', 404);
		}

		const { suffix, file } = req.params;
		const application = Applications[suffix];

		// Check if the application exists and it is running
		if (!application?.proc) {
			next(
				new AppError(
					`Oops! It looks like the application 'suffix' hasn't been deployed yet. Please deploy it before you can call its functions.`,
					404
				)
			);
		}

		const filePath = path.join(appsDirectory, suffix, file);

		if (!(await exists(filePath)))
			next(
				new AppError(
					'The file you are looking for might not be available or the application may not be deployed.',
					404
				)
			);

		return res.status(200).sendFile(filePath);
	}
);
