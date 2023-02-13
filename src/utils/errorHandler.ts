/* eslint-disable */

import { NextFunction, Request, Response } from 'express';
import { IAppError } from './appError';

const globalErroHandler = (
	err: IAppError,
	req: Request,
	res: Response,
	next: NextFunction
): Response => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';

	if (process.env.NODE_ENV === 'development') {
		console.log(
			`Status Code: ${err.statusCode}\nStatus: ${err.status}\n${
				err.stack || ''
			}`
		);
	}

	return res.status(err.statusCode).send(err.message);
};

export default globalErroHandler;
